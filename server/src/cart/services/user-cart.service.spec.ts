import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserCartService } from './user-cart.service';
import { DatabaseService } from '../../database/database.service';

const SESSION = 'guest-session-abcdef';

function sku(partial: Record<string, unknown> = {}) {
  return {
    id: 11,
    sku: 'SKU-M',
    price: 1000,
    discountedPrice: 900,
    discountedPriceStartDate: null,
    discountedPriceEndDate: null,
    quantity: 5,
    isActive: true,
    skuVariants: [
      {
        attribute: { id: 1, name: 'Size' },
        attributeValue: { id: 2, name: 'M' },
      },
    ],
    ...partial,
  };
}

function product(partial: Record<string, unknown> = {}) {
  return {
    id: 8,
    name: 'Shirt',
    nameBN: null,
    slug: 'shirt',
    thumbnailUrl: 'jabaib/product/8.png',
    isPublished: true,
    isActive: true,
    media: [],
    skus: [sku()],
    ...partial,
  };
}

/**
 * Minimal in-memory stand-in for the cart repositories: enough of find/save/
 * remove/delete semantics for the service to exercise its real control flow.
 */
function fakeStore() {
  const carts: any[] = [];
  const items: any[] = [];
  let seq = 0;

  const cartRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      const match = carts.find((c) => {
        if (where.id != null) return c.id === where.id;
        if (where.userId != null) return c.userId === where.userId;
        return c.sessionId === where.sessionId;
      });
      // TypeORM hydrates `relations: { items: true }`
      return match
        ? { ...match, items: items.filter((i) => i.cartId === match.id) }
        : null;
    }),
    create: jest.fn((row: any) => ({ ...row })),
    save: jest.fn(async (row: any) => {
      if (row.id) {
        Object.assign(carts.find((c) => c.id === row.id) ?? {}, row);
        return row;
      }
      const created = { id: ++seq, ...row };
      carts.push(created);
      return created;
    }),
    remove: jest.fn(async (row: any) => {
      const idx = carts.findIndex((c) => c.id === row.id);
      if (idx >= 0) carts.splice(idx, 1);
    }),
  };

  const itemRepo = {
    find: jest.fn(async ({ where }: any) =>
      items
        .filter((i) =>
          where.cartId != null ? i.cartId === where.cartId : true,
        )
        // TypeORM hydrates `relations: { product: true, sku: { … } }`
        .map((i) => ({
          ...i,
          product: product({ id: i.productId }),
          sku: sku(),
        })),
    ),
    findOne: jest.fn(async ({ where }: any) => {
      const found = items.find((i) =>
        Object.entries(where).every(([k, v]) => i[k] === v),
      );
      return found
        ? { ...found, product: product({ id: found.productId }), sku: sku() }
        : null;
    }),
    create: jest.fn((row: any) => ({ ...row })),
    save: jest.fn(async (row: any) => {
      if (row.id) {
        const idx = items.findIndex((i) => i.id === row.id);
        if (idx >= 0) items[idx] = { ...items[idx], ...row };
        return row;
      }
      const created = { id: ++seq, ...row };
      items.push(created);
      return created;
    }),
    remove: jest.fn(async (row: any) => {
      const idx = items.findIndex((i) => i.id === row.id);
      if (idx >= 0) items.splice(idx, 1);
    }),
    delete: jest.fn(async (criteria: any) => {
      const cartId = criteria?.where?.cartId ?? criteria?.cartId;
      for (let i = items.length - 1; i >= 0; i--) {
        if (cartId != null && items[i].cartId === cartId) {
          items.splice(i, 1);
        }
      }
    }),
  };

  return { carts, items, cartRepo, itemRepo };
}

