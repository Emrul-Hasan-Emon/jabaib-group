import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminOrderService } from './admin-order.service';
import { UserPaymentGatewayService } from './user-payment-gateway.service';
import { DatabaseService } from '../../database/database.service';
import {
  DeliveryType,
  OrderStatus,
  PaymentStatus,
} from '../../database/enums/enums';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';

const admin: JwtPayload = {
  id: 7,
  sub: 'admin@jabaib.test',
  type: 'admin',
  role: 'super_admin',
  userName: 'Root Admin',
};

function sku(partial: Record<string, unknown> = {}) {
  return {
    id: 11,
    productId: 8,
    sku: 'SKU-M',
    price: 1000,
    discountedPrice: null,
    discountedPriceStartDate: null,
    discountedPriceEndDate: null,
    quantity: 10,
    isActive: true,
    skuVariants: [],
    product: { id: 8, name: 'Shirt', isActive: true },
    ...partial,
  };
}

describe('AdminOrderService (status transitions)', () => {
  let service: AdminOrderService;
  let db: {
    order: {
      findOne: jest.Mock;
      save: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    orderStatusHistory: { create: jest.Mock; save: jest.Mock };
    paymentStatusHistory: { create: jest.Mock; save: jest.Mock };
    payment: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
    user: { findOne: jest.Mock };
    address: { findOne: jest.Mock };
    shippingZone: { findOne: jest.Mock };
    productSKU: { findOne: jest.Mock };
    paymentGateway: { findOne: jest.Mock };
    transaction: jest.Mock;
  };
  let gateways: { resolve: jest.Mock };

  beforeEach(async () => {
    const saved: any[] = [];
    const manager = {
      create: jest.fn((entity: any, row: any) => ({ entity, ...row })),
      save: jest.fn(async (row: any) => {
        const withId = { id: row.id ?? saved.length + 1, ...row };
        saved.push(withId);
        return withId;
      }),
      findOne: jest.fn(async () => null), // no order-number clash
      createQueryBuilder: jest.fn(() => ({
        update: () => ({
          set: () => ({
            where: () => ({
              andWhere: () => ({ execute: async () => ({ affected: 1 }) }),
            }),
          }),
        }),
      })),
    };

    db = {
      order: {
        findOne: jest.fn(),
        save: jest.fn((order) => Promise.resolve(order)),
        createQueryBuilder: jest.fn(),
      },
      orderStatusHistory: {
        create: jest.fn((row) => row),
        save: jest.fn((row) => Promise.resolve(row)),
      },
      paymentStatusHistory: {
        create: jest.fn((row) => row),
        save: jest.fn((row) => Promise.resolve(row)),
      },
      payment: {
        find: jest.fn(() => Promise.resolve([])),
        // no pending row by default -> recordPayment inserts, as it always did
        findOne: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((row) => row),
        save: jest.fn((row) => Promise.resolve(row)),
      },
      user: { findOne: jest.fn(async () => ({ id: 5, name: 'Customer' })) },
      address: { findOne: jest.fn(async () => null) },
      shippingZone: {
        findOne: jest.fn(async () => ({
          name: 'Inside Dhaka',
          charge: 60,
          estimatedDays: 2,
          isActive: true,
        })),
      },
      productSKU: { findOne: jest.fn(async () => sku()) },
      paymentGateway: {
        findOne: jest.fn(async () => ({ id: 9, provider: 'cod' })),
      },
      transaction: jest.fn(async (run: any) => run(manager)),
    } as any;
    (db as any).__manager = manager;
    gateways = {
      resolve: jest.fn(async (gatewayId: number) => ({
        gateway: { id: gatewayId, isManual: false, provider: 'cod' },
        paymentMethod: 'cod',
        paymentMetaData: null,
      })),
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminOrderService,
        { provide: DatabaseService, useValue: db },
        { provide: UserPaymentGatewayService, useValue: gateways },
      ],
    }).compile();
    service = module.get(AdminOrderService);
  });

  const orderOf = (
    status: OrderStatus,
    extra: Record<string, any> = {},
  ): Record<string, any> => ({
    id: 1,
    orderNumber: 'ORD-1001',
    status,
    ...extra,
  });

  describe('updateStatus', () => {
    it('moves PENDING -> CONFIRMED and writes updater + history creator fields', async () => {
      const order = orderOf(OrderStatus.PENDING);
      db.order.findOne.mockResolvedValue(order);
      db.order.save.mockImplementation(async (o) => o);

      await service.updateStatus(
        1,
        { status: OrderStatus.CONFIRMED, note: 'verified' },
        admin,
      );

      expect(db.order.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderStatus.CONFIRMED,
          updatedBy: 7,
          updaterType: 'admin',
          updaterName: 'Root Admin',
        }),
      );
      expect(db.orderStatusHistory.create).toHaveBeenCalledWith({
        orderId: 1,
        status: OrderStatus.CONFIRMED,
        note: 'verified',
        createdBy: 7,
        creatorType: 'admin',
        creatorName: 'Root Admin',
      });
      expect(db.orderStatusHistory.save).toHaveBeenCalledTimes(1);
    });

    it.each([
      [OrderStatus.PENDING, OrderStatus.SHIPPED],
      [OrderStatus.PENDING, OrderStatus.DELIVERED],
      [OrderStatus.CONFIRMED, OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED, OrderStatus.PENDING],
      [OrderStatus.RETURNED, OrderStatus.PROCESSING],
    ])('rejects illegal transition %s -> %s (400)', async (from, to) => {
      db.order.findOne.mockResolvedValue(orderOf(from));
      await expect(
        service.updateStatus(1, { status: to }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(db.order.save).not.toHaveBeenCalled();
      expect(db.orderStatusHistory.save).not.toHaveBeenCalled();
    });

    it.each([
      [OrderStatus.PENDING, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED, OrderStatus.PROCESSING],
      [OrderStatus.PROCESSING, OrderStatus.SHIPPED],
      [OrderStatus.SHIPPED, OrderStatus.DELIVERED],
      [OrderStatus.DELIVERED, OrderStatus.RETURNED],
    ])('allows legal transition %s -> %s', async (from, to) => {
      const order = orderOf(from);
      db.order.findOne.mockResolvedValue(order);
      await service.updateStatus(1, { status: to }, admin);
      expect(db.order.save).toHaveBeenCalled();
    });

    it('throws 404 when the order does not exist', async () => {
      db.order.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(999, { status: OrderStatus.CONFIRMED }, admin),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('recordPayment', () => {
    it('marks a pending order paid and stores the payment with creator fields', async () => {
      const order = orderOf(OrderStatus.PENDING, {
        paymentStatus: PaymentStatus.DUE,
        paymentMethod: 'cod',
        total: 2500,
      });
      db.order.findOne.mockResolvedValue(order);

      const payment = await service.recordPayment(
        1,
        { transactionId: 'TXN-1' },
        admin,
      );

      expect(payment).toEqual(
        expect.objectContaining({
          orderId: 1,
          method: 'cod',
          status: PaymentStatus.PAID,
          amount: 2500,
          transactionId: 'TXN-1',
          createdBy: 7,
          creatorType: 'admin',
          creatorName: 'Root Admin',
        }),
      );
      expect(order.paymentStatus).toBe(PaymentStatus.PAID);
      expect(db.order.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatus: PaymentStatus.PAID,
          updatedBy: 7,
          updaterType: 'admin',
          updaterName: 'Root Admin',
        }),
      );
      expect(db.paymentStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          status: PaymentStatus.PAID,
          createdBy: 7,
          creatorType: 'admin',
        }),
      );
      expect(db.paymentStatusHistory.save).toHaveBeenCalledTimes(1);
    });

    it('settles the pending payment carrying the same reference instead of adding a row', async () => {
      // A manual gateway order already has a pending payment holding the
      // customer's proof; recording it must not leave that row pending forever.
      const pending = { id: 40, status: 'due', amount: 1060, paidAt: null };
      db.order.findOne.mockResolvedValue(
        orderOf(OrderStatus.PENDING, {
          paymentStatus: PaymentStatus.DUE,
          paymentMethod: 'bkash',
          total: 1060,
        }),
      );
      db.payment.findOne.mockResolvedValue(pending);

      await service.recordPayment(1, { transactionId: 'TXN9' });

      expect(db.payment.create).not.toHaveBeenCalled();
      expect(db.payment.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 40, status: 'paid' }),
      );
      expect(pending.paidAt).toBeInstanceOf(Date);
    });

    it('rejects recording payment on an already-paid order (400)', async () => {
      db.order.findOne.mockResolvedValue(
        orderOf(OrderStatus.CONFIRMED, { paymentStatus: PaymentStatus.PAID }),
      );
      await expect(service.recordPayment(1, {}, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws 404 when the order does not exist', async () => {
      db.order.findOne.mockResolvedValue(null);
      await expect(service.recordPayment(1, {}, admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create (admin-placed order — no cart/coupon, always COD)', () => {
    const DTO = {
      userId: 5,
      items: [{ productId: 8, productSKUId: 11, quantity: 2 }],
      recipientName: 'Customer',
      phone: '01700000000',
      address: 'House 1, Road 1',
      deliveryType: DeliveryType.INSIDE_DHAKA,
    };

    it('throws 404 when the customer does not exist', async () => {
      db.user.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('requires recipient/phone/address when no addressId is given', async () => {
      await expect(
        service.create({ ...DTO, recipientName: undefined } as any, admin),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unavailable product/SKU', async () => {
      db.productSKU.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when stock is insufficient', async () => {
      db.productSKU.findOne.mockResolvedValue(sku({ quantity: 1 }));
      await expect(service.create(DTO, admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('writes order + item + address + payment + history as COD, decrements stock, and returns the order', async () => {
      db.order.findOne.mockResolvedValue(
        orderOf(OrderStatus.PENDING, { id: 1 }),
      );
      const manager = (db as any).__manager;

      const result = await service.create(DTO, admin);

      expect(db.transaction).toHaveBeenCalledTimes(1);
      const rows = await Promise.all(
        manager.save.mock.results.map((r: any) => r.value),
      );
      const orderRow = rows.find((r) => r.orderNumber);
      expect(orderRow).toEqual(
        expect.objectContaining({
          userId: 5,
          paymentMethod: 'cod',
          paymentGatewayId: 9,
          paymentStatus: 'due',
          status: 'pending',
          listTotal: 2000,
          subtotal: 2000,
          deliveryCharge: 60,
          discountAmount: 0,
          total: 2060,
        }),
      );
      const itemRow = rows.find((r) => r.productSKUId === 11);
      expect(itemRow).toEqual(
        expect.objectContaining({ quantity: 2, unitPrice: 1000 }),
      );
      const addressRow = rows.find((r) => r.recipientName);
      expect(addressRow).toEqual(
        expect.objectContaining({ recipientName: 'Customer' }),
      );
      const paymentRow = rows.find((r) => r.method === 'cod');
      expect(paymentRow).toEqual(
        expect.objectContaining({ amount: 2060, status: 'due' }),
      );
      expect(manager.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('defaults to the active Cash on Delivery gateway when none is given', async () => {
      db.order.findOne.mockResolvedValue(orderOf(OrderStatus.PENDING));
      await service.create(DTO, admin);
      expect(db.paymentGateway.findOne).toHaveBeenCalledWith({
        where: { provider: 'cod', isActive: true },
      });
      expect(gateways.resolve).toHaveBeenCalledWith(9, undefined);
    });

    it('resolves payment through an explicitly chosen gateway id, never a hardcoded method', async () => {
      db.order.findOne.mockResolvedValue(orderOf(OrderStatus.PENDING));
      gateways.resolve.mockResolvedValue({
        gateway: { id: 42, isManual: true, provider: null },
        paymentMethod: 'bkash-wallet',
        paymentMetaData: { txnId: 'TXN1' },
      });

      await service.create(
        { ...DTO, paymentGatewayId: 42, paymentMetaData: { txnId: 'TXN1' } },
        admin,
      );

      expect(db.paymentGateway.findOne).not.toHaveBeenCalled();
      expect(gateways.resolve).toHaveBeenCalledWith(42, { txnId: 'TXN1' });
      const manager = (db as any).__manager;
      const rows = await Promise.all(
        manager.save.mock.results.map((r: any) => r.value),
      );
      const orderRow = rows.find((r) => r.orderNumber);
      expect(orderRow).toEqual(
        expect.objectContaining({
          paymentMethod: 'bkash-wallet',
          paymentGatewayId: 42,
        }),
      );
    });

    it('rejects when no active Cash on Delivery gateway is configured', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      await expect(service.create(DTO, admin)).rejects.toThrow(
        BadRequestException,
      );
      expect(gateways.resolve).not.toHaveBeenCalled();
    });
  });
});
