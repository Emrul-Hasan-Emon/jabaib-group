import { Injectable, NotFoundException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { updaterFields } from '../../../catalog/utils/catalog.utils';
import { UpdateReviewDto } from '../dtos/update-review.dto';

@Injectable()
export class AdminReviewService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.isApproved !== undefined)
      where.isApproved = query.isApproved === 'true';
    if (query.productId) where.productId = Number(query.productId);
    if (query.userId) where.userId = Number(query.userId);
    if (query.q) where.comment = ILike(`%${query.q}%`);
    const [data, count] = await this.database.review.findAndCount({
      where,
      relations: { user: true, product: true },
      order: { id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const review = await this.database.review.findOne({
      where: { id },
      relations: { user: true, product: true },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async update(id: number, dto: UpdateReviewDto, user?: JwtPayload) {
    const review = await this.findOne(id);
    Object.assign(review, dto, updaterFields(user));
    return this.database.review.save(review);
  }

  async remove(id: number) {
    const review = await this.findOne(id);
    await this.database.review.softRemove(review);
    return { deleted: true };
  }
}
