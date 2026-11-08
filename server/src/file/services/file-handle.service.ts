import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFileInfo {
  /** For local storage this equals `path`; for S3 this is the public object URL. */
  url: string;
  /** Storage path relative to the upload root (local) or the bucket key (S3), e.g. `jabaib/product/123-a.jpg`. */
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Handles uploaded files on either local disk or an S3-compatible bucket
 * (Neon Object Storage), switched by `STORAGE_DRIVER` ('local' | 's3').
 * Everything lives under a fixed `jabaib/<folder>/` prefix either way —
 * entities always store `path` (folder-relative / bucket key); `url` is
 * what the client renders (a static path locally, a public bucket URL
 * on S3). Callers never branch on the driver.
 */
@Injectable()
export class FileHandleService implements OnModuleInit {
  private readonly logger = new Logger(FileHandleService.name);
  private readonly uploadRoot: string;
  private readonly brandFolder = 'jabaib';
  private readonly driver: 'local' | 's3';
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;
  private readonly s3PublicBaseUrl?: string;

  constructor(private readonly configService: ConfigService) {
    this.driver =
      this.configService.get<string>('STORAGE_DRIVER') === 's3'
        ? 's3'
        : 'local';

    const configured =
      this.configService.get<string>('LOCAL_UPLOAD_DIR') ?? './uploads';
    this.uploadRoot = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);

    if (this.driver === 's3') {
      const endpoint = this.configService.getOrThrow<string>(
        'AWS_ENDPOINT_URL_S3',
      );
      this.s3Bucket = this.configService.getOrThrow<string>('S3_BUCKET');
      this.s3PublicBaseUrl = `${endpoint.replace(/\/+$/, '')}/${this.s3Bucket}`;
      this.s3Client = new S3Client({
        region: this.configService.getOrThrow<string>('AWS_REGION'),
        endpoint,
        credentials: {
          accessKeyId: this.configService.getOrThrow<string>(
            'AWS_ACCESS_KEY_ID',
          ),
          secretAccessKey: this.configService.getOrThrow<string>(
            'AWS_SECRET_ACCESS_KEY',
          ),
        },
        forcePathStyle: true,
        // Recent SDK versions break presigned/streamed S3-compatible PUTs
        // without this (Neon docs call it out explicitly).
        requestChecksumCalculation: 'WHEN_REQUIRED',
      });
    }
  }

  onModuleInit() {
    if (this.driver === 's3') {
      this.logger.log(
        `Upload driver: s3 (bucket ${this.s3Bucket}, ${this.s3PublicBaseUrl})`,
      );
      return;
    }
    fs.mkdirSync(path.join(this.uploadRoot, this.brandFolder), {
      recursive: true,
    });
    this.logger.log(`Upload root: ${this.uploadRoot}`);
  }

  /**
   * Guarantee the target folder exists before uploading. Works for nested
   * paths too (product/sku, product/media): every parent is created.
   * No-op when the folder is already present. No-op on S3 (buckets have
   * no real directories — the key prefix is enough).
   */
  ensureFolderFor(folder: string): void {
    if (this.driver === 's3') return;
    const targetDir = path.join(this.uploadRoot, this.brandFolder, folder);
    fs.mkdirSync(targetDir, { recursive: true });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadedFileInfo> {
    this.ensureFolderFor(folder);

    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .slice(0, 60);
    const fileName = `${baseName}-${unique}${ext}`;
    const key = path.posix.join(this.brandFolder, folder, fileName);

    if (this.driver === 's3') {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
      return {
        url: `${this.s3PublicBaseUrl}/${key}`,
        path: key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    }

    fs.writeFileSync(
      path.join(this.uploadRoot, this.brandFolder, folder, fileName),
      file.buffer,
    );

    return {
      url: key,
      path: key,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<UploadedFileInfo[]> {
    const results: UploadedFileInfo[] = [];
    for (const file of files) {
      results.push(await this.uploadFile(file, folder));
    }
    return results;
  }

  removeFile(filePathOrUrl: string): boolean {
    if (this.driver === 's3') {
      // S3 delete is idempotent (no error on a missing key), so this always
      // "succeeds" rather than distinguishing missing-vs-removed — fine
      // since every caller goes through removeIfExists anyway.
      void this.s3Client!.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: filePathOrUrl.replace(/^\/+/, ''),
        }),
      ).catch((err: Error) =>
        this.logger.warn(`S3 delete failed for ${filePathOrUrl}: ${err.message}`),
      );
      return true;
    }
    const absolute = this.resolve(filePathOrUrl);
    if (!absolute || !fs.existsSync(absolute)) {
      throw new NotFoundException(`File not found: ${filePathOrUrl}`);
    }
    fs.unlinkSync(absolute);
    return true;
  }

  removeFiles(pathsOrUrls: string[]): { removed: string[]; failed: string[] } {
    const removed: string[] = [];
    const failed: string[] = [];
    for (const p of pathsOrUrls) {
      try {
        this.removeFile(p);
        removed.push(p);
      } catch {
        failed.push(p);
      }
    }
    return { removed, failed };
  }

  /**
   * Best-effort delete used during replace/remove flows: a missing file is
   * "already gone" and must never fail the DB update. Only a path that is
   * outside the upload root (protected by `resolve`) is a true failure,
   * and even then we report false instead of throwing.
   */
  removeIfExists(filePathOrUrl: string): boolean {
    try {
      return this.removeFile(filePathOrUrl);
    } catch {
      return false;
    }
  }

  /** True when a stored path/url lives inside a given feature folder. */
  belongsTo(folder: string, filePathOrUrl: string): boolean {
    if (!filePathOrUrl) return false;
    const cleaned = filePathOrUrl.replace(/^\/+/, '');
    return cleaned.startsWith(`${this.brandFolder}/${folder}/`);
  }

  exists(filePathOrUrl: string): boolean {
    const absolute = this.resolve(filePathOrUrl);
    return !!absolute && fs.existsSync(absolute);
  }

  /** Absolute disk path for a stored path/url (used by static serving & deletes). */
  resolve(filePathOrUrl: string): string | null {
    if (!filePathOrUrl) return null;
    const cleaned = filePathOrUrl.replace(/^\/+/, '');
    const absolute = path.resolve(this.uploadRoot, cleaned);
    // Prevent escaping the upload root.
    if (!absolute.startsWith(this.uploadRoot)) return null;
    return absolute;
  }

  getUploadRoot(): string {
    return this.uploadRoot;
  }
}
