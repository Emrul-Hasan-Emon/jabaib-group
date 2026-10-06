import { Injectable } from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';

/** Storefront-facing product browsing: only published, active products. */
@Injectable()
export class UserProductService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = { isPublished: true, isActive: true };
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    const [data, count] = await this.database.product.findAndCount({
      where,
      relations: { category: true, productLabel: true },
      order: { createdAt: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    return this.database.product.findOne({
      where: { id, isPublished: true, isActive: true },
      relations: {
        category: true,
        productLabel: true,
        media: true,
        skus: { skuVariants: { attribute: true, attributeValue: true } },
      },
    });
  }
}
