import { Test } from '@nestjs/testing';
import { UserHomepageSectionService } from './user-homepage-section.service';
import { DatabaseService } from '../../../database/database.service';

function section(type: string, content: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: 'k',
    title: 'Section',
    titleBN: null,
    type,
    content,
    sortOrder: 1,
    isActive: true,
  };
}

function product(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'Product One',
    nameBN: null,
    slug: 'product-one',
    isFeatured: false,
    category: null,
    collection: null,
    media: [],
    skus: [
      { id: 1, price: 100, discountedPrice: null, quantity: 3, isActive: true },
    ],
    ...partial,
  };
}

describe('UserHomepageSectionService (landing shelves)', () => {
  let service: UserHomepageSectionService;
  let db: {
    homepageSection: { find: jest.Mock };
    product: { find: jest.Mock; findAndCount: jest.Mock };
    category: { find: jest.Mock };
    banner: { find: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      homepageSection: { find: jest.fn(async () => []) },
      product: {
        find: jest.fn(async () => []),
        findAndCount: jest.fn(async () => [[], 0]),
      },
      category: { find: jest.fn(async () => []) },
      banner: { find: jest.fn(async () => []) },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserHomepageSectionService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserHomepageSectionService);
  });

  it('returns only active sections in sort order', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('products', { limit: 4 }),
      section('products', { limit: 4 }),
    ]);
    const result = await service.list();
    expect(result).toHaveLength(2);
    expect(db.homepageSection.find.mock.calls[0][0].where.isActive).toBe(true);
  });

  it('resolves smart product shelves (limit from content) without pinned ids', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('products', { limit: 2 }),
    ]);
    db.product.findAndCount.mockResolvedValue([
      [product(), product(), product()],
      3,
    ]);
    const [result] = await service.list();
    expect(result.items).toHaveLength(3); // raw data mapped (limit applied at query take)
    expect(result.items[0]).toEqual(
      expect.objectContaining({ slug: 'product-one' }),
    );
    expect(db.product.findAndCount.mock.calls[0][0].take).toBe(2);
  });

  it('resolves pinned product ids and preserves the merchandised order', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('products', { productIds: [9, 3] }),
    ]);
    db.product.find.mockResolvedValue([
      product({ id: 3, name: 'Three', slug: 'three' }),
      product({ id: 9, name: 'Nine', slug: 'nine' }),
    ]);
    const [result] = await service.list();
    expect(result.items.map((i) => i.id)).toEqual([9, 3]); // order follows productIds
  });

  it('drops unpublished/deleted products from pinned shelves', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('products', { productIds: [1, 2] }),
    ]);
    db.product.find.mockResolvedValue([product({ id: 1 })]);
    const [result] = await service.list();
    expect(result.items.map((i) => i.id)).toEqual([1]);
  });

  it('resolves category shelves and banner shelves', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('categories', { limit: 4 }),
      section('banners', { limit: 2 }),
    ]);
    db.category.find.mockResolvedValue([
      {
        id: 1,
        name: 'Men',
        nameBN: null,
        slug: 'men',
        imageUrl: null,
        parentId: null,
      },
    ]);
    db.banner.find.mockResolvedValue([
      {
        id: 1,
        title: 'Eid',
        titleBN: null,
        imageUrl: 'x.jpg',
        mobileImageUrl: null,
        linkUrl: '/shop',
        position: 'hero',
      },
    ]);
    const [catSec, bannerSec] = await service.list();
    expect(catSec.items[0]).toEqual(expect.objectContaining({ slug: 'men' }));
    expect(bannerSec.items[0]).toEqual(
      expect.objectContaining({ title: 'Eid', linkUrl: '/shop' }),
    );
  });

  it('leaves custom sections untouched with no items', async () => {
    db.homepageSection.find.mockResolvedValue([
      section('custom', { imageUrl: 'jabaib/homepage/promo.png' }),
    ]);
    const [result] = await service.list();
    expect(result.items).toEqual([]);
    expect(result.content).toEqual({ imageUrl: 'jabaib/homepage/promo.png' });
  });
});
