import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { skuLabel } from '../../../catalog/utils/sku-label';
import { CartItem } from '../../../database/entities/cart-item.entity';
import { Coupon } from '../../../database/entities/coupon.entity';
import { CouponHistoryLog } from '../../../database/entities/coupon-history-log.entity';
import { Order } from '../../../database/entities/order.entity';
import { OrderAddress } from '../../../database/entities/order-address.entity';
import { OrderItem } from '../../../database/entities/order-item.entity';
import { OrderStatusHistory } from '../../../database/entities/order-status-history.entity';
import { Payment } from '../../../database/entities/payment.entity';
import { ProductSKU } from '../../../database/entities/product-sku.entity';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../database/enums/enums';
import { effectiveSkuPrice } from '../../../catalog/user/utils/product-summary';
import { UserCouponService } from '../../../marketing/coupon/services/user-coupon.service';
import { UserPaymentGatewayService } from './user-payment-gateway.service';
import { manualPaymentReference } from '../../utils/payment-gateway.util';
import { CheckoutDto } from '../dtos/user-order.dto';

interface PricedLine {
  cartItem: CartItem;
  productId: number;
  productSKUId: number;
  name: string;
  skuData: string;
  quantity: number;
  unitPrice: number;
  unitDiscountedPrice: number;
  totalPrice: number;
  totalDiscountedPrice: number;
  stock: number;
}

/**
 * Checkout maths and order placement.
 *
 * Everything is recomputed from the database on the way in: the cart only holds
 * a price snapshot, so stock, sale prices, shipping and coupon rules are all
 * re-checked before an order exists. Placing an order writes the order, its
 * items, the address snapshot, the payment row, the coupon usage (+ usage count)
 * and the first status-history row in a single transaction, and only then
 * decrements stock and empties the cart.
 */
@Injectable()
export class UserCheckoutService {
  constructor(
    private readonly database: DatabaseService,
    private readonly coupons: UserCouponService,
    private readonly gateways: UserPaymentGatewayService,
  ) {}

  // ---------------------------------------------------------------- preview --

