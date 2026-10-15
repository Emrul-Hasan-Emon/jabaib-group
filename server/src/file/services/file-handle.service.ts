import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedFileInfo {
  /** For local storage this equals `path` — there is no separate public URL yet. */
  url: string;
  /** Storage path relative to the upload root, e.g. `jabaib/product/123-a.jpg`. */
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Handles files on the local disk. Everything lives under
 * `<LOCAL_UPLOAD_DIR>/jabaib/<folder>/`. When we move to S3, only this
 * service's implementation changes — entities keep storing `path`, and
 * `url` becomes the bucket URL.
 */
@Injectable()
export class FileHandleService implements OnModuleInit {
  private readonly logger = new Logger(FileHandleService.name);
  private readonly uploadRoot: string;
  private readonly brandFolder = 'jabaib';

  constructor(private readonly configService: ConfigService) {
    const configured =
      this.configService.get<string>('LOCAL_UPLOAD_DIR') ?? './uploads';
    this.uploadRoot = path.isAbsolute(configured)
      ? configured
      : path.resolve(process.cwd(), configured);
  }

  onModuleInit() {
    fs.mkdirSync(path.join(this.uploadRoot, this.brandFolder), {
      recursive: true,
    });
    this.logger.log(`Upload root: ${this.uploadRoot}`);
  }

  /**
   * Guarantee the target folder exists before uploading. Works for nested
   * paths too (product/sku, product/media): every parent is created.
   * No-op when the folder is already present.
   */
  ensureFolderFor(folder: string): void {
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

    fs.writeFileSync(
      path.join(this.uploadRoot, this.brandFolder, folder, fileName),
      file.buffer,
    );

    const relativePath = path.posix.join(this.brandFolder, folder, fileName);
    return {
      url: relativePath,
      path: relativePath,
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
