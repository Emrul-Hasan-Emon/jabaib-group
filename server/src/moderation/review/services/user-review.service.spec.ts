import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserReviewService } from './user-review.service';
import { DatabaseService } from '../../../database/database.service';

function review(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 7,
    productId: 8,
    orderId: null,
    rating: 5,
    comment: 'Nice!',
    images: null,
    isApproved: false,
    createdAt: new Date('2026-01-05'),
    user: { id: 7, name: 'Rafi' },
    product: {
      id: 8,
      name: 'Shirt',
      nameBN: null,
      slug: 'shirt',
      thumbnailUrl: null,
      media: [],
    },
    ...partial,
  };
}

/** Chained QueryBuilder mock for the rating-summary aggregate. */
function qbResult(rows: unknown[]) {
  const qb: Record<string, jest.Mock> = {};
  ['select', 'addSelect', 'where', 'andWhere', 'groupBy'].forEach((m) => {
    qb[m] = jest.fn().mockReturnThis();
  });
  qb.getRawMany = jest.fn(async () => rows);
  return qb;
}

describe('UserReviewService (customer reviews)', () => {
  let service: UserReviewService;
  let db: {
    product: { findOne: jest.Mock };
    review: {
      findAndCount: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      softRemove: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
  };

  beforeEach(async () => {
    db = {
      product: { findOne: jest.fn(async () => ({ id: 8 })) },
      review: {
        findAndCount: jest.fn(async () => [[], 0]),
        findOne: jest.fn(async () => null),
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn(async (row) => ({ ...row, id: 1 })),
        softRemove: jest.fn(async () => ({})),
        createQueryBuilder: jest.fn(() => qbResult([])),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserReviewService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserReviewService);
  });

  describe('listForProduct', () => {
    it('returns a zeroed summary when there are no approved reviews', async () => {
      const result = await service.listForProduct(8, {
        page: 0,
        size: 10,
        offset: 0,
        limit: 10,
      });
      expect(result.summary).toEqual({
        count: 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      });
      expect(result.data).toEqual([]);
    });

    it('only exposes approved reviews with reviewer name', async () => {
      db.review.findAndCount.mockResolvedValue([
        [
          review({ isApproved: true, rating: 4, comment: 'Good fit' }),
          review({
            id: 2,
            isApproved: true,
            rating: 5,
            orderId: 99,
            verified: true,
          }),
        ],
        2,
      ]);
      db.review.createQueryBuilder.mockReturnValue(
        qbResult([
          { rating: '4', count: '1' },
          { rating: '5', count: '1' },
        ]),
      );
      const result = await service.listForProduct(8, {
        page: 0,
        size: 10,
        offset: 0,
        limit: 10,
      });
      expect(result.summary.count).toBe(2);
      expect(result.summary.average).toBe(4.5);
      expect(result.summary.distribution[5]).toBe(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          rating: 4,
          comment: 'Good fit',
          verified: false,
          user: { name: 'Rafi' },
        }),
      );
      expect(result.data[1].verified).toBe(true);
    });

    it('404s for an unpublished product', async () => {
      db.product.findOne.mockResolvedValue(null);
      await expect(
        service.listForProduct(404, {
          page: 0,
          size: 10,
          offset: 0,
          limit: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('stores a pending review scoped to the caller', async () => {
      const user = {
        sub: 'rafi@test.dev',
        id: 7,
        type: 'user' as const,
        role: null,
        userName: 'Rafi',
      };
      const result = await service.create(user, {
        productId: 8,
        rating: 5,
        comment: '  Excellent  ',
      });
      expect(result).toEqual({ id: 1, isApproved: false });
      const created = db.review.create.mock.calls[0][0];
      expect(created.userId).toBe(7);
      expect(created.productId).toBe(8);
      expect(created.comment).toBe('Excellent');
      expect(created.isApproved).toBe(false);
      expect(created.creatorType).toBe('user');
    });

    it('rejects a second review for the same product', async () => {
      db.review.findOne.mockResolvedValue(review());
      const user = {
        sub: 'rafi@test.dev',
        id: 7,
        type: 'user' as const,
        role: null,
        userName: 'Rafi',
      };
      await expect(
        service.create(user, { productId: 8, rating: 4 }),
      ).rejects.toThrow(ConflictException);
      expect(db.review.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('only deletes the caller-owned review', async () => {
      db.review.findOne.mockResolvedValue(review());
      const result = await service.remove(7, 1);
      expect(result).toEqual({ deleted: true });
      expect(db.review.softRemove).toHaveBeenCalled();
    });

    it('404s when the review belongs to someone else', async () => {
      db.review.findOne.mockResolvedValue(null);
      await expect(service.remove(7, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('myReviews', () => {
    it('returns the product snapshot + moderation status', async () => {
      db.review.findAndCount.mockResolvedValue([
        [review({ id: 3, isApproved: false, rating: 5 })],
        1,
      ]);
      const result = await service.myReviews(7, {
        page: 0,
        size: 10,
        offset: 0,
        limit: 10,
      });
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 3,
          isApproved: false,
          product: expect.objectContaining({ id: 8, slug: 'shirt' }),
        }),
      );
    });
  });
});
