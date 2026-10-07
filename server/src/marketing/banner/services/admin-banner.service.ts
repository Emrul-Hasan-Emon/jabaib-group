import { Injectable, NotFoundException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateBannerDto } from '../dtos/create-banner.dto';
import { UpdateBannerDto } from '../dtos/update-banner.dto';
import {
  creatorFields,
  updaterFields,
} from '../../../catalog/utils/catalog.utils';
import { FileHandleService } from '../../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../../file/upload-folders';

@Injectable()
export class AdminBannerService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.position) where.position = query.position;
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.banner.findAndCount({
      where,
      order: { sortOrder: 'ASC', id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const banner = await this.database.banner.findOne({ where: { id } });
    if (!banner) throw new NotFoundException('Banner not found');
    return banner;
  }

  async create(dto: CreateBannerDto, user?: JwtPayload) {
    const banner = this.database.banner.create({
      ...dto,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      sortOrder: dto.sortOrder ?? 0,
      ...creatorFields(user),
    });
    return this.database.banner.save(banner);
  }

  async update(id: number, dto: UpdateBannerDto, user?: JwtPayload) {
    const banner = await this.findOne(id);
    const previousDesktopPath = banner.imagePath;
    const previousMobilePath = banner.mobileImagePath;
    Object.assign(banner, dto, {
      startsAt:
        dto.startsAt !== undefined
          ? dto.startsAt
            ? new Date(dto.startsAt)
            : null
          : banner.startsAt,
      endsAt:
        dto.endsAt !== undefined
          ? dto.endsAt
            ? new Date(dto.endsAt)
            : null
          : banner.endsAt,
      ...updaterFields(user),
    });
    const saved = await this.database.banner.save(banner);
    // Replace/clear: drop superseded desktop/mobile files after save.
    this.dropReplacedImage(previousDesktopPath, saved.imagePath);
    this.dropReplacedImage(previousMobilePath, saved.mobileImagePath);
    return saved;
  }

  /** Feature-owned upload: stores in the banner folder, returns url/path. */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.banner);
  }

  /**
   * Feature-owned removal: deletes the physical file(s) and clears the
   * matching banner image fields. kind = desktop (default) | mobile | all.
   */
  async removeImage(
    id: number,
    kind: 'desktop' | 'mobile' | 'all' = 'desktop',
    user?: JwtPayload,
  ) {
    const banner = await this.findOne(id);
    const previousDesktop = banner.imagePath;
    const previousMobile = banner.mobileImagePath;

    const patch: Partial<
      Record<
        'imageUrl' | 'imagePath' | 'mobileImageUrl' | 'mobileImagePath',
        string
      >
    > = {};
    if (kind === 'mobile' || kind === 'all') {
      patch.mobileImageUrl = '';
      patch.mobileImagePath = '';
    }
    if (kind === 'desktop' || kind === 'all') {
      patch.imageUrl = '';
      patch.imagePath = '';
    }
    Object.assign(banner, patch, updaterFields(user));
    const saved = await this.database.banner.save(banner);

    if (kind === 'desktop' || kind === 'all') {
      if (previousDesktop) this.fileHandle.removeIfExists(previousDesktop);
    }
    if (kind === 'mobile' || kind === 'all') {
      if (previousMobile) this.fileHandle.removeIfExists(previousMobile);
    }
    return saved;
  }

  /** Delete an old file only when it is being replaced and belongs to this feature. */
  private dropReplacedImage(previous: string | undefined, next: string) {
    if (
      previous &&
      next !== previous &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.banner, previous)
    ) {
      this.fileHandle.removeIfExists(previous);
    }
  }

  async remove(id: number) {
    const banner = await this.findOne(id);
    await this.database.banner.softRemove(banner);
    return { deleted: true };
  }
}
