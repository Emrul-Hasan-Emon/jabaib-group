import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';

@Injectable()
export class AdminWishlistService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = Number(query.userId);
    if (query.productId) where.productId = Number(query.productId);
    const [data, count] = await this.database.wishlist.findAndCount({
      where,
      relations: { user: true, product: true },
      order: { id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }
}
