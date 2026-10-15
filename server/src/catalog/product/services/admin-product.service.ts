import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike, In } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import {
  CreateProductMediaDto,
  UpdateProductMediaDto,
} from '../dtos/product-media.dto';
import {
  creatorFields,
  slugify,
  updaterFields,
} from '../../utils/catalog.utils';
import { FileHandleService } from '../../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../../file/upload-folders';

const SORTABLE = new Set(['name', 'createdAt', 'updatedAt', 'id']);

@Injectable()
export class AdminProductService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.collectionId) where.collectionId = Number(query.collectionId);
    for (const flag of ['isPublished', 'isFeatured', 'isActive'] as const) {
      if (query[flag] !== undefined) where[flag] = query[flag] === 'true';
    }

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(':');
    const order: Record<string, 'ASC' | 'DESC'> = {};
    order[SORTABLE.has(sortField) ? sortField : 'createdAt'] =
      sortDir === 'asc' ? 'ASC' : 'DESC';

    const [data, count] = await this.database.product.findAndCount({
      where,
      relations: { category: true, collection: true },
      order,
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const product = await this.database.product.findOne({
      where: { id },
      relations: {
        category: true,
        collection: true,
        media: true,
        skus: { skuVariants: { attribute: true, attributeValue: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto, user?: JwtPayload) {
    const category = await this.database.category.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) throw new BadRequestException('Category not found');
    return this.database.product.save(
      this.database.product.create({
        ...dto,
        slug: dto.slug ?? slugify(dto.name),
        ...creatorFields(user),
      }),
    );
  }

  async update(id: number, dto: UpdateProductDto, user?: JwtPayload) {
    const product = await this.findOne(id);
    if (dto.categoryId) {
      const category = await this.database.category.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) throw new BadRequestException('Category not found');
    }
    const previousThumbnailPath = product.thumbnailPath;
    Object.assign(product, dto, updaterFields(user));
    const saved = await this.database.product.save(product);
    // Replace/clear: drop the superseded thumbnail file now that the DB is saved.
    if (
      previousThumbnailPath &&
      saved.thumbnailPath !== previousThumbnailPath &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.product, previousThumbnailPath)
    ) {
      this.fileHandle.removeIfExists(previousThumbnailPath);
    }
    return saved;
  }

  /** Feature-owned upload for the product thumbnail. */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.product);
  }

  /** Feature-owned removal of the thumbnail: deletes the file and clears fields. */
  async removeImage(id: number, user?: JwtPayload) {
    const product = await this.findOne(id);
    const previousThumbnailPath = product.thumbnailPath;
    Object.assign(
      product,
      { thumbnailUrl: '', thumbnailPath: '' },
      updaterFields(user),
    );
    const saved = await this.database.product.save(product);
    if (previousThumbnailPath) {
      this.fileHandle.removeIfExists(previousThumbnailPath);
    }
    return saved;
  }

  /** Feature-owned upload for a media gallery item (product/media folder). */
  uploadMedia(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.productMedia);
  }

  /**
   * Feature-owned BATCH upload for the media gallery: uploads several files
   * in one request to the product/media folder and returns their url/path
   * entries (one per file).
   */
  uploadMediaMany(files: Express.Multer.File[]) {
    return this.fileHandle.uploadFiles(files, UPLOAD_FOLDERS.productMedia);
  }

  async remove(id: number) {
    const product = await this.findOne(id);
    await this.database.product.softRemove(product);
    return { deleted: true };
  }

  async bulkSetActive(ids: number[], isActive: boolean, user?: JwtPayload) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('ids required');
    }
    await this.database.product.update(
      { id: In(ids) },
      { isActive, ...updaterFields(user) },
    );
    return { updated: ids.length, isActive };
  }

  // ---- Media ----

  async listMedia(productId: number) {
    await this.findOne(productId);
    return this.database.productMedia.find({
      where: { productId },
      order: { isPrimary: 'DESC', sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async addMedia(
    productId: number,
    dto: CreateProductMediaDto,
    user?: JwtPayload,
  ) {
    await this.findOne(productId);
    if (dto.isPrimary) {
      await this.database.productMedia.update(
        { productId },
        { isPrimary: false },
      );
    }
    return this.database.productMedia.save(
      this.database.productMedia.create({
        ...dto,
        productId,
        ...creatorFields(user),
      }),
    );
  }

  async updateMedia(
    productId: number,
    mediaId: number,
    dto: UpdateProductMediaDto,
    user?: JwtPayload,
  ) {
    const media = await this.database.productMedia.findOne({
      where: { id: mediaId, productId },
    });
    if (!media) throw new NotFoundException('Media not found');
    if (dto.isPrimary) {
      await this.database.productMedia.update(
        { productId },
        { isPrimary: false },
      );
    }
    const previousPath = media.path;
    Object.assign(media, dto, updaterFields(user));
    const saved = await this.database.productMedia.save(media);
    // Replacing the media file: delete the superseded one after saving.
    if (
      previousPath &&
      saved.path !== previousPath &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.productMedia, previousPath)
    ) {
      this.fileHandle.removeIfExists(previousPath);
    }
    return saved;
  }

  async removeMedia(productId: number, mediaId: number) {
    const media = await this.database.productMedia.findOne({
      where: { id: mediaId, productId },
    });
    if (!media) throw new NotFoundException('Media not found');
    if (media.path) this.fileHandle.removeIfExists(media.path);
    await this.database.productMedia.softRemove(media);
    return { deleted: true };
  }

  /**
   * Bulk reorder of the media gallery. `order` must be the FULL list of the
   * product's media ids (every item exactly once); sortOrder = position.
   */
  async reorderMedia(productId: number, order: number[]) {
    await this.findOne(productId);
    const rows = await this.database.productMedia.find({
      where: { productId },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    const seen = new Set<number>();
    for (const mediaId of order) {
      const row = byId.get(mediaId);
      if (!row) {
        throw new BadRequestException(
          `Media ${mediaId} does not belong to this product`,
        );
      }
      if (seen.has(mediaId)) {
        throw new BadRequestException(
          `Duplicate media id in order: ${mediaId}`,
        );
      }
      seen.add(mediaId);
    }
    if (seen.size !== rows.length) {
      throw new BadRequestException(
        'order must contain every media item of the product exactly once',
      );
    }
    await this.database.productMedia.save(
      order.map((mediaId, index) =>
        Object.assign(byId.get(mediaId)!, { sortOrder: index }),
      ),
    );
    return this.listMedia(productId);
  }
}
