import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminOrderService } from './admin-order.service';
import { DatabaseService } from '../../database/database.service';
import { OrderStatus, PaymentStatus } from '../../database/enums/enums';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';

const admin: JwtPayload = {
  id: 7,
  sub: 'admin@jabaib.test',
  type: 'admin',
  role: 'super_admin',
  userName: 'Root Admin',
};

describe('AdminOrderService (status transitions)', () => {
  let service: AdminOrderService;
  let db: {
    order: {
      findOne: jest.Mock;
      save: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    orderStatusHistory: { create: jest.Mock; save: jest.Mock };
    payment: {
      find: jest.Mock;
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
    };
  };

  beforeEach(async () => {
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
      payment: {
        find: jest.fn(() => Promise.resolve([])),
        // no pending row by default -> recordPayment inserts, as it always did
        findOne: jest.fn(() => Promise.resolve(null)),
        create: jest.fn((row) => row),
        save: jest.fn((row) => Promise.resolve(row)),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminOrderService,
        { provide: DatabaseService, useValue: db },
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
        paymentStatus: PaymentStatus.PENDING,
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
    });

    it('settles the pending payment carrying the same reference instead of adding a row', async () => {
      // A manual gateway order already has a pending payment holding the
      // customer's proof; recording it must not leave that row pending forever.
      const pending = { id: 40, status: 'pending', amount: 1060, paidAt: null };
      db.order.findOne.mockResolvedValue(
        orderOf(OrderStatus.PENDING, {
          paymentStatus: PaymentStatus.PENDING,
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
});
