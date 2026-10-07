import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminCouponService } from './admin-coupon.service';
import { DatabaseService } from '../../../database/database.service';
import {
  buildPagination,
  getPaginateData,
  type Pagination,
} from '../../../common/decorators/pagination-params';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';

const admin: JwtPayload = {
  id: 3,
  sub: 'promo@jabaib.test',
  type: 'admin',
  role: 'editor',
  userName: 'Promo Editor',
};

const pagination: Pagination = buildPagination('0', '10');

/**
 * Chainable query-builder stub: every builder method returns the chain until
 * a terminal call (getManyAndCount / getOne) resolves.
 */
function qbChain(overrides: Record<string, jest.Mock> = {}) {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'where',
    'andWhere',
    'leftJoinAndSelect',
  ]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.getManyAndCount = jest.fn(async () => [[], 0]);
  chain.getOne = jest.fn(async () => null);
  Object.assign(chain, overrides);
  return chain;
}

describe('AdminCouponService (coupon validation + audit)', () => {
  let service: AdminCouponService;
  let db: {
    coupon: {
      create: jest.Mock;
      save: jest.Mock;
      softRemove: jest.Mock;
      findOne: jest.Mock;
      find: jest.Mock;
      createQueryBuilder: jest.Mock;
    };
    couponHistoryLog: { find: jest.Mock; createQueryBuilder: jest.Mock };
  };

  beforeEach(async () => {
    db = {
      coupon: {
        create: jest.fn((row) => ({ ...row })),
        save: jest.fn((row) => Promise.resolve(row)),
        softRemove: jest.fn((row) => Promise.resolve(row)),
        findOne: jest.fn(),
        find: jest.fn(() => Promise.resolve([])),
        createQueryBuilder: jest.fn(() => qbChain()),
      },
      couponHistoryLog: {
        find: jest.fn(() => Promise.resolve([])),
        createQueryBuilder: jest.fn(() => qbChain()),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminCouponService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(AdminCouponService);
  });

  describe('list (date-window validation)', () => {
    it('rejects startDate after endDate (400)', async () => {
      const qb = qbChain();
      db.coupon.createQueryBuilder.mockReturnValue(qb);
      await expect(
        service.list(pagination, {
          startDate: '2026-12-31',
          endDate: '2026-01-01',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(qb.getManyAndCount).not.toHaveBeenCalled();
    });

    it('rejects a non-date startDate (400)', async () => {
      const qb = qbChain();
      db.coupon.createQueryBuilder.mockReturnValue(qb);
      await expect(
        service.list(pagination, { startDate: 'not-a-date' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a valid window and constrains the query', async () => {
      const qb = qbChain();
      db.coupon.createQueryBuilder.mockReturnValue(qb);
      const result = await service.list(pagination, {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        isActive: 'true',
      });
      // Date-only endDate is span-adjusted to cover the full final day.
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          start: new Date('2026-10-01T00:00:00.000Z'),
        }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ end: new Date('2026-10-31T23:59:59.999Z') }),
      );
      expect(qb.getManyAndCount).toHaveBeenCalledTimes(1);
      expect(result).toEqual(getPaginateData([], 0, pagination));
    });
  });

  describe('create (defaults + normalization + creator audit)', () => {
    it('normalizes code, applies defaults and creator fields', async () => {
      const coupon = await service.create(
        { code: '  shop  10  ', type: 'flat', amount: 10 },
        admin,
      );
      expect(coupon).toEqual(
        expect.objectContaining({
          code: 'SHOP10',
          minOrderAmount: 0,
          usageLimit: 0,
          perUserLimit: 1,
          createdBy: 3,
          creatorType: 'admin',
          creatorName: 'Promo Editor',
        }),
      );
      expect(db.coupon.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a duplicate code after normalizing (400)', async () => {
      db.coupon.createQueryBuilder.mockReturnValue(
        qbChain({ getOne: jest.fn(async () => ({ id: 5, code: 'SHOP10' })) }),
      );
      await expect(
        service.create({ code: 'shop10', type: 'percent', amount: 10 }, admin),
      ).rejects.toThrow(BadRequestException);
      expect(db.coupon.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('re-normalizes a changed code, parses dates and stamps updater fields', async () => {
      const existing = {
        id: 1,
        code: 'OLD',
        startsAt: null,
        endsAt: null,
      };
      db.coupon.findOne.mockResolvedValue(existing);
      db.coupon.save.mockImplementation(async (row) => row);

      await service.update(
        1,
        { code: ' new code ', endsAt: '2026-12-31', isActive: false },
        admin,
      );

      expect(existing.code).toBe('NEWCODE');
      expect(existing.endsAt).toEqual(new Date('2026-12-31'));
      expect(db.coupon.save).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedBy: 3,
          updaterType: 'admin',
          updaterName: 'Promo Editor',
        }),
      );
    });

    it('throws 404 for missing coupon', async () => {
      db.coupon.findOne.mockResolvedValue(null);
      await expect(
        service.update(1, { isActive: false }, admin),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
