import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserCouponService } from './user-coupon.service';
import { DatabaseService } from '../../../database/database.service';

function coupon(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    code: 'EID25',
    type: 'percent',
    amount: 25,
    minOrderAmount: 0,
    maxDiscountAmount: 750,
    usageLimit: 0,
    usedCount: 0,
    perUserLimit: 0,
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...partial,
  };
}

describe('UserCouponService (checkout coupon validation)', () => {
  let service: UserCouponService;
  let db: Record<string, any>;

  beforeEach(async () => {
    db = {
      coupon: {
        findOne: jest.fn(async () => coupon()),
        increment: jest.fn(async () => ({ affected: 1 })),
      },
      couponHistoryLog: {
        count: jest.fn(async () => 0),
        create: jest.fn((row: any) => ({ ...row })),
        save: jest.fn(async (row: any) => row),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        UserCouponService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserCouponService);
  });

  describe('preview', () => {
    it('normalizes the code and applies a percentage discount', async () => {
      const result = await service.preview(7, '  eid25 ', 2000);
      expect(db.coupon.findOne).toHaveBeenCalledWith({
        where: { code: 'EID25' },
      });
      expect(result).toEqual({
        valid: true,
        code: 'EID25',
        type: 'percent',
        discountAmount: 500,
      });
    });

    it('caps a percentage discount at maxDiscountAmount', async () => {
      const result = await service.preview(7, 'EID25', 10000);
      expect(result.discountAmount).toBe(750);
    });

    it('applies a flat discount without exceeding the subtotal', async () => {
      db.coupon.findOne.mockResolvedValue(
        coupon({
          code: 'FLAT50',
          type: 'flat',
          amount: 50,
          maxDiscountAmount: null,
        }),
      );
      await expect(service.preview(7, 'FLAT50', 2000)).resolves.toEqual(
        expect.objectContaining({ discountAmount: 50 }),
      );
      db.coupon.findOne.mockResolvedValue(
        coupon({
          code: 'FLAT999',
          type: 'flat',
          amount: 999,
          maxDiscountAmount: null,
        }),
      );
      await expect(service.preview(7, 'FLAT999', 100)).resolves.toEqual(
        expect.objectContaining({ discountAmount: 100 }),
      );
    });

    it('rejects an unknown code', async () => {
      db.coupon.findOne.mockResolvedValue(null);
      const result = await service.preview(7, 'NOPE', 2000);
      expect(result).toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('does not exist'),
        }),
      );
    });

    it('rejects an empty code', async () => {
      const result = await service.preview(7, '  ', 2000);
      expect(result.valid).toBe(false);
      expect(db.coupon.findOne).not.toHaveBeenCalled();
    });

    it('rejects inactive coupons', async () => {
      db.coupon.findOne.mockResolvedValue(coupon({ isActive: false }));
      await expect(service.preview(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('no longer active'),
        }),
      );
    });

    it('rejects coupons outside their date window', async () => {
      db.coupon.findOne.mockResolvedValue(
        coupon({ startsAt: new Date(Date.now() + 86_400_000) }),
      );
      await expect(service.preview(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('not active yet'),
        }),
      );

      db.coupon.findOne.mockResolvedValue(
        coupon({ endsAt: new Date(Date.now() - 86_400_000) }),
      );
      await expect(service.preview(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('expired'),
        }),
      );
    });

    it('rejects baskets under the minimum order amount', async () => {
      db.coupon.findOne.mockResolvedValue(coupon({ minOrderAmount: 1000 }));
      const result = await service.preview(7, 'EID25', 500);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('1000');
    });

    it('rejects coupons that reached the global usage limit', async () => {
      db.coupon.findOne.mockResolvedValue(
        coupon({ usageLimit: 5, usedCount: 5 }),
      );
      await expect(service.preview(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('usage limit'),
        }),
      );
    });

    it('rejects a second use by the same customer', async () => {
      db.coupon.findOne.mockResolvedValue(coupon({ perUserLimit: 1 }));
      db.couponHistoryLog.count.mockResolvedValue(1);
      await expect(service.preview(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({
          valid: false,
          message: expect.stringContaining('already used'),
        }),
      );
    });

    it('skips the per-customer limit for guests', async () => {
      db.coupon.findOne.mockResolvedValue(coupon({ perUserLimit: 1 }));
      const result = await service.preview(null, 'EID25', 2000);
      expect(result.valid).toBe(true);
      expect(db.couponHistoryLog.count).not.toHaveBeenCalled();
    });
  });

  describe('require', () => {
    it('throws with the failure reason', async () => {
      db.coupon.findOne.mockResolvedValue(coupon({ minOrderAmount: 5000 }));
      await expect(service.require(7, 'EID25', 1000)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('returns the discount when valid', async () => {
      await expect(service.require(7, 'EID25', 2000)).resolves.toEqual(
        expect.objectContaining({ valid: true, discountAmount: 500 }),
      );
    });
  });

  describe('recordUse', () => {
    it('writes the history row and bumps the usage count', async () => {
      await service.recordUse(7, 1, 'EID25', 42, 500, 1500);
      expect(db.couponHistoryLog.save).toHaveBeenCalledWith(
        expect.objectContaining({
          couponId: 1,
          userId: 7,
          orderId: 42,
          couponCode: 'EID25',
          discountAmount: 500,
          orderTotal: 1500,
          creatorType: 'user',
        }),
      );
      expect(db.coupon.increment).toHaveBeenCalledWith(
        { id: 1 },
        'usedCount',
        1,
      );
    });
  });
});
