import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserOrderService } from './user-order.service';
import { DatabaseService } from '../../../database/database.service';

const USER = {
  sub: 'u@test.dev',
  id: 7,
  type: 'user' as const,
  role: null,
  userName: 'Rafi',
};
const PAGINATION = { page: 0, size: 10, offset: 0, limit: 10 };

function orderItem(partial: Record<string, unknown> = {}) {
  return {
    id: 4,
    orderId: 1,
    productId: 8,
    productSKUId: 11,
    productName: 'Shirt',
    skuData: '[{"attribute":"Size","value":"M"}]',
    quantity: 2,
    unitPrice: 1000,
    unitDiscountedPricePrice: 900,
    totalPrice: 2000,
    totalDiscountedPrice: 1800,
    product: { slug: 'shirt', thumbnailUrl: 'jabaib/product/8.png' },
    ...partial,
  };
}

function order(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNumber: 'JAB-261007-1234',
    userId: 7,
    status: 'pending',
    deliveryType: 'inside_dhaka',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    couponId: null,
    couponCode: null,
    subtotal: 1800,
    deliveryCharge: 60,
    discountAmount: 0,
    total: 1860,
    note: null,
    createdAt: new Date('2026-10-07'),
    items: [orderItem()],
    address: { recipientName: 'Rafi', phone: '0171', address: 'House 12' },
    statusHistory: [
      {
        status: 'pending',
        note: 'Order placed',
        createdAt: new Date('2026-10-07'),
      },
    ],
    ...partial,
  };
}

