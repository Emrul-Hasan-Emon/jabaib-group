import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateUserReviewDto } from '../dtos/create-user-review.dto';
import { Review } from '../../../database/entities/review.entity';
import { OrderStatus } from '../../../database/enums/enums';

/**
 * Customer-facing reviews. The public product feed only ever exposes
 * APPROVED reviews; every submission starts hidden until an admin approves
 * it in the moderation panel. All writes are scoped to the caller's userId.
 *
 * Verified-purchase enforcement: a customer can only keep an `orderId` when
 * a DELIVERED order containing the product exists. Checkout arrives in
 * Phase 10, so creation stores orderId=null for now; the check will be wired
 * up there without changing this API shape.
 */
@Injectable()
export class UserReviewService {
  constructor(private readonly database: DatabaseService) {}

  /** Public: approved reviews + a rating summary for a product. */
  async listForProduct(productId: number, pagination: Pagination) {
    const product = await this.database.product.findOne({
      where: { id: productId, isPublished: true, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const summary = await this.summaryForProduct(productId);
    const [rows, count] = await this.database.review.findAndCount({
      where: { productId, isApproved: true },
      relations: { user: true },
      order: { id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });

    const data = rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      images: r.images,
      /** True when the review came from a real (delivered) order. */
      verified: r.orderId != null,
      createdAt: r.createdAt,
      user: { name: r.user?.name ?? 'Customer' },
    }));

    return { summary, ...getPaginateData(data, count, pagination) };
  }

  /** Authed: the caller's own reviews with product + moderation status. */
  async myReviews(userId: number, pagination: Pagination) {
    const [rows, count] = await this.database.review.findAndCount({
      where: { userId },
      relations: { product: { media: true } },
      order: { id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });

    const data = rows.map((r) => {
      const primaryMedia = (r.product?.media ?? []).find((m) => m.isPrimary);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        images: r.images,
        isApproved: r.isApproved,
        verified: r.orderId != null,
        createdAt: r.createdAt,
        product: {
          id: r.product?.id,
          name: r.product?.name,
          nameBN: r.product?.nameBN,
          slug: r.product?.slug,
          thumbnailUrl: r.product?.thumbnailUrl ?? primaryMedia?.url ?? null,
        },
      };
    });

    return getPaginateData(data, count, pagination);
  }

  /** Authed: submit a review. Goes straight to moderation (not yet approved). */
  async create(user: JwtPayload, dto: CreateUserReviewDto) {
    const product = await this.database.product.findOne({
      where: { id: dto.productId, isPublished: true, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.database.review.findOne({
      where: { userId: user.id, productId: dto.productId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const data: Partial<Review> = {
      userId: user.id,
      productId: dto.productId,
      rating: dto.rating,
      comment: dto.comment?.trim() || undefined,
      images: dto.images && dto.images.length ? dto.images : undefined,
      orderId: (await this.deliveredOrderItem(user.id, dto.productId))?.orderId,
      isApproved: false,
      createdBy: user.id,
      creatorType: 'user',
    };
    const saved = await this.database.review.save(
      this.database.review.create(data),
    );
    return { id: saved.id, isApproved: saved.isApproved };
  }

  /**
   * Most recent DELIVERED order of this customer containing the product —
   * links a review to a real purchase so it can be shown as verified.
   */
  private async deliveredOrderItem(userId: number, productId: number) {
    return this.database.orderItem.findOne({
      where: {
        productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
      order: { id: 'DESC' },
    });
  }

  /** Authed: remove the caller's own review. */
  async remove(userId: number, id: number) {
    const review = await this.database.review.findOne({
      where: { id, userId },
    });
    if (!review) throw new NotFoundException('Review not found');
    await this.database.review.softRemove(review);
    return { deleted: true };
  }

  private async summaryForProduct(productId: number) {
    const rows = await this.database.review
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .andWhere('r.isApproved = :approved', { approved: true })
      .groupBy('r.rating')
      .getRawMany<{ rating: string; count: string }>();

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let total = 0;
    let sum = 0;
    for (const row of rows) {
      const rating = Number(row.rating);
      const count = Number(row.count);
      if (distribution[rating] === undefined) continue;
      distribution[rating] = count;
      total += count;
      sum += rating * count;
    }
    return {
      count: total,
      average: total ? Math.round((sum / total) * 10) / 10 : 0,
      distribution,
    };
  }
}