  async preview(user: JwtPayload, dto: CheckoutDto) {
    const lines = await this.pricedLines(user.id);
    if (!lines.length) throw new BadRequestException('Your cart is empty');

    const address = await this.resolveAddress(user.id, dto);
    const shipping = await this.shippingFor(dto.deliveryType);

    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.totalDiscountedPrice, 0),
    );
    const listTotal = round2(lines.reduce((sum, l) => sum + l.totalPrice, 0));

    const coupon = dto.couponCode
      ? await this.coupons.preview(user.id, dto.couponCode, subtotal)
      : null;
    const discountAmount = coupon?.valid ? coupon.discountAmount : 0;
    const deliveryCharge = Number(shipping?.charge ?? 0);

    // Same resolution the place-order path uses, so the summary a customer sees
    // is the one the order will actually be written with.
    const payment = await this.resolvePayment(dto);

    return {
      items: lines.map((l) => this.lineView(l)),
      payment,
      address,
      delivery: {
        type: dto.deliveryType,
        label: shipping?.name ?? dto.deliveryType,
        charge: deliveryCharge,
        estimatedDays: shipping?.estimatedDays ?? null,
      },
      coupon,
      totals: {
        itemCount: lines.reduce((n, l) => n + l.quantity, 0),
        listTotal,
        subtotal,
        deliveryCharge,
        discountAmount,
        total: round2(subtotal + deliveryCharge - discountAmount),
      },
    };
  }

  /**
   * Turn the checkout payload into the payment we will actually record.
   *
   * - With `paymentGatewayId`: an active gateway decides the method. A manual
   *   gateway is stored under its own slug with the customer's submitted proof in
   *   `metaData`; an automated one reuses its provider and the existing
   *   gateway-callback settlement.
   * - Without it: the built-in methods (cod/bkash/nagad/card) behave exactly as
   *   before — including requiring a reference for every non-COD method.
   */
  private async resolvePayment(dto: CheckoutDto): Promise<{
    method: string;
    metaData: Record<string, string> | null;
    transactionId?: string;
  }> {
    if (dto.paymentGatewayId) {
      const resolved = await this.gateways.resolve(
        dto.paymentGatewayId,
        dto.paymentMetaData,
      );
      const metaData = resolved.paymentMetaData;
      if (resolved.gateway.isManual) {
        return {
          method: resolved.paymentMethod,
          metaData,
          transactionId:
            manualPaymentReference(resolved.gateway.type, metaData ?? {}),
        };
      }
      // Automated: still a manual reference from the customer until the
      // provider callback confirms it, same as bkash/nagad/card today.
      if (!dto.transactionId?.trim()) {
        throw new BadRequestException(
          'Enter the transaction reference for this payment method',
        );
      }
      return {
        method: resolved.paymentMethod,
        metaData: null,
        transactionId: dto.transactionId.trim(),
      };
    }

    if (dto.paymentMethod !== PaymentMethod.COD && !dto.transactionId?.trim()) {
      throw new BadRequestException(
        'Enter the transaction reference for this payment method',
      );
    }
    return {
      method: dto.paymentMethod,
      metaData: null,
      transactionId: dto.transactionId?.trim() || undefined,
    };
  }

  // ----------------------------------------------------------- place order --

  async place(user: JwtPayload, dto: CheckoutDto) {
    // Validate before opening the transaction: address, shipping, coupon and
    // cart contents all need reads that should not happen mid-write.
    const lines = await this.pricedLines(user.id);
    if (!lines.length) throw new BadRequestException('Your cart is empty');
    const address = await this.resolveAddress(user.id, dto);
    const shipping = await this.shippingFor(dto.deliveryType);

    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.totalDiscountedPrice, 0),
    );
    const couponCheck = dto.couponCode
      ? await this.coupons.require(user.id, dto.couponCode, subtotal)
      : null;
    const couponRow = couponCheck
      ? await this.database.coupon.findOne({
          where: { code: couponCheck.code },
        })
      : null;

    const deliveryCharge = Number(shipping?.charge ?? 0);
    const discountAmount = couponCheck?.discountAmount ?? 0;
    const total = round2(subtotal + deliveryCharge - discountAmount);

    const payment = await this.resolvePayment(dto);

    const cart = await this.database.cart.findOne({
      where: { userId: user.id },
    });

    const orderId = await this.database.transaction(async (manager) => {
      const orderNumber = await this.nextOrderNumber(manager);
      const order = await manager.save(
        manager.create(Order, {
          orderNumber,
          userId: user.id,
          status: OrderStatus.PENDING,
          deliveryType: dto.deliveryType,
          couponId: couponRow?.id,
          couponCode: couponRow?.code,
          subtotal,
          deliveryCharge,
          discountAmount,
          total,
          paymentMethod: payment.method,
          paymentStatus: PaymentStatus.PENDING,
          note: dto.note?.trim() || undefined,
          createdBy: user.id,
          creatorType: 'user',
        }),
      );

      for (const line of lines) {
        await manager.save(
          manager.create(OrderItem, {
            orderId: order.id,
            productId: line.productId,
            productSKUId: line.productSKUId,
            productName: line.name,
            skuData: line.skuData,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitDiscountedPricePrice: line.unitDiscountedPrice,
            totalPrice: line.totalPrice,
            totalDiscountedPrice: line.totalDiscountedPrice,
            createdBy: user.id,
            creatorType: 'user',
          }),
        );

        // Guarded stock decrement: only succeeds while stock remains.
        const result = await manager
          .createQueryBuilder()
          .update(ProductSKU)
          .set({ quantity: () => `"quantity" - ${line.quantity}` })
          .where('id = :id', { id: line.productSKUId })
          .andWhere('"quantity" >= :qty', { qty: line.quantity })
          .execute();
        if (!result.affected) {
          throw new BadRequestException(
            `"${line.name}" just went out of stock — please review your cart`,
          );
        }
      }

      await manager.save(
        manager.create(OrderAddress, {
          orderId: order.id,
          recipientName: address.recipientName,
          phone: address.phone,
          address: address.address,
          divisionId: address.divisionId,
          districtId: address.districtId,
          zipCode: address.zipCode,
          createdBy: user.id,
          creatorType: 'user',
        }),
      );

      await manager.save(
        manager.create(Payment, {
          orderId: order.id,
          method: payment.method,
          status: PaymentStatus.PENDING,
          amount: total,
          transactionId: payment.transactionId,
          // Manual proof (txnId / account details) submitted by the customer.
          metaData: payment.metaData ?? undefined,
          createdBy: user.id,
          creatorType: 'user',
        }),
      );

      await manager.save(
        manager.create(OrderStatusHistory, {
          orderId: order.id,
          status: OrderStatus.PENDING,
          note: 'Order placed',
          createdBy: user.id,
          creatorType: 'user',
        }),
      );

      if (couponRow && couponCheck) {
        await manager.save(
          manager.create(CouponHistoryLog, {
            couponId: couponRow.id,
            userId: user.id,
            orderId: order.id,
            couponCode: couponRow.code,
            discountAmount: couponCheck.discountAmount,
            orderTotal: total,
            createdBy: user.id,
            creatorType: 'user',
          }),
        );
        await manager.increment(Coupon, { id: couponRow.id }, 'usedCount', 1);
      }

      return order.id;
    });

    if (cart) {
      await this.database.cartItem.delete({ cartId: cart.id });
      await this.database.cart.remove(cart);
    }

    return { id: orderId };
  }

  // ----------------------------------------------------------------- helpers --

  /**
   * Cart lines re-priced from the live SKUs: sale windows may have opened or
   * closed since the item was added, and stock may have moved.
   */
  private async pricedLines(userId: number): Promise<PricedLine[]> {
    const cart = await this.database.cart.findOne({
      where: { userId },
      relations: { items: true },
    });
    if (!cart) return [];

    const items = await this.database.cartItem.find({
      where: { cartId: cart.id },
      relations: {
        product: true,
        sku: { skuVariants: { attribute: true, attributeValue: true } },
      },
      order: { id: 'ASC' },
    });

    const lines: PricedLine[] = [];
    for (const item of items) {
      const sku = item.sku;
      const product = item.product;
      if (
        !sku ||
        !sku.isActive ||
        !product ||
        !product.isPublished ||
        !product.isActive
      ) {
        throw new BadRequestException(
          `"${product?.name ?? 'An item'}" is no longer available — please remove it from your cart`,
        );
      }
      if (sku.quantity < item.quantity) {
        throw new BadRequestException(
          sku.quantity > 0
            ? `Only ${sku.quantity} left of "${product.name}" — please adjust the quantity`
            : `"${product.name}" just went out of stock — please remove it from your cart`,
        );
      }

      const unitPrice = Number(sku.price);
      const unitDiscountedPrice = effectiveSkuPrice(sku);
      lines.push({
        cartItem: item,
        productId: product.id,
        productSKUId: sku.id,
        name: product.name,
        skuData: JSON.stringify(
          (sku.skuVariants ?? []).map(
            (v: {
              attribute?: { name?: string } | null;
              attributeValue?: { name?: string } | null;
            }) => ({
              attribute: v.attribute?.name,
              value: v.attributeValue?.name,
            }),
          ),
        ),
        quantity: item.quantity,
        unitPrice,
        unitDiscountedPrice,
        totalPrice: round2(unitPrice * item.quantity),
        totalDiscountedPrice: round2(unitDiscountedPrice * item.quantity),
        stock: sku.quantity,
      });
    }
    return lines;
  }

  private lineView(line: PricedLine) {
    const product = line.cartItem.product;
    return {
      productId: line.productId,
      productSKUId: line.productSKUId,
      name: line.name,
      slug: product?.slug,
      image: product?.thumbnailUrl ?? null,
      skuLabel: skuLabel(line.cartItem.sku),
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unitDiscountedPrice: line.unitDiscountedPrice,
      totalPrice: line.totalPrice,
      totalDiscountedPrice: line.totalDiscountedPrice,
    };
  }

  /** Saved address (must belong to the caller) or the inline snapshot. */
  private async resolveAddress(userId: number, dto: CheckoutDto) {
    if (dto.addressId) {
      const saved = await this.database.address.findOne({
        where: { id: dto.addressId, userId },
      });
      if (!saved) throw new NotFoundException('Address not found');
      return {
        recipientName: saved.recipientName,
        phone: saved.phone,
        address: saved.address,
        divisionId: saved.divisionId,
        districtId: saved.districtId,
        zipCode: saved.zipCode,
      };
    }

    const recipientName = dto.recipientName?.trim();
    const phone = dto.phone?.trim();
    const address = dto.address?.trim();
    if (!recipientName || !phone || !address) {
      throw new BadRequestException(
        'Choose a saved address or provide recipient name, phone and address',
      );
    }
    return {
      recipientName,
      phone,
      address,
      divisionId: dto.divisionId,
      districtId: dto.districtId,
      zipCode: dto.zipCode?.trim(),
    };
  }

  private async shippingFor(deliveryType: DeliveryType) {
    const zone = await this.database.shippingZone.findOne({
      where: { code: deliveryType },
    });
    if (zone && !zone.isActive) {
      throw new BadRequestException(
        'Shipping to this delivery type is unavailable right now',
      );
    }
    return zone;
  }

  /** `JAB-<yymmdd>-<4 hex>`, retried until unused. */
  private async nextOrderNumber(manager: EntityManager): Promise<string> {
    const now = new Date();
    const stamp = [
      String(now.getFullYear()).slice(-2),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('');
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = `JAB-${stamp}-${randomBytes(2).toString('hex').toUpperCase()}`;
      const clash = await manager.findOne(Order, {
        where: { orderNumber: candidate },
      });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Could not allocate an order number');
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
