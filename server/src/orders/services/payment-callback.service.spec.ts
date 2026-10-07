import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentCallbackService } from './payment-callback.service';
import { DatabaseService } from '../../database/database.service';
import { PaymentMethod } from '../../database/enums/enums';

function order(partial: Record<string, unknown> = {}) {
  return {
    id: 6,
    paymentMethod: PaymentMethod.BKASH,
    paymentStatus: 'pending',
    total: 1572,
    ...partial,
  };
}

describe('PaymentCallbackService (gateway callbacks)', () => {
  let service: PaymentCallbackService;
  let db: Record<string, any>;

  beforeEach(async () => {
    db = {
      order: {
        findOne: jest.fn(async () => order()),
        save: jest.fn(async (row: any) => row),
      },
      payment: {
        findOne: jest.fn(async () => null),
        create: jest.fn((row: any) => ({ ...row })),
        save: jest.fn(async (row: any) => ({ id: 7, ...row })),
      },
    };
    const module = await Test.createTestingModule({
      providers: [
        PaymentCallbackService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get(PaymentCallbackService);
  });

  it('marks a matching callback as paid and stamps the audit fields', async () => {
    const payment = await service.handle(PaymentMethod.BKASH, {
      orderId: 6,
      transactionId: 'TX-1',
      status: 'success',
    });
    expect(payment).toEqual(
      expect.objectContaining({
        orderId: 6,
        method: PaymentMethod.BKASH,
        status: 'paid',
        amount: 1572,
        transactionId: 'TX-1',
        creatorType: 'gateway',
      }),
    );
    expect(payment.paidAt).toBeInstanceOf(Date);
    expect(db.order.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 6, paymentStatus: 'paid' }),
    );
  });

  it('records a failed callback without a paidAt stamp', async () => {
    db.order.findOne.mockResolvedValue(
      order({ paymentMethod: PaymentMethod.NAGAD }),
    );
    const payment = await service.handle(PaymentMethod.NAGAD, {
      orderId: 6,
      transactionId: 'TX-2',
      status: 'failed',
    });
    expect(payment).toEqual(
      expect.objectContaining({ status: 'failed', paidAt: undefined }),
    );
    expect(db.order.save).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'failed' }),
    );
  });

  it('404s for an unknown order', async () => {
    db.order.findOne.mockResolvedValue(null);
    await expect(
      service.handle(PaymentMethod.BKASH, {
        orderId: 1,
        transactionId: 'TX',
        status: 'success',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a callback whose provider does not match the order', async () => {
    await expect(
      service.handle(PaymentMethod.CARD, {
        orderId: 6,
        transactionId: 'TX',
        status: 'success',
      }),
    ).rejects.toThrow(/was not placed with card/i);
    expect(db.payment.save).not.toHaveBeenCalled();
  });

  it('rejects an amount that does not match the order total', async () => {
    await expect(
      service.handle(PaymentMethod.BKASH, {
        orderId: 6,
        transactionId: 'TX',
        status: 'success',
        amount: 10,
      }),
    ).rejects.toThrow(/does not match order total/i);
    expect(db.payment.save).not.toHaveBeenCalled();
  });

  it('is idempotent when the same reference is replayed', async () => {
    db.order.findOne.mockResolvedValue(order({ paymentStatus: 'paid' }));
    db.payment.findOne.mockResolvedValue({ id: 7, transactionId: 'TX-1' });
    await expect(
      service.handle(PaymentMethod.BKASH, {
        orderId: 6,
        transactionId: 'TX-1',
        status: 'success',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 7 }));
    expect(db.payment.save).not.toHaveBeenCalled();
  });

  it('refuses a different reference against an already paid order', async () => {
    db.order.findOne.mockResolvedValue(order({ paymentStatus: 'paid' }));
    db.payment.findOne.mockResolvedValue(null);
    await expect(
      service.handle(PaymentMethod.BKASH, {
        orderId: 6,
        transactionId: 'TX-OTHER',
        status: 'success',
      }),
    ).rejects.toThrow(/already paid/i);
    expect(db.payment.save).not.toHaveBeenCalled();
  });

  it('keeps the provider payload for auditing', async () => {
    await service.handle(PaymentMethod.BKASH, {
      orderId: 6,
      transactionId: 'TX-3',
      status: 'success',
      raw: { gatewayStatus: 'COMPLETED' },
    });
    expect(db.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        providerResponse: { gatewayStatus: 'COMPLETED' },
      }),
    );
  });
});
