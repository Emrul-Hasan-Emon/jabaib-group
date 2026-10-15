import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateHomepageSectionDto } from '../dtos/create-homepage-section.dto';
import { UpdateHomepageSectionDto } from '../dtos/update-homepage-section.dto';
import {
  creatorFields,
  updaterFields,
} from '../../../catalog/utils/catalog.utils';
import { FileHandleService } from '../../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../../file/upload-folders';

@Injectable()
export class AdminHomepageSectionService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.type) where.type = query.type;
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.homepageSection.findAndCount({
      where,
      order: { sortOrder: 'ASC', id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const section = await this.database.homepageSection.findOne({
      where: { id },
    });
    if (!section) throw new NotFoundException('Homepage section not found');
    return section;
  }

  async create(dto: CreateHomepageSectionDto, user?: JwtPayload) {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '-');
    await this.ensureKeyAvailable(key);
    const section = this.database.homepageSection.create({
      ...dto,
      key,
      sortOrder: dto.sortOrder ?? 0,
      ...creatorFields(user),
    });
    return this.database.homepageSection.save(section);
  }

  async update(id: number, dto: UpdateHomepageSectionDto, user?: JwtPayload) {
    const section = await this.findOne(id);
    if (dto.key) {
      const key = dto.key.trim().toLowerCase().replace(/\s+/g, '-');
      await this.ensureKeyAvailable(key, id);
      section.key = key;
    }
    const prevContent = section.content ?? {};
    const previousImageUrl = stringImage(prevContent.imageUrl);
    Object.assign(section, dto, updaterFields(user));
    const saved = await this.database.homepageSection.save(section);
    // Replace/clear the section image stored inside content.imageUrl.
    const nextImageUrl = stringImage(saved.content ?? {});
    if (
      previousImageUrl &&
      nextImageUrl !== previousImageUrl &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.homepage, previousImageUrl)
    ) {
      this.fileHandle.removeIfExists(previousImageUrl);
    }
    return saved;
  }

  /** Feature-owned upload: stores in the homepage folder, returns url/path. */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.homepage);
  }

  /** Feature-owned removal: deletes the physical file and clears content.imageUrl. */
  async removeImage(id: number, user?: JwtPayload) {
    const section = await this.findOne(id);
    const content = { ...(section.content ?? {}) };
    const previousImageUrl = stringImage(content.imageUrl);
    if (previousImageUrl) {
      this.fileHandle.removeIfExists(previousImageUrl);
    }
    if (typeof content.imageUrl !== 'undefined') delete content.imageUrl;
    section.content = content;
    Object.assign(section, updaterFields(user));
    return this.database.homepageSection.save(section);
  }

  async remove(id: number) {
    const section = await this.findOne(id);
    await this.database.homepageSection.softRemove(section);
    return { deleted: true };
  }

  private async ensureKeyAvailable(key: string, excludeId?: number) {
    const existing = await this.database.homepageSection.findOne({
      where: { key },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `A section with key "${key}" already exists.`,
      );
    }
  }
}

/** content.imageUrl may be any type — only a non-empty string is a file path. */
function stringImage(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}
