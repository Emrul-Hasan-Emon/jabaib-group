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
import { creatorFields, slugify, updaterFields } from '../../utils/catalog.utils';

const SORTABLE = new Set(['name', 'createdAt', 'updatedAt', 'id']);

@Injectable()
export class AdminProductService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.productLabelId) where.productLabelId = Number(query.productLabelId);
    for (const flag of ['isPublished', 'isFeatured', 'isActive'] as const) {
      if (query[flag] !== undefined) where[flag] = query[flag] === 'true';
    }

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(':');
    const order: Record<string, 'ASC' | 'DESC'> = {};
    order[SORTABLE.has(sortField) ? sortField : 'createdAt'] =
      sortDir === 'asc' ? 'ASC' : 'DESC';

    const [data, count] = await this.database.product.findAndCount({
      where,
      relations: { category: true, productLabel: true },
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
        productLabel: true,
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
    Object.assign(product, dto, updaterFields(user));
    return this.database.product.save(product);
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
    Object.assign(media, dto, updaterFields(user));
    return this.database.productMedia.save(media);
  }

  async removeMedia(productId: number, mediaId: number) {
    const media = await this.database.productMedia.findOne({
      where: { id: mediaId, productId },
    });
    if (!media) throw new NotFoundException('Media not found');
    await this.database.productMedia.softRemove(media);
    return { deleted: true };
  }
}
