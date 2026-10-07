import { Injectable, NotFoundException } from '@nestjs/common';
import type { QueryDeepPartialEntity } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { Wishlist } from '../../../database/entities/wishlist.entity';
import { productToSummary } from '../../../catalog/user/utils/product-summary';

/**
 * Customer wishlist. One row per (user, product) thanks to the unique index;
 * add is idempotent and remove is a tolerant no-op so the UI never needs to
 * reconcile state first. Items return a full ProductSummary for card reuse.
 */
@Injectable()
export class UserWishlistService {
  constructor(private readonly database: DatabaseService) {}

  /** Cheap product-id list for heart states on cards / product pages. */
  async ids(userId: number) {
    const rows = await this.database.wishlist.find({
      where: { userId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  }

  async list(userId: number) {
    const rows = await this.database.wishlist.find({
      where: { userId },
      relations: {
        product: {
          category: true,
          collection: true,
          media: true,
          skus: true,
        },
      },
      order: { id: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      addedAt: row.createdAt,
      product: productToSummary(row.product),
    }));
  }

  async add(userId: number, productId: number) {
    const product = await this.database.product.findOne({
      where: { id: productId, isPublished: true, isActive: true },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // The (userId, productId) unique index still holds soft-deleted rows, so
    // "add again" after a remove has to revive the old row instead of
    // inserting a new one (otherwise the insert fails with a 409).
    const existing = await this.database.wishlist.findOne({
      where: { userId, productId },
      withDeleted: true,
    });
    if (existing?.deletedAt) {
      // NOTE: repository.restore() is a no-op on this TypeORM version, so the
      // soft-delete marker is cleared explicitly.
      await this.database.wishlist.update(existing.id, {
        deletedAt: null,
      } as unknown as QueryDeepPartialEntity<Wishlist>);
      return { added: true };
    }
    if (existing) return { added: true, already: true };

    await this.database.wishlist.save(
      this.database.wishlist.create({
        userId,
        productId,
        createdBy: userId,
        creatorType: 'user',
      }),
    );
    return { added: true };
  }

  async remove(userId: number, productId: number) {
    const row = await this.database.wishlist.findOne({
      where: { userId, productId },
    });
    if (row) await this.database.wishlist.softRemove(row);
    return { removed: true };
  }
}