describe('UserOrderService (my orders, cancel, returns)', () => {
  let service: UserOrderService;
  let db: Record<string, any>;

  beforeEach(async () => {
    const saved: any[] = [];
    const manager = {
      create: jest.fn((entity: any, row: any) => ({ entity, ...row })),
      save: jest.fn(async (row: any) => {
        const withId = { id: saved.length + 1, ...row };
        saved.push(withId);
        return withId;
      }),
      findOne: jest.fn(async () => null),
      find: jest.fn(async () => [
        { productSKUId: 21, quantity: 2 },
        { productSKUId: 22, quantity: 1 },
      ]),
      increment: jest.fn(async () => ({ affected: 1 })),
    };
    (db as any) = undefined;

    db = {
      order: {
        findAndCount: jest.fn(async () => [[order()], 1]),
        findOne: jest.fn(async () => order()),
        save: jest.fn(async (row: any) => row),
      },
      orderItem: {},
      orderStatusHistory: {
        find: jest.fn(async () => [
          {
            status: 'pending',
            note: 'Order placed',
            createdAt: new Date(Date.now() - 86_400_000),
          },
          { status: 'delivered', note: null, createdAt: new Date() },
        ]),
        save: jest.fn(async (row: any) => row),
        create: jest.fn((row: any) => row),
      },
      orderReturn: {
        find: jest.fn(async () => []),
        save: jest.fn(async (row: any) => row),
        create: jest.fn((row: any) => row),
      },
      orderReturnItem: {
        save: jest.fn(async (row: any) => row),
        create: jest.fn((row: any) => row),
      },
      orderReturnStatusHistory: {
        save: jest.fn(async (row: any) => row),
        create: jest.fn((row: any) => row),
      },
      payment: {
        find: jest.fn(async () => [
          {
            id: 1,
            method: 'cod',
            status: 'pending',
            amount: 1860,
            transactionId: null,
            paidAt: null,
          },
        ]),
      },
      transaction: jest.fn(async (run: any) => run(manager)),
    };
    (db as any).__saved = saved;
    (db as any).__manager = manager;

    const module = await Test.createTestingModule({
      providers: [UserOrderService, { provide: DatabaseService, useValue: db }],
    }).compile();
    service = module.get(UserOrderService);
  });

  describe('list', () => {
    it('scopes to the caller and summarises items', async () => {
      const result = await service.list(7, PAGINATION);
      expect(db.order.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          orderNumber: 'JAB-261007-1234',
          itemCount: 2,
          total: 1860,
          returnStatus: null,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns items, timeline, payments and return eligibility', async () => {
      const result = await service.findOne(7, 1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({ name: 'Shirt', slug: 'shirt', quantity: 2 }),
      );
      expect(result.items[0].skuData).toEqual([
        { attribute: 'Size', value: 'M' },
      ]);
      expect(result.statusHistory[0]).toEqual(
        expect.objectContaining({ status: 'pending' }),
      );
      expect(result.payments[0]).toEqual(
        expect.objectContaining({ method: 'cod' }),
      );
      expect(result.canCancel).toBe(true);
      expect(result.canReturn).toBe(false); // still pending, not delivered
    });

    it('404s for someone else’s order', async () => {
      db.order.findOne.mockResolvedValue(null);
      await expect(service.findOne(7, 99)).rejects.toThrow(NotFoundException);
    });

    it('allows returns once delivered inside the window', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      const result = await service.findOne(7, 1);
      expect(result.canReturn).toBe(true);
      expect(typeof result.returnWindowEnds).toBe('string');
    });

    it('closes the window 7 days after delivery', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      db.orderStatusHistory.find.mockResolvedValue([
        {
          status: 'delivered',
          note: null,
          createdAt: new Date(Date.now() - 8 * 86_400_000),
        },
      ]);
      const result = await service.findOne(7, 1);
      expect(result.canReturn).toBe(false);
      expect(result.returnReason).toMatch(/window has closed/i);
      expect(result.returnWindowEnds).toBeNull();
    });
  });

  describe('cancel', () => {
    it('cancels a pending order and writes history', async () => {
      db.order.save.mockImplementation(async (row: any) => row);
      db.order.findOne
        .mockResolvedValueOnce(order())
        .mockResolvedValue(order({ status: 'cancelled' }));
      const result = await service.cancel(USER, 1, {
        reason: 'Ordered by mistake',
      });
      const saved = (db as any).__saved as any[];
      expect(saved).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            status: 'cancelled',
            note: 'Ordered by mistake',
          }),
          expect.objectContaining({
            orderId: 1,
            status: 'cancelled',
            creatorType: 'user',
          }),
        ]),
      );
      expect(result.canCancel).toBe(false);
    });

    it('returns the reserved stock to the shelf when an order is cancelled', async () => {
      db.order.findOne
        .mockResolvedValueOnce(order())
        .mockResolvedValue(order({ status: 'cancelled' }));
      await service.cancel(USER, 1, {});

      const manager = (db as any).__manager;
      // one increment per order line, by the quantity that was reserved
      expect(manager.increment).toHaveBeenCalledTimes(2);
      expect(manager.increment).toHaveBeenCalledWith(
        expect.anything(),
        { id: 21 },
        'quantity',
        2,
      );
      expect(manager.increment).toHaveBeenCalledWith(
        expect.anything(),
        { id: 22 },
        'quantity',
        1,
      );
    });

    it('refuses to cancel an order that already shipped', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'shipped' }));
      await expect(service.cancel(USER, 1, {})).rejects.toThrow(
        /Only pending orders/i,
      );
      expect(db.order.save).not.toHaveBeenCalled();
    });
  });

  describe('requestReturn', () => {
    it('creates the return with items, refund estimate and history', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      const result = await service.requestReturn(USER, 1, {
        reason: 'Colour differs from the photo',
        items: [{ orderItemId: 4, quantity: 1, reason: 'Wrong shade' }],
        media: ['jabaib/order-return/photo.png'],
      });
      const saved = (db as any).__saved;
      const ret = saved.find((row: any) => row.entity?.name === 'OrderReturn');
      expect(ret).toEqual(
        expect.objectContaining({
          orderId: 1,
          userId: 7,
          status: 'requested',
          refundAmount: 900,
          media: ['jabaib/order-return/photo.png'],
        }),
      );
      expect(ret.returnNumber).toMatch(/^RET-\d{6}-[0-9A-F]{4}$/);
      const line = saved.find(
        (row: any) => row.entity?.name === 'OrderReturnItem',
      );
      expect(line).toEqual(
        expect.objectContaining({
          orderItemId: 4,
          quantity: 1,
          reason: 'Wrong shade',
        }),
      );
      expect(result.returnNumber).toBe(ret.returnNumber);
    });

    it('refuses returns on an undelivered order', async () => {
      await expect(
        service.requestReturn(USER, 1, {
          reason: 'x',
          items: [{ orderItemId: 4, quantity: 1 }],
        }),
      ).rejects.toThrow(/Only delivered orders/i);
    });

    it('refuses a second return while one is open', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      db.orderReturn.find.mockResolvedValue([
        { orderId: 1, status: 'requested', items: [] },
      ]);
      await expect(
        service.requestReturn(USER, 1, {
          reason: 'x',
          items: [{ orderItemId: 4, quantity: 1 }],
        }),
      ).rejects.toThrow(/already open/i);
    });

    it('allows a new return after the previous one was rejected', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      db.orderReturn.find.mockResolvedValue([
        {
          orderId: 1,
          status: 'rejected',
          items: [{ orderItemId: 4, quantity: 1 }],
        },
      ]);
      await expect(
        service.requestReturn(USER, 1, {
          reason: 'x',
          items: [{ orderItemId: 4, quantity: 1 }],
        }),
      ).resolves.toEqual(
        expect.objectContaining({ returnNumber: expect.any(String) }),
      );
    });

    it('refuses quantities above what is still returnable', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      // a completed return already took one of the two units
      db.orderReturn.find.mockResolvedValue([
        {
          orderId: 1,
          status: 'completed',
          items: [{ orderItemId: 4, quantity: 1 }],
        },
      ]);
      await expect(
        service.requestReturn(USER, 1, {
          reason: 'x',
          items: [{ orderItemId: 4, quantity: 2 }],
        }),
      ).rejects.toThrow(/Only 1 of "Shirt" can still be returned/i);
    });

    it('rejects items from another order', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      await expect(
        service.requestReturn(USER, 1, {
          reason: 'x',
          items: [{ orderItemId: 999, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires at least one item', async () => {
      db.order.findOne.mockResolvedValue(order({ status: 'delivered' }));
      await expect(
        service.requestReturn(USER, 1, { reason: 'x', items: [] }),
      ).rejects.toThrow(/at least one item/i);
    });
  });
});
