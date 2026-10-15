import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserWishlistService } from './user-wishlist.service';
import { DatabaseService } from '../../../database/database.service';

function wishlistRow(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 7,
    productId: 8,
    createdAt: new Date('2026-01-05'),
    product: {
      id: 8,
      name: 'Shirt',
      nameBN: null,
      slug: 'shirt',
      description: null,
      thumbnailUrl: 'jabaib/product/8.png',
      isFeatured: false,
      category: null,
      collection: null,
      media: [],
      skus: [
        {
          id: 1,
          price: 900,
          discountedPrice: null,
          quantity: 3,
          isActive: true,
        },
      ],
    },
    ...partial,
  };
}

describe('UserWishlistService (customer wishlist)', () => {
  let service: UserWishlistService;
  let db: {
    wishlist: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      update: jest.Mock;
      softRemove: jest.Mock;
    };
    product: { findOne: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      wishlist: {
        find: jest.fn(async () => []),
        findOne: jest.fn(async () => null),
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn(async (row) => ({ ...row, id: 1 })),
        update: jest.fn(async () => ({ affected: 1 })),
        softRemove: jest.fn(async () => ({})),
      },
      product: { findOne: jest.fn(async () => ({ id: 8 })) },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserWishlistService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserWishlistService);
  });

  describe('ids', () => {
    it('maps rows to plain product ids', async () => {
      db.wishlist.find.mockResolvedValue([{ productId: 8 }, { productId: 3 }]);
      await expect(service.ids(7)).resolves.toEqual([8, 3]);
      expect(db.wishlist.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 7 },
          select: { productId: true },
        }),
      );
    });
  });

  describe('list', () => {
    it('returns product summaries next to each wishlist row', async () => {
      db.wishlist.find.mockResolvedValue([wishlistRow()]);
      const result = await service.list(7);
      expect(result[0].id).toBe(1);
      expect(result[0].product).toEqual(
        expect.objectContaining({
          slug: 'shirt',
          priceFrom: 900,
          inStock: true,
        }),
      );
    });
  });

  describe('add', () => {
    it('creates a row for a published product', async () => {
      const result = await service.add(7, 8);
      expect(result).toEqual({ added: true });
      expect(db.wishlist.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userId: 7,
          productId: 8,
          creatorType: 'user',
        }),
      );
    });

    it('is idempotent when the pair already exists', async () => {
      db.wishlist.findOne.mockResolvedValue(wishlistRow());
      const result = await service.add(7, 8);
      expect(result).toEqual({ added: true, already: true });
      expect(db.wishlist.save).not.toHaveBeenCalled();
      expect(db.wishlist.update).not.toHaveBeenCalled();
    });

    it('revives a soft-deleted row instead of inserting (unique index)', async () => {
      db.wishlist.findOne.mockResolvedValue(
        wishlistRow({ deletedAt: new Date() }),
      );
      const result = await service.add(7, 8);
      expect(result).toEqual({ added: true });
      expect(db.wishlist.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ withDeleted: true }),
      );
      expect(db.wishlist.update).toHaveBeenCalledWith(1, {
        deletedAt: null,
      });
      expect(db.wishlist.save).not.toHaveBeenCalled();
    });

    it('rejects unpublished products', async () => {
      db.product.findOne.mockResolvedValue(null);
      await expect(service.add(7, 404)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-removes the row when present', async () => {
      db.wishlist.findOne.mockResolvedValue(wishlistRow());
      const result = await service.remove(7, 8);
      expect(result).toEqual({ removed: true });
      expect(db.wishlist.softRemove).toHaveBeenCalled();
    });

    it('is a tolerant no-op when the row is missing', async () => {
      db.wishlist.findOne.mockResolvedValue(null);
      await expect(service.remove(7, 8)).resolves.toEqual({ removed: true });
      expect(db.wishlist.softRemove).not.toHaveBeenCalled();
    });
  });
});
