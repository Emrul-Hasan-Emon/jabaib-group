import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike, IsNull } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { Category } from '../../../database/entities/category.entity';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import {
  creatorFields,
  slugify,
  updaterFields,
} from '../../utils/catalog.utils';
import { FileHandleService } from '../../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../../file/upload-folders';

@Injectable()
export class AdminCategoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    if (query.parentId !== undefined)
      where.parentId =
        query.parentId === 'null' ? IsNull() : Number(query.parentId);
    if (query.q) {
      where.name = ILike(`%${query.q}%`);
    }
    const [data, count] = await this.database.category.findAndCount({
      where,
      relations: { parent: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async tree() {
    const all = await this.database.category.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const byId = new Map<number, Category & { childrenNodes?: Category[] }>();
    for (const c of all) byId.set(c.id, { ...c, childrenNodes: [] });
    const roots: (Category & { childrenNodes?: Category[] })[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.childrenNodes!.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  async findOne(id: number) {
    const category = await this.database.category.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto, user?: JwtPayload) {
    const slug = dto.slug ?? slugify(dto.name);
    await this.ensureSlugAvailable(slug);
    const category = this.database.category.create({
      ...dto,
      slug,
      ...creatorFields(user),
    });
    return this.database.category.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto, user?: JwtPayload) {
    const category = await this.findOne(id);
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    const nextSlug =
      dto.slug ??
      (dto.name && dto.name !== category.name
        ? slugify(dto.name)
        : category.slug);
    if (nextSlug !== category.slug) {
      await this.ensureSlugAvailable(nextSlug, id);
    }
    const previousImagePath = category.imagePath;
    Object.assign(category, dto, { slug: nextSlug }, updaterFields(user));
    const saved = await this.database.category.save(category);
    // Replace/clear: drop the superseded physical file now that the DB is saved.
    this.dropReplacedImage(previousImagePath, saved.imagePath);
    return saved;
  }

  /** Feature-owned upload: stores in the category folder, returns url/path. */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.category);
  }

  /** Feature-owned removal: deletes the physical file and clears the fields. */
  async removeImage(id: number, user?: JwtPayload) {
    const category = await this.findOne(id);
    const previousImagePath = category.imagePath;
    Object.assign(
      category,
      { imageUrl: '', imagePath: '' },
      updaterFields(user),
    );
    const saved = await this.database.category.save(category);
    if (previousImagePath) this.fileHandle.removeIfExists(previousImagePath);
    return saved;
  }

  /** Delete an old file only when it is being replaced and belongs to this feature. */
  private dropReplacedImage(previous: string | undefined, next: string) {
    if (
      previous &&
      next !== previous &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.category, previous)
    ) {
      this.fileHandle.removeIfExists(previous);
    }
  }

  /** Slug is case-insensitively unique — reject duplicates before the DB constraint fires. */
  private async ensureSlugAvailable(slug: string, excludeId?: number) {
    const existing = await this.database.category
      .createQueryBuilder('category')
      .where('LOWER(category.slug) = LOWER(:slug)', { slug })
      .getOne();
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `Slug "${slug}" already exists — choose a unique slug.`,
      );
    }
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    await this.database.category.softRemove(category);
    return { deleted: true };
  }
}
