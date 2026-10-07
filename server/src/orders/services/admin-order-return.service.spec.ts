import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminOrderReturnService } from './admin-order-return.service';
import { DatabaseService } from '../../database/database.service';
import { OrderReturnStatus } from '../../database/enums/enums';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';

const admin: JwtPayload = {
  id: 9,
  sub: 'ops@jabaib.test',
  type: 'admin',
  role: 'admin',
  userName: 'Ops Admin',
};

describe('AdminOrderReturnService (return status transitions)', () => {
  let service: AdminOrderReturnService;
  let db: {
    orderReturn: {
      findOne: jest.Mock;
      save: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    orderReturnStatusHistory: { create: jest.Mock; save: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      orderReturn: {
        findOne: jest.fn(),
        save: jest.fn((row) => Promise.resolve(row)),
        createQueryBuilder: jest.fn(),
      },
      orderReturnStatusHistory: {
        create: jest.fn((row) => row),
        save: jest.fn((row) => Promise.resolve(row)),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminOrderReturnService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(AdminOrderReturnService);
  });

  const retOf = (status: OrderReturnStatus, extra = {}) => ({
    id: 4,
    returnNumber: 'RET-1001',
    status,
    ...extra,
  });

  describe('updateStatus', () => {
    it('approves REQUESTED -> APPROVED and writes history with creator fields', async () => {
      const ret = retOf(OrderReturnStatus.REQUESTED, {
        refundAmount: 0,
        refundMethod: null,
      });
      db.orderReturn.findOne.mockResolvedValue(ret);

      await service.updateStatus(
        4,
        {
          status: OrderReturnStatus.APPROVED,
          note: 'pickup scheduled',
          refundAmount: 1200,
          refundMethod: 'bkash',
        },
        admin,
      );

      expect(db.orderReturn.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: OrderReturnStatus.APPROVED,
          refundAmount: 1200,
          refundMethod: 'bkash',
          updatedBy: 9,
          updaterType: 'admin',
          updaterName: 'Ops Admin',
        }),
      );
      expect(db.orderReturnStatusHistory.create).toHaveBeenCalledWith({
        orderReturnId: 4,
        status: OrderReturnStatus.APPROVED,
        note: 'pickup scheduled',
        createdBy: 9,
        creatorType: 'admin',
        creatorName: 'Ops Admin',
      });
      expect(db.orderReturnStatusHistory.save).toHaveBeenCalledTimes(1);
    });

    it.each([
      [OrderReturnStatus.REQUESTED, OrderReturnStatus.COMPLETED],
      [OrderReturnStatus.APPROVED, OrderReturnStatus.REJECTED],
      [OrderReturnStatus.APPROVED, OrderReturnStatus.COMPLETED],
      [OrderReturnStatus.PICKED_UP, OrderReturnStatus.APPROVED],
      [OrderReturnStatus.REJECTED, OrderReturnStatus.APPROVED],
      [OrderReturnStatus.COMPLETED, OrderReturnStatus.REFUNDED],
    ])('rejects illegal return transition %s -> %s (400)', async (from, to) => {
      db.orderReturn.findOne.mockResolvedValue(retOf(from));
      await expect(
        service.updateStatus(4, { status: to }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(db.orderReturn.save).not.toHaveBeenCalled();
      expect(db.orderReturnStatusHistory.save).not.toHaveBeenCalled();
    });

    it.each([
      [OrderReturnStatus.REQUESTED, OrderReturnStatus.REJECTED],
      [OrderReturnStatus.APPROVED, OrderReturnStatus.PICKED_UP],
      [OrderReturnStatus.PICKED_UP, OrderReturnStatus.REFUNDED],
      [OrderReturnStatus.PICKED_UP, OrderReturnStatus.COMPLETED],
      [OrderReturnStatus.REFUNDED, OrderReturnStatus.COMPLETED],
    ])('allows legal return transition %s -> %s', async (from, to) => {
      const ret = retOf(from);
      db.orderReturn.findOne.mockResolvedValue(ret);
      await service.updateStatus(4, { status: to }, admin);
      expect(db.orderReturn.save).toHaveBeenCalled();
    });

    it('throws 404 when the return does not exist', async () => {
      db.orderReturn.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(4, { status: OrderReturnStatus.APPROVED }, admin),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
