import { Test } from '@nestjs/testing';
import { UserCategoryService } from './user-category.service';
import { DatabaseService } from '../../../database/database.service';

describe('UserCategoryService.listActive (parentId filter)', () => {
  let service: UserCategoryService;
  const find = jest.fn().mockResolvedValue([]);

  beforeEach(async () => {
    find.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        UserCategoryService,
        { provide: DatabaseService, useValue: { category: { find } } },
      ],
    }).compile();
    service = module.get(UserCategoryService);
  });

  it('omitted parentId => isActive only, no parentId filter (flat, unchanged default)', async () => {
    await service.listActive();
    const where = find.mock.calls[0][0].where;
    expect(where).toEqual({ isActive: true });
  });

  it('parentId=null string => root categories only', async () => {
    await service.listActive('null');
    const where = find.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
    expect(where.parentId).toEqual(
      expect.objectContaining({ _type: 'isNull' }),
    );
  });

  it('parentId=<number> => direct children of that category only', async () => {
    await service.listActive('12');
    const where = find.mock.calls[0][0].where;
    expect(where).toEqual({ isActive: true, parentId: 12 });
  });
});

/** Men(1) -> Shirts(2) -> Oxford(4); Men(1) -> Bottoms(3); Sarees(5) is a root with no children. */
function familyTree() {
  return [
    { id: 1, parentId: null },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 1 },
    { id: 4, parentId: 2 },
    { id: 5, parentId: null },
  ];
}

describe('UserCategoryService.descendantIds', () => {
  let service: UserCategoryService;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset().mockResolvedValue(familyTree());
    const module = await Test.createTestingModule({
      providers: [
        UserCategoryService,
        { provide: DatabaseService, useValue: { category: { find } } },
      ],
    }).compile();
    service = module.get(UserCategoryService);
  });

  it('includes the category itself plus every nested descendant', async () => {
    const ids = await service.descendantIds(1);
    expect(new Set(ids)).toEqual(new Set([1, 2, 3, 4]));
  });

  it('returns just itself for a leaf category', async () => {
    const ids = await service.descendantIds(4);
    expect(ids).toEqual([4]);
  });

  it('returns just the id for one not found among active categories', async () => {
    const ids = await service.descendantIds(999);
    expect(ids).toEqual([999]);
  });
});

describe('UserCategoryService.tree (product count rollup)', () => {
  let service: UserCategoryService;
  let db: {
    category: { find: jest.Mock };
    product: { createQueryBuilder: jest.Mock };
  };

  function qbWithCounts(rows: { categoryId: string; count: string }[]) {
    const qb: Record<string, jest.Mock> = {};
    ['select', 'addSelect', 'where', 'andWhere', 'groupBy'].forEach((m) => {
      qb[m] = jest.fn().mockReturnThis();
    });
    qb.getRawMany = jest.fn(async () => rows);
    return qb;
  }

  beforeEach(async () => {
    db = {
      category: { find: jest.fn().mockResolvedValue(familyTree()) },
      product: { createQueryBuilder: jest.fn() },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserCategoryService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserCategoryService);
  });

  it('rolls each node’s own count up through every ancestor', async () => {
    // Only the leaf (Oxford, 4) and Bottoms (3) carry products directly.
    db.product.createQueryBuilder.mockReturnValue(
      qbWithCounts([
        { categoryId: '4', count: '2' },
        { categoryId: '3', count: '5' },
      ]),
    );
    const roots = await service.tree();
    const byId = new Map<number, (typeof roots)[number]>();
    const flatten = (nodes: typeof roots) => {
      for (const n of nodes) {
        byId.set(n.id, n);
        flatten(n.childrenNodes as typeof roots);
      }
    };
    flatten(roots);

    expect(byId.get(4)!.productCount).toBe(2); // leaf: own count only
    expect(byId.get(2)!.productCount).toBe(2); // Shirts: rolled up from Oxford
    expect(byId.get(3)!.productCount).toBe(5); // Bottoms: own count only
    expect(byId.get(1)!.productCount).toBe(7); // Men: 0 own + Shirts(2) + Bottoms(5)
    expect(byId.get(5)!.productCount).toBe(0); // Sarees: no products anywhere
  });
});