describe('UserCartService (guest + customer cart)', () => {
  let service: UserCartService;
  let store: ReturnType<typeof fakeStore>;
  let db: Record<string, any>;

  beforeEach(async () => {
    store = fakeStore();
    db = {
      cart: store.cartRepo,
      cartItem: store.itemRepo,
      product: { findOne: jest.fn(async () => product()) },
      productSKU: { findOne: jest.fn(async () => sku()) },
    };
    const module = await Test.createTestingModule({
      providers: [UserCartService, { provide: DatabaseService, useValue: db }],
    }).compile();
    service = module.get(UserCartService);
  });

  describe('get', () => {
    it('returns an empty cart when there is none yet', async () => {
      await expect(service.get(null, SESSION)).resolves.toEqual({
        items: [],
        totals: { itemCount: 0, subtotal: 0, total: 0, savings: 0 },
      });
    });

    it('summarises lines with list price vs effective price', async () => {
      store.items.push(
        {
          id: 90,
          cartId: 5,
          productId: 8,
          productSKUId: 11,
          quantity: 1,
          unitPrice: 1000,
          unitDiscountedPrice: 900,
        },
        {
          id: 91,
          cartId: 5,
          productId: 9,
          productSKUId: 11,
          quantity: 2,
          unitPrice: 1000,
          unitDiscountedPrice: 900,
        },
      );
      store.carts.push({ id: 5, userId: 7 });
      const result = await service.get(7, undefined);
      expect(result.totals).toEqual({
        itemCount: 3,
        subtotal: 3000,
        total: 2700,
        savings: 300,
      });
      expect(result.items[0]).toEqual(
        expect.objectContaining({ skuLabel: 'M', sku: 'SKU-M', inStock: true }),
      );
    });

    it('resolves the signed-in cart by userId', async () => {
      await service.get(7, SESSION);
      expect(store.cartRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
    });
  });

  describe('add', () => {
    it('requires a session for guests', async () => {
      await expect(
        service.add(null, undefined, { productId: 8 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects unpublished products', async () => {
      db.product.findOne.mockResolvedValue(null);
      await expect(
        service.add(null, SESSION, { productId: 404 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('stores the SKU price snapshot and reports totals', async () => {
      const result = await service.add(null, SESSION, {
        productId: 8,
        productSKUId: 11,
        quantity: 2,
      });
      expect(store.items[0]).toEqual(
        expect.objectContaining({
          productId: 8,
          productSKUId: 11,
          quantity: 2,
          unitPrice: 1000,
          unitDiscountedPrice: 900,
          totalPrice: 2000,
          totalDiscountedPrice: 1800,
        }),
      );
      expect(result.totals).toEqual({
        itemCount: 2,
        subtotal: 2000,
        total: 1800,
        savings: 200,
      });
      expect(store.carts[0]).toEqual(
        expect.objectContaining({ sessionId: SESSION, totalPrice: 2000 }),
      );
    });

    it('sums onto an existing line instead of duplicating it', async () => {
      await service.add(null, SESSION, {
        productId: 8,
        productSKUId: 11,
        quantity: 1,
      });
      await service.add(null, SESSION, {
        productId: 8,
        productSKUId: 11,
        quantity: 2,
      });
      expect(store.items).toHaveLength(1);
      expect(store.items[0].quantity).toBe(3);
    });

    it('clamps the quantity to live stock', async () => {
      db.product.findOne.mockResolvedValue(
        product({ skus: [sku({ quantity: 2 })] }),
      );
      await service.add(null, SESSION, {
        productId: 8,
        productSKUId: 11,
        quantity: 5,
      });
      expect(store.items[0].quantity).toBe(2);
    });

    it('refuses out-of-stock SKUs', async () => {
      db.product.findOne.mockResolvedValue(
        product({ skus: [sku({ quantity: 0 })] }),
      );
      await expect(
        service.add(null, SESSION, { productId: 8, productSKUId: 11 }),
      ).rejects.toThrow(/out of stock/i);
    });

    it('picks the cheapest in-stock SKU when no variant is given', async () => {
      db.product.findOne.mockResolvedValue(
        product({
          skus: [
            sku({ id: 11, price: 1200, discountedPrice: null }),
            sku({ id: 12, price: 800, discountedPrice: null, quantity: 2 }),
          ],
        }),
      );
      await service.add(null, SESSION, { productId: 8, quantity: 1 });
      expect(store.items[0].productSKUId).toBe(12);
      expect(store.items[0].unitPrice).toBe(800);
    });

    it('rejects a variant that is not active', async () => {
      db.product.findOne.mockResolvedValue(
        product({ skus: [sku({ id: 11 }), sku({ id: 13, isActive: false })] }),
      );
      await expect(
        service.add(null, SESSION, { productId: 8, productSKUId: 13 }),
      ).rejects.toThrow(/no longer available/i);
    });
  });

  describe('updateQuantity', () => {
    it('rejects items from another cart', async () => {
      store.carts.push({ id: 5, userId: 7 });
      store.items.push({
        id: 90,
        cartId: 99,
        productId: 8,
        productSKUId: 11,
        quantity: 1,
        unitPrice: 1000,
        unitDiscountedPrice: 900,
      });
      await expect(service.updateQuantity(7, undefined, 90, 2)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('clamps to stock and recomputes line totals', async () => {
      store.carts.push({ id: 5, userId: 7 });
      store.items.push({
        id: 90,
        cartId: 5,
        productId: 8,
        productSKUId: 11,
        quantity: 1,
        unitPrice: 1000,
        unitDiscountedPrice: 900,
      });
      // stock is 5 in the SKU fixture, so a request of 10 clamps to 5
      const result = await service.updateQuantity(7, undefined, 90, 10);
      expect(store.items[0].quantity).toBe(5);
      expect(result.totals.total).toBe(4500);
    });
  });

  describe('removeItem / clear', () => {
    it('removes a line and recalculates', async () => {
      store.carts.push({ id: 5, userId: 7 });
      store.items.push({
        id: 90,
        cartId: 5,
        productId: 8,
        productSKUId: 11,
        quantity: 1,
        unitPrice: 1000,
        unitDiscountedPrice: 900,
      });
      const result = await service.removeItem(7, undefined, 90);
      expect(store.items).toHaveLength(0);
      expect(result.totals.itemCount).toBe(0);
      expect(store.carts[0].totalPrice).toBe(0);
    });

    it('clearing an unknown cart is a no-op', async () => {
      await expect(service.clear(7)).resolves.toEqual({
        items: [],
        totals: { itemCount: 0, subtotal: 0, total: 0, savings: 0 },
      });
      expect(store.itemRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    it('folds guest lines into the customer cart and sums quantities', async () => {
      store.carts.push({ id: 1, sessionId: SESSION }, { id: 2, userId: 7 });
      store.items.push(
        {
          id: 90,
          cartId: 1,
          productId: 8,
          productSKUId: 11,
          quantity: 1,
          unitPrice: 1000,
          unitDiscountedPrice: 900,
        },
        {
          id: 91,
          cartId: 2,
          productId: 8,
          productSKUId: 11,
          quantity: 2,
          unitPrice: 1000,
          unitDiscountedPrice: 900,
        },
      );

      const result = await service.merge(7, SESSION);

      expect(store.items).toHaveLength(1);
      expect(store.items[0]).toEqual(
        expect.objectContaining({ cartId: 2, quantity: 3 }),
      );
      expect(store.carts.map((c) => c.id)).toEqual([2]);
      expect(result.totals.itemCount).toBe(3);
    });

    it('skips guest lines whose SKU is no longer purchasable', async () => {
      store.carts.push({ id: 1, sessionId: SESSION }, { id: 2, userId: 7 });
      store.items.push({
        id: 90,
        cartId: 1,
        productId: 8,
        productSKUId: 11,
        quantity: 1,
        unitPrice: 1000,
        unitDiscountedPrice: 900,
      });
      db.productSKU.findOne.mockResolvedValue(sku({ isActive: false }));
      await service.merge(7, SESSION);
      expect(store.items).toHaveLength(0);
    });

    it('is a no-op without a session id', async () => {
      await service.merge(7, undefined);
      expect(store.itemRepo.save).not.toHaveBeenCalled();
    });
  });

  it('issues opaque session ids', () => {
    const id = service.newSessionId();
    expect(id).toHaveLength(32);
    expect(id).not.toBe(service.newSessionId());
  });
});
