import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserCheckoutService } from './user-checkout.service';
import { DatabaseService } from '../../../database/database.service';
import { UserCouponService } from '../../../marketing/coupon/services/user-coupon.service';
import { UserPaymentGatewayService } from './user-payment-gateway.service';
import { DeliveryType, PaymentMethod } from '../../../database/enums/enums';

const USER = {
  sub: 'u@test.dev',
  id: 7,
  type: 'user' as const,
  role: null,
  userName: 'Rafi',
};

function sku(partial: Record<string, unknown> = {}) {
  return {
    id: 11,
    sku: 'SKU-M',
    price: 1000,
    discountedPrice: null,
    discountedPriceStartDate: null,
    discountedPriceEndDate: null,
    quantity: 10,
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

function cartLine(partial: Record<string, unknown> = {}) {
  return {
    id: 1,
    cartId: 3,
    productId: 8,
    productSKUId: 11,
    quantity: 2,
    unitPrice: 1000,
    unitDiscountedPrice: 1000,
    ...partial,
  };
}

describe('UserCheckoutService (totals + atomic order placement)', () => {
  let service: UserCheckoutService;
  let db: Record<string, any>;
  let coupons: { preview: jest.Mock; require: jest.Mock };

  beforeEach(async () => {
    coupons = {
      preview: jest.fn(async () => ({
        valid: true,
        code: 'EID25',
        type: 'percent',
        discountAmount: 200,
      })),
      require: jest.fn(async () => ({
        valid: true,
        code: 'EID25',
        type: 'percent',
        discountAmount: 200,
      })),
    };

    const saved: any[] = [];
    const manager = {
      create: jest.fn((entity: any, row: any) => ({ entity, ...row })),
      save: jest.fn(async (row: any) => {
        const withId = { id: row.id ?? saved.length + 1, ...row };
        saved.push(withId);
        return withId;
      }),
      findOne: jest.fn(async () => null),
      increment: jest.fn(async () => ({ affected: 1 })),
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
      cart: {
        findOne: jest.fn(async () => ({ id: 3, userId: 7, items: [] })),
        remove: jest.fn(async () => ({})),
      },
      cartItem: {
        find: jest.fn(async () => [
          cartLine({
            product: {
              id: 8,
              name: 'Shirt',
              slug: 'shirt',
              thumbnailUrl: null,
              isPublished: true,
              isActive: true,
            },
            sku: sku(),
          }),
        ]),
        delete: jest.fn(async () => ({})),
      },
      address: { findOne: jest.fn(async () => null) },
      shippingZone: {
        findOne: jest.fn(async () => ({
          name: 'Inside Dhaka',
          code: DeliveryType.INSIDE_DHAKA,
          charge: 60,
          estimatedDays: 2,
          isActive: true,
        })),
      },
      coupon: { findOne: jest.fn(async () => ({ id: 1, code: 'EID25' })) },
      transaction: jest.fn(async (run: any) => run(manager)),
    };
    (db as any).__saved = saved;
    (db as any).__manager = manager;

    // No gateway in the payload by default -> the built-in methods are used.
    const gateways = {
      resolve: jest.fn(async () => {
        throw new Error('resolve() must not be called without a gateway id');
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserCheckoutService,
        { provide: DatabaseService, useValue: db },
        { provide: UserCouponService, useValue: coupons },
        { provide: UserPaymentGatewayService, useValue: gateways },
      ],
    }).compile();
    service = module.get(UserCheckoutService);
  });

  describe('preview', () => {
    const dto = {
      recipientName: 'Rafi',
      phone: '01712345678',
      address: 'House 12, Dhanmondi',
      deliveryType: DeliveryType.INSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
    };

    it('computes subtotal, delivery charge and total from live SKUs', async () => {
      const result = await service.preview(USER, dto);
      expect(result.totals).toEqual({
        itemCount: 2,
        listTotal: 2000,
        subtotal: 2000,
        deliveryCharge: 60,
        discountAmount: 0,
        total: 2060,
      });
      expect(result.delivery).toEqual(
        expect.objectContaining({ charge: 60, estimatedDays: 2 }),
      );
    });

    it('uses the inline address when no addressId is given', async () => {
      const result = await service.preview(USER, dto);
      expect(result.address).toEqual(
        expect.objectContaining({
          recipientName: 'Rafi',
          phone: '01712345678',
        }),
      );
    });

    it('requires a complete address', async () => {
      await expect(
        service.preview(USER, { ...dto, recipientName: undefined }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an address that belongs to someone else', async () => {
      await expect(
        service.preview(USER, { ...dto, addressId: 5 }),
      ).rejects.toThrow(/Address not found/i);
    });

    it('applies a valid coupon to the preview', async () => {
      const result = await service.preview(USER, {
        ...dto,
        couponCode: 'eid25',
      });
      expect(coupons.preview).toHaveBeenCalledWith(7, 'eid25', 2000);
      expect(result.totals.discountAmount).toBe(200);
      expect(result.totals.total).toBe(1860);
    });

    it('ignores an invalid coupon in the preview (shows it, keeps total)', async () => {
      coupons.preview.mockResolvedValue({
        valid: false,
        code: 'EID25',
        discountAmount: 0,
        message: 'expired',
      });
      const result = await service.preview(USER, {
        ...dto,
        couponCode: 'EID25',
      });
      expect(result.coupon).toEqual(expect.objectContaining({ valid: false }));
      expect(result.totals.total).toBe(2060);
    });

    it('refuses to preview an empty cart', async () => {
      db.cart.findOne.mockResolvedValue(null);
      await expect(service.preview(USER, dto)).rejects.toThrow(
        /cart is empty/i,
      );
    });

    it('refuses when stock dropped below the cart quantity', async () => {
      db.cartItem.find.mockResolvedValue([
        cartLine({
          quantity: 5,
          product: {
            id: 8,
            name: 'Shirt',
            slug: 'shirt',
            thumbnailUrl: null,
            isPublished: true,
            isActive: true,
          },
          sku: sku({ quantity: 2 }),
        }),
      ]);
      await expect(service.preview(USER, dto)).rejects.toThrow(/Only 2 left/i);
    });

    it('refuses when the product was unpublished after adding', async () => {
      db.cartItem.find.mockResolvedValue([
        cartLine({
          product: {
            id: 8,
            name: 'Shirt',
            slug: 'shirt',
            thumbnailUrl: null,
            isPublished: false,
            isActive: true,
          },
          sku: sku(),
        }),
      ]);
      await expect(service.preview(USER, dto)).rejects.toThrow(
        /no longer available/i,
      );
    });
  });

  describe('place', () => {
    const dto = {
      recipientName: 'Rafi',
      phone: '01712345678',
      address: 'House 12, Dhanmondi',
      deliveryType: DeliveryType.INSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
    };

    it('writes the order, items, address, payment and history in one transaction', async () => {
      const { id } = await service.place(USER, dto);
      const manager = (db as any).__manager;
      const saved = (db as any).__saved;
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(id).toBeTruthy();

      const entities = saved.map((row: any) => row.entity?.name);
      expect(entities).toEqual(
        expect.arrayContaining([
          'Order',
          'OrderItem',
          'OrderAddress',
          'Payment',
          'OrderStatusHistory',
        ]),
      );

      const order = saved.find((row: any) => row.entity?.name === 'Order');
      expect(order).toEqual(
        expect.objectContaining({
          userId: 7,
          status: 'pending',
          deliveryType: DeliveryType.INSIDE_DHAKA,
          subtotal: 2000,
          deliveryCharge: 60,
          discountAmount: 0,
          total: 2060,
          paymentMethod: PaymentMethod.COD,
          creatorType: 'user',
        }),
      );
      expect(order.orderNumber).toMatch(/^JAB-\d{6}-[0-9A-F]{4}$/);

      const item = saved.find((row: any) => row.entity?.name === 'OrderItem');
      expect(item).toEqual(
        expect.objectContaining({
          productName: 'Shirt',
          quantity: 2,
          unitPrice: 1000,
          totalPrice: 2000,
        }),
      );
      expect(JSON.parse(item.skuData)).toEqual([
        { attribute: 'Size', value: 'M' },
      ]);

      const payment = saved.find((row: any) => row.entity?.name === 'Payment');
      expect(payment).toEqual(
        expect.objectContaining({
          method: PaymentMethod.COD,
          status: 'pending',
          amount: 2060,
        }),
      );
      expect(manager.createQueryBuilder).toHaveBeenCalled();
    });

    it('records coupon usage and bumps the coupon count', async () => {
      await service.place(USER, { ...dto, couponCode: 'EID25' });
      const saved = (db as any).__saved;
      const log = saved.find(
        (row: any) => row.entity?.name === 'CouponHistoryLog',
      );
      expect(log).toEqual(
        expect.objectContaining({
          couponId: 1,
          couponCode: 'EID25',
          discountAmount: 200,
          orderTotal: 1860,
        }),
      );
      expect((db as any).__manager.increment).toHaveBeenCalledWith(
        expect.anything(),
        { id: 1 },
        'usedCount',
        1,
      );
    });

    it('empties the cart only after a successful write', async () => {
      await service.place(USER, dto);
      expect(db.cartItem.delete).toHaveBeenCalledWith({ cartId: 3 });
      expect(db.cart.remove).toHaveBeenCalled();
    });

    it('keeps the cart when the transaction fails', async () => {
      db.transaction.mockRejectedValueOnce(new Error('boom'));
      await expect(service.place(USER, dto)).rejects.toThrow('boom');
      expect(db.cartItem.delete).not.toHaveBeenCalled();
    });

    it('requires a transaction reference for online payments', async () => {
      await expect(
        service.place(USER, { ...dto, paymentMethod: PaymentMethod.BKASH }),
      ).rejects.toThrow(/transaction reference/i);
      await expect(
        service.place(USER, {
          ...dto,
          paymentMethod: PaymentMethod.BKASH,
          transactionId: '9ABC123',
        }),
      ).resolves.toEqual({ id: expect.any(Number) });
    });

    it('surfaces the out-of-stock failure from the guarded decrement', async () => {
      (db as any).__manager.createQueryBuilder = jest.fn(() => ({
        update: () => ({
          set: () => ({
            where: () => ({
              andWhere: () => ({ execute: async () => ({ affected: 0 }) }),
            }),
          }),
        }),
      }));
      await expect(service.place(USER, dto)).rejects.toThrow(/out of stock/i);
      expect(db.cartItem.delete).not.toHaveBeenCalled();
    });
  });
});
