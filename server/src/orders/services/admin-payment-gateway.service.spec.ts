import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AdminPaymentGatewayService } from './admin-payment-gateway.service';
import { DatabaseService } from '../../database/database.service';
import { FileHandleService } from '../../file/services/file-handle.service';
import { PaymentGatewayType, PaymentMethod } from '../../database/enums/enums';

const USER = { id: 1, sub: 1, type: 'admin', role: 'super_admin' };

function gateway(partial: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: 'bKash',
    nameBN: 'বিকাশ',
    slug: 'bkash',
    type: PaymentGatewayType.MFS,
    isManual: true,
    provider: null,
    description: '',
    iconUrl: '',
    iconPath: '',
    isActive: true,
    accountName: 'Jabaib',
    accountNumber: '01700000000',
    bankName: '',
    branchName: '',
    ...partial,
  };
}

describe('AdminPaymentGatewayService', () => {
  let service: AdminPaymentGatewayService;
  let db: Record<string, any>;
  let fileHandle: Record<string, jest.Mock>;

  beforeEach(async () => {
    db = {
      paymentGateway: {
        findOne: jest.fn(async () => null),
        create: jest.fn((row: any) => row),
        save: jest.fn(async (row: any) => ({ id: 5, ...row })),
        softRemove: jest.fn(async () => undefined),
      },
    };
    fileHandle = {
      uploadFile: jest.fn(async () => ({ url: '/u.png', path: 'jabaib/payment-gateway/u.png' })),
      removeIfExists: jest.fn(),
      belongsTo: jest.fn(() => true),
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminPaymentGatewayService,
        { provide: DatabaseService, useValue: db },
        { provide: FileHandleService, useValue: fileHandle },
      ],
    }).compile();
    service = module.get(AdminPaymentGatewayService);
  });

  describe('create', () => {
    it('generates the slug from the name and stamps the creator', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      await service.create(
        {
          name: 'Rocket Mobile Financial',
          nameBN: 'রকেট',
          type: PaymentGatewayType.MFS,
          isManual: true,
          accountName: 'Jabaib',
          accountNumber: '01700000000',
        } as never,
        USER as never,
      );
      expect(db.paymentGateway.save).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'rocket-mobile-financial',
          isActive: true,
          createdBy: 1,
          creatorType: 'admin',
        }),
      );
    });

    it('ignores a slug sent by the client', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      const saved = await service.create({
        name: 'Nagad',
        nameBN: 'নগদ',
        type: PaymentGatewayType.MFS,
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
        slug: 'hacked',
      } as never);
      expect(saved.slug).toBe('nagad');
    });

    it('suffixes the slug until it is unique', async () => {
      db.paymentGateway.findOne
        .mockResolvedValueOnce(gateway({ id: 9 }))
        .mockResolvedValueOnce(null);
      const saved = await service.create({
        name: 'bKash',
        nameBN: 'বিকাশ',
        type: PaymentGatewayType.MFS,
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
      } as never);
      expect(saved.slug).toBe('bkash-2');
    });

    it('rejects a manual MFS gateway without account details', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          name: 'bKash',
          nameBN: 'বিকাশ',
          type: PaymentGatewayType.MFS,
          isManual: true,
          accountName: 'Jabaib',
        } as never),
      ).rejects.toThrow(/accountNumber is required/i);
    });

    it('rejects a manual bank gateway without bank and branch', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      await expect(
        service.create({
          name: 'DBBL',
          nameBN: 'ডিবিবিএল',
          type: PaymentGatewayType.BANK,
          isManual: true,
          accountName: 'Jabaib',
          accountNumber: '01700000000',
        } as never),
      ).rejects.toThrow(/bankName, branchName are required/i);
    });

    it('does not require account details for an automated gateway', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      const saved = await service.create({
        name: 'Card',
        nameBN: 'কার্ড',
        type: PaymentGatewayType.MFS,
        isManual: false,
        provider: PaymentMethod.CARD,
      } as never);
      expect(saved).toEqual(expect.objectContaining({ slug: 'card' }));
    });

    it('sanitizes the rich-text description on the way in', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      const saved = await service.create({
        name: 'bKash',
        nameBN: 'বিকাশ',
        type: PaymentGatewayType.MFS,
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
        description:
          '<p>Send to <strong>01700000000</strong></p><script>alert(1)</script>',
      } as never);
      expect(saved.description).toBe('<p>Send to <strong>01700000000</strong></p>');
    });

    it('clears the account fields when a gateway stops being manual', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      const saved = await service.create({
        name: 'Card',
        nameBN: 'কার্ড',
        type: PaymentGatewayType.MFS,
        isManual: false,
        provider: PaymentMethod.CARD,
        accountName: 'leftover',
        accountNumber: 'leftover',
      } as never);
      expect(saved).toEqual(
        expect.objectContaining({ accountName: '', accountNumber: '' }),
      );
    });
  });

  describe('update', () => {
    it('404s for an unknown gateway', async () => {
      db.paymentGateway.findOne.mockResolvedValue(null);
      await expect(service.update(99, { isActive: false })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('re-checks the merged row when the type changes to bank', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway());
      await expect(
        service.update(5, { type: PaymentGatewayType.BANK }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a type change once the bank details arrive', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway());
      const saved = await service.update(5, {
        type: PaymentGatewayType.BANK,
        bankName: 'DBBL',
        branchName: 'Dhanmondi',
      });
      expect(saved).toEqual(
        expect.objectContaining({ type: 'bank', bankName: 'DBBL' }),
      );
    });

    it('renames the slug when the name changes', async () => {
      db.paymentGateway.findOne
        .mockResolvedValueOnce(gateway())
        .mockResolvedValueOnce(null);
      const saved = await service.update(5, { name: 'bKash Wallet' });
      expect(saved.slug).toBe('bkash-wallet');
    });

    it('leaves the slug alone when the name is unchanged', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway());
      const saved = await service.update(5, { name: 'bKash', isActive: false });
      expect(saved.slug).toBe('bkash');
    });

    it('deletes the icon it replaced', async () => {
      db.paymentGateway.findOne.mockResolvedValue(
        gateway({ iconPath: 'jabaib/payment-gateway/old.png' }),
      );
      await service.update(5, {
        iconUrl: '/new.png',
        iconPath: 'jabaib/payment-gateway/new.png',
      });
      expect(fileHandle.removeIfExists).toHaveBeenCalledWith(
        'jabaib/payment-gateway/old.png',
      );
    });
  });

  describe('remove', () => {
    it('soft removes the row', async () => {
      db.paymentGateway.findOne.mockResolvedValue(gateway());
      await service.remove(5);
      expect(db.paymentGateway.softRemove).toHaveBeenCalled();
    });
  });

  describe('icons', () => {
    it('uploads into the payment-gateway folder', async () => {
      const file = { originalname: 'i.png' } as Express.Multer.File;
      await service.uploadIcon(file);
      expect(fileHandle.uploadFile).toHaveBeenCalledWith(
        file,
        'payment-gateway',
      );
    });

    it('clears the fields and removes the file', async () => {
      db.paymentGateway.findOne.mockResolvedValue(
        gateway({ iconPath: 'jabaib/payment-gateway/i.png' }),
      );
      const saved = await service.removeIcon(5, USER as never);
      expect(saved).toEqual(expect.objectContaining({ iconPath: '' }));
      expect(fileHandle.removeIfExists).toHaveBeenCalledWith(
        'jabaib/payment-gateway/i.png',
      );
    });
  });
});