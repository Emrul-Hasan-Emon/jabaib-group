import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';

@Injectable()
export class AdminCustomerService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.user
      .createQueryBuilder('user')
      .orderBy('user.id', 'DESC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.q) {
      qb.andWhere(
        '(user.name ILIKE :q OR user.phone ILIKE :q OR user.email ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    const [data, count] = await qb.getManyAndCount();
    const counts = await this.countsFor(data.map((u) => u.id));
    const rows = data.map((u) => ({
      ...u,
      orderCount: counts.orders.get(u.id) ?? 0,
      wishlistCount: counts.wishlists.get(u.id) ?? 0,
    }));
    return getPaginateData(rows, count, pagination);
  }

  async findOne(id: number) {
    const user = await this.database.user.findOne({
      where: { id },
      relations: {
        addresses: { division: true, district: true },
        authProviders: true,
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const [orders, wishlist, orderCount, wishlistCount, reviewCount] =
      await Promise.all([
        this.database.order.find({
          where: { userId: id },
          order: { id: 'DESC' },
          take: 50,
          relations: { address: true },
        }),
        this.database.wishlist.find({
          where: { userId: id },
          order: { id: 'DESC' },
          take: 100,
          relations: { product: true },
        }),
        this.database.order.count({ where: { userId: id } }),
        this.database.wishlist.count({ where: { userId: id } }),
        this.database.review.count({ where: { userId: id } }),
      ]);

    const totalSpentRaw = await this.database.order
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0)', 'sum')
      .where('order.userId = :id', { id })
      .andWhere("order.paymentStatus = 'paid'")
      .getRawOne<{ sum: string | number }>();

    return {
      ...user,
      orderCount,
      wishlistCount,
      reviewCount,
      totalSpent: Number(totalSpentRaw?.sum ?? 0),
      orders,
      wishlist: wishlist.map((w) => ({
        id: w.id,
        createdAt: w.createdAt,
        product: w.product
          ? {
              id: w.product.id,
              name: w.product.name,
              slug: w.product.slug,
              thumbnailUrl: w.product.thumbnailUrl,
            }
          : null,
      })),
    };
  }

  private async countsFor(ids: number[]) {
    const orders = new Map<number, number>();
    const wishlists = new Map<number, number>();
    if (!ids.length) return { orders, wishlists };

    const orderRows = await this.database.order
      .createQueryBuilder('order')
      .select('order.userId', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('order.userId IN (:...ids)', { ids })
      .groupBy('order.userId')
      .getRawMany<{ userId: number; cnt: string }>();
    for (const r of orderRows) orders.set(Number(r.userId), Number(r.cnt));

    const wishlistRows = await this.database.wishlist
      .createQueryBuilder('wishlist')
      .select('wishlist.userId', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('wishlist.userId IN (:...ids)', { ids })
      .groupBy('wishlist.userId')
      .getRawMany<{ userId: number; cnt: string }>();
    for (const r of wishlistRows)
      wishlists.set(Number(r.userId), Number(r.cnt));

    return { orders, wishlists };
  }
}
