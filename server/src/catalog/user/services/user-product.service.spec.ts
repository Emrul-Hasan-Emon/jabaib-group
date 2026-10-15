import { Test } from '@nestjs/testing';
import { UserProductService } from './user-product.service';
import { DatabaseService } from '../../../database/database.service';

function sku(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    sku: 'SKU-1',
    price: 1000,
    discountedPrice: null,
    discountedPriceStartDate: null,
    discountedPriceEndDate: null,
    quantity: 5,
    isActive: true,
    ...partial,
  };
}

function product(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Test Shirt',
    nameBN: 'টেস্ট শার্ট',
    slug: 'test-shirt',
    description: null,
    thumbnailUrl: 'jabaib/product/1.png',
    isFeatured: false,
    category: null,
    collection: null,
    media: [],
    skus: [sku()],
    ...partial,
  };
}

/** Chained QueryBuilder mock used by the attribute filter + facets paths. */
function variantQb(rows: unknown[]) {
  const qb: Record<string, jest.Mock> = {};
  [
    'select',
    'addSelect',
    'innerJoin',
    'where',
    'andWhere',
    'groupBy',
    'having',
  ].forEach((m) => {
    qb[m] = jest.fn().mockReturnThis();
  });
  qb.getRawMany = jest.fn(async () => rows);
  return qb;
}

describe('UserProductService (storefront catalog)', () => {
  let service: UserProductService;
  let db: {
    product: {
      findAndCount: jest.Mock;
      findOne: jest.Mock;
      find: jest.Mock;
      count: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    productSKUVariant: { createQueryBuilder: jest.Mock };
    attribute: { find: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      product: {
        findAndCount: jest.fn(async () => [[], 0]),
        findOne: jest.fn(async () => null),
        find: jest.fn(async () => []),
        count: jest.fn(async () => 0),
        createQueryBuilder: jest.fn(),
      },
      productSKUVariant: { createQueryBuilder: jest.fn() },
      attribute: { find: jest.fn(async () => []) },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserProductService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserProductService);
  });

  describe('list', () => {
    it('only exposes published + active products and maps pricing', async () => {
      db.product.findAndCount.mockResolvedValue([
        [
          product({
            skus: [
              sku({ price: 800, quantity: 0 }),
              sku({ price: 1200, discountedPrice: 900, quantity: 3 }),
            ],
          }),
        ],
        1,
      ]);
      const result = await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        {},
      );
      const item = result.data[0];
      expect(item.priceFrom).toBe(800);
      expect(item.priceTo).toBe(900); // discounted sku sells at 900
      expect(item.compareAtFrom).toBe(1200);
      expect(item.hasDiscount).toBe(true);
      expect(item.inStock).toBe(true);
      expect(item).not.toHaveProperty('myBuyingPrice');
    });

    it('marks a product out of stock when every SKU has 0 quantity', async () => {
      db.product.findAndCount.mockResolvedValue([
        [product({ skus: [sku({ quantity: 0 })] })],
        1,
      ]);
      const result = await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        {},
      );
      expect(result.data[0].inStock).toBe(false);
    });

    it('passes the category filter through and reports the search term', async () => {
      await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        { categoryId: '3', q: 'shirt' },
      );
      const where = db.product.findAndCount.mock.calls[0][0].where;
      expect(where.categoryId).toBe(3);
      expect(where.isPublished).toBe(true);
    });

    it('falls back to newest when sort is unknown', async () => {
      await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        { sort: 'bogus' },
      );
      expect(db.product.findAndCount.mock.calls[0][0].order).toEqual({
        createdAt: 'DESC',
      });
    });

    it('filters by attribute values through matching active SKUs', async () => {
      db.productSKUVariant.createQueryBuilder.mockReturnValue(
        variantQb([{ productId: '8' }, { productId: '3' }]),
      );
      db.product.findAndCount.mockResolvedValue([[product()], 1]);
      await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        { attrValues: '2,4' },
      );
      const where = db.product.findAndCount.mock.calls[0][0].where;
      expect((where.id as { type: string }).type).toBe('in');
      expect((where.id as { value: number[] }).value).toEqual([8, 3]);
    });

    it('returns an empty page when no product matches the attribute selection', async () => {
      db.productSKUVariant.createQueryBuilder.mockReturnValue(variantQb([]));
      const result = await service.list(
        { page: 0, size: 10, offset: 0, limit: 10 },
        { attrValues: '999' },
      );
      expect(result.data).toEqual([]);
      expect(result.pagination.totalItems).toBe(0);
      expect(db.product.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('facets', () => {
    it('returns active attributes with counts for in-scope values only', async () => {
      db.productSKUVariant.createQueryBuilder.mockReturnValue(
        variantQb([{ attributeValueId: '11', count: '2' }]),
      );
      db.attribute.find.mockResolvedValue([
        {
          id: 1,
          name: 'Size',
          values: [
            { id: 10, name: 'S', nameBN: null, colorCode: null },
            { id: 11, name: 'M', nameBN: null, colorCode: null },
          ],
        },
      ]);
      const result = await service.facets({ categoryId: '3', q: 'shirt' });
      expect(result).toEqual([
        {
          attributeId: 1,
          attributeName: 'Size',
          values: [{ valueId: 11, value: 'M', count: 2 }],
        },
      ]);
    });
  });

  describe('findBySlug', () => {
    it('returns null for unknown or unpublished slugs', async () => {
      db.product.findOne.mockResolvedValue(null);
      const result = await service.findBySlug('not-there');
      expect(result).toBeNull();
      expect(db.product.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slug: 'not-there' }),
        }),
      );
    });

    it('attaches pricing computed from active skus', async () => {
      db.product.findOne.mockResolvedValue(
        product({
          slug: 'live-slug',
          skus: [sku({ price: 700, discountedPrice: 599 })],
        }),
      );
      const result = await service.findBySlug('live-slug');
      expect(result!.pricing).toEqual(
        expect.objectContaining({
          priceFrom: 599,
          compareAtFrom: 700,
          hasDiscount: true,
        }),
      );
    });
  });
});
