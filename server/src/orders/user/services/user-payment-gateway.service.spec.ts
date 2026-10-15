import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserPaymentGatewayService } from './user-payment-gateway.service';
import { DatabaseService } from '../../../database/database.service';
import { PaymentGatewayType, PaymentMethod } from '../../../database/enums/enums';

function gateway(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: 'bKash',
    nameBN: 'বিকাশ',
    slug: 'bkash',
    type: PaymentGatewayType.MFS,
    isManual: true,
    provider: null,
    description: '<p>Send money</p>',
    iconUrl: '/icon.png',
    isActive: true,
    accountName: 'Jabaib',
    accountNumber: '01700000000',
    bankName: '',
    branchName: '',
    ...partial,
  };
}

describe('UserPaymentGatewayService', () => {
  let service: UserPaymentGatewayService;
  let db: Record<string, any>;

  beforeEach(async () => {
    db = { paymentGateway: { find: jest.fn(async () => []), findOne: jest.fn(async () => null) } };
    const module = await Test.createTestingModule({
      providers: [
        UserPaymentGatewayService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(UserPaymentGatewayService);
  });

  describe('listActive', () => {
    it('queries only active gateways', async () => {
      await service.listActive();
      expect(db.paymentGateway.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { id: 'ASC' },
      });
    });

    it('describes what a manual customer must submit', async () => {
      db.paymentGateway.find.mockResolvedValue([gateway()]);
      const [view] = await service.listActive();
      expect(view).toEqual(
        expect.objectContaining({
          id: 1,
          slug: 'bkash',
          type: 'mfs',
          isManual: true,
          description: '<p>Send money</p>',
          accountName: 'Jabaib',
          accountNumber: '01700000000',
          fields: [expect.objectContaining({ key: 'txnId' })],
        }),
      );
    });

    it('never leaks bank fields or the input spec for an automated gateway', async () => {
      db.paymentGateway.find.mockResolvedValue([
        gateway({ isManual: false, provider: PaymentMethod.BKASH, accountName: 'Jabaib' }),
      ]);
      const [view] = await service.listActive();
      expect(view.accountName).toBe('');
      expect(view.fields).toEqual([]);
      // the provider binding is server-side only
      expect(view).not.toHaveProperty('provider');
    });

    it('returns an empty list when nothing is configured', async () => {
      expect(await service.listActive()).toEqual([]);
    });
  });

  describe('resolve', () => {
    it('404s for an unknown gateway', async () => {
      await expect(service.resolve(99, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('404s for a soft-deleted gateway', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway({ deletedAt: new Date() }));
      await expect(service.resolve(1, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses an inactive gateway', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway({ isActive: false }));
      await expect(service.resolve(1, { txnId: 'T' })).rejects.toThrow(
        /not available/i,
      );
    });

    it('records a manual MFS payment under the gateway slug', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway());
      expect(await service.resolve(1, { txnId: 'TXN9' })).toEqual(
        expect.objectContaining({
          paymentMethod: 'bkash',
          paymentMetaData: { txnId: 'TXN9' },
        }),
      );
    });

    it('validates the bank fields for a manual bank gateway', async () => {
      db.paymentGateway.findOne.mockResolvedValue(
        gateway({ type: PaymentGatewayType.BANK, slug: 'dbbl' }),
      );
      await expect(service.resolve(1, { accountName: 'x' })).rejects.toThrow(
        BadRequestException,
      );
      expect(
        await service.resolve(1, {
          accountName: 'Jabaib',
          accountNumber: '1700000000',
          bankName: 'DBBL',
          branchName: 'Dhanmondi',
        }),
      ).toEqual(
        expect.objectContaining({
          paymentMethod: 'dbbl',
          paymentMetaData: expect.objectContaining({ bankName: 'DBBL' }),
        }),
      );
    });

    it('settles an automated gateway through its provider', async () => {
      db.paymentGateway.findOne.mockResolvedValue(
        gateway({ isManual: false, provider: PaymentMethod.NAGAD }),
      );
      expect(await service.resolve(1, undefined)).toEqual(
        expect.objectContaining({
          paymentMethod: 'nagad',
          paymentMetaData: null,
        }),
      );
    });

    it('refuses an automated gateway with no provider bound', async () => {
      db.paymentGateway.findOne.mockResolvedValue(
        gateway({ isManual: false, provider: null }),
      );
      await expect(service.resolve(1, undefined)).rejects.toThrow(
        /no automated provider/i,
      );
    });
  });
});