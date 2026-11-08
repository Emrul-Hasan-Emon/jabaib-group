import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import {
  DeliveryType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../database/enums/enums';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';
import { effectiveSkuPrice } from '../../catalog/product/utils/product-summary';
import { nextOrderNumber } from '../utils/order-number.util';
import { Order } from '../../database/entities/order.entity';
import { OrderItem } from '../../database/entities/order-item.entity';
import { OrderAddress } from '../../database/entities/order-address.entity';
import { OrderStatusHistory } from '../../database/entities/order-status-history.entity';
import { PaymentStatusHistory } from '../../database/entities/payment-status-history.entity';
import { Payment } from '../../database/entities/payment.entity';
import { ProductSKU } from '../../database/entities/product-sku.entity';
import { UserPaymentGatewayService } from './user-payment-gateway.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  RecordPaymentDto,
} from '../dtos/order.dto';

const TRANSITIONS: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED]: [],
};

@Injectable()
export class AdminOrderService {
  constructor(
    private readonly database: DatabaseService,
    private readonly gateways: UserPaymentGatewayService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.order
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.address', 'address')
      .leftJoinAndSelect('address.division', 'division')
      .leftJoinAndSelect('address.district', 'district')
      .orderBy('order.id', 'DESC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.status)
      qb.andWhere('order.status = :status', { status: query.status });
    if (query.paymentStatus)
      qb.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    if (query.paymentMethod)
      qb.andWhere('order.paymentMethod = :paymentMethod', {
        paymentMethod: query.paymentMethod,
      });
    if (query.q)
      qb.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${query.q}%`,
      });
    if (query.customerName)
      qb.andWhere('user.name ILIKE :customerName', {
        customerName: `%${query.customerName}%`,
      });
    if (query.mobile)
      qb.andWhere('user.phone ILIKE :mobile', { mobile: `%${query.mobile}%` });
    if (query.divisionId)
      qb.andWhere('address.divisionId = :divisionId', {
        divisionId: Number(query.divisionId),
      });
    if (query.districtId)
      qb.andWhere('address.districtId = :districtId', {
        districtId: Number(query.districtId),
      });
    const start = query.startDate ?? query.from;
    const end = query.endDate ?? query.to;
    if (start)
      qb.andWhere('order.createdAt >= :start', { start: new Date(start) });
    if (end) qb.andWhere('order.createdAt <= :end', { end: new Date(end) });

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  /**
   * Admin-placed order: no cart, no coupon — the admin picks the customer,
   * exact SKUs and an address directly.
   *
   * Payment is resolved from a `PaymentGateway` id only — never a hardcoded
   * method. Omit `paymentGatewayId` to use the seeded "Cash on Delivery"
   * gateway (the admin-panel default); `paymentMethod`/`paymentGatewayId` on
   * the order always come from that gateway row, the same as a storefront
   * checkout through `UserPaymentGatewayService`.
   */
  async create(dto: CreateOrderDto, user?: JwtPayload) {
    if (!dto.items.length) {
      throw new BadRequestException('At least one item is required');
    }
    const customer = await this.database.user.findOne({
      where: { id: dto.userId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const address = await this.resolveAddress(dto);
    const shipping = await this.shippingFor(dto.deliveryType);
    const lines = await this.pricedLines(dto.items);
    const gatewayId = dto.paymentGatewayId ?? (await this.codGatewayId());
    const payment = await this.gateways.resolve(gatewayId, dto.paymentMetaData);

    const listTotal = round2(lines.reduce((sum, l) => sum + l.totalPrice, 0));
    const subtotal = round2(
      lines.reduce((sum, l) => sum + l.totalDiscountedPrice, 0),
    );
    const deliveryCharge = Number(shipping?.charge ?? 0);
    const total = round2(subtotal + deliveryCharge);

    const orderId = await this.database.transaction(async (manager) => {
      const orderNumber = await nextOrderNumber(manager);
      const order = await manager.save(
        manager.create(Order, {
          orderNumber,
          userId: dto.userId,
          status: OrderStatus.PENDING,
          deliveryType: dto.deliveryType,
          listTotal,
          subtotal,
          deliveryCharge,
          discountAmount: 0,
          total,
          paymentMethod: payment.paymentMethod,
          paymentGatewayId: payment.gateway.id,
          paymentStatus: PaymentStatus.DUE,
          note: dto.note?.trim() || undefined,
          ...creatorFields(user),
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
            ...creatorFields(user),
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
            `"${line.name}" just went out of stock`,
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
          ...creatorFields(user),
        }),
      );

      await manager.save(
        manager.create(Payment, {
          orderId: order.id,
          method: payment.paymentMethod,
          status: PaymentStatus.DUE,
          amount: total,
          metaData: payment.paymentMetaData ?? undefined,
          ...creatorFields(user),
        }),
      );

      await manager.save(
        manager.create(OrderStatusHistory, {
          orderId: order.id,
          status: OrderStatus.PENDING,
          note: 'Order created by admin',
          ...creatorFields(user),
        }),
      );

      await manager.save(
        manager.create(PaymentStatusHistory, {
          orderId: order.id,
          status: PaymentStatus.DUE,
          note: 'Order created by admin',
          ...creatorFields(user),
        }),
      );

      return order.id;
    });

    return this.findOne(orderId);
  }

  /** Saved address (must belong to the given customer) or the inline snapshot. */
  private async resolveAddress(dto: CreateOrderDto) {
    if (dto.addressId) {
      const saved = await this.database.address.findOne({
        where: { id: dto.addressId, userId: dto.userId },
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

  /** The seeded Cash on Delivery gateway, used when the admin picks none. */
  private async codGatewayId(): Promise<number> {
    const gateway = await this.database.paymentGateway.findOne({
      where: { provider: PaymentMethod.COD, isActive: true },
    });
    if (!gateway) {
      throw new BadRequestException(
        'No active Cash on Delivery payment gateway is configured',
      );
    }
    return gateway.id;
  }

  /** Items re-priced from the live SKU — the admin never sends a price. */
  private async pricedLines(items: CreateOrderDto['items']) {
    const lines: {
      productId: number;
      productSKUId: number;
      name: string;
      skuData: string;
      quantity: number;
      unitPrice: number;
      unitDiscountedPrice: number;
      totalPrice: number;
      totalDiscountedPrice: number;
    }[] = [];

    for (const item of items) {
      const sku = await this.database.productSKU.findOne({
        where: { id: item.productSKUId, productId: item.productId },
        relations: {
          product: true,
          skuVariants: { attribute: true, attributeValue: true },
        },
      });
      const product = sku?.product;
      if (!sku || !sku.isActive || !product || !product.isActive) {
        throw new BadRequestException(
          `Product/SKU ${item.productId}/${item.productSKUId} is not available`,
        );
      }
      if (sku.quantity < item.quantity) {
        throw new BadRequestException(
          sku.quantity > 0
            ? `Only ${sku.quantity} left of "${product.name}"`
            : `"${product.name}" is out of stock`,
        );
      }

      const unitPrice = Number(sku.price);
      const unitDiscountedPrice = effectiveSkuPrice(sku);
      lines.push({
        productId: product.id,
        productSKUId: sku.id,
        name: product.name,
        skuData: JSON.stringify(
          (sku.skuVariants ?? []).map((v) => ({
            attribute: v.attribute?.name,
            value: v.attributeValue?.name,
          })),
        ),
        quantity: item.quantity,
        unitPrice,
        unitDiscountedPrice,
        totalPrice: round2(unitPrice * item.quantity),
        totalDiscountedPrice: round2(unitDiscountedPrice * item.quantity),
      });
    }
    return lines;
  }

  /** Divisions with districts, for filter dropdowns and address pickers. */
  async locations() {
    return this.database.division.find({
      order: { id: 'ASC' },
      relations: { districts: true },
    });
  }

  async findOne(id: number) {
    const order = await this.database.order.findOne({
      where: { id },
      relations: {
        user: true,
        address: { division: true, district: true },
        items: true,
        statusHistory: true,
        paymentStatusHistory: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payments = await this.database.payment.find({
      where: { orderId: id },
      order: { id: 'ASC' },
    });
    return { ...order, payments };
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto, user?: JwtPayload) {
    const order = await this.database.order.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const allowed = TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status as OrderStatus)) {
      throw new BadRequestException(
        `Cannot move order from "${order.status}" to "${dto.status}"`,
      );
    }
    order.status = dto.status;
    Object.assign(order, updaterFields(user));
    await this.database.order.save(order);
    await this.database.orderStatusHistory.save(
      this.database.orderStatusHistory.create({
        orderId: id,
        status: dto.status,
        note: dto.note,
        ...creatorFields(user),
      }),
    );
    return this.findOne(id);
  }

  async recordPayment(id: number, dto: RecordPaymentDto, user?: JwtPayload) {
    const order = await this.database.order.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already marked paid');
    }
    // Settle the customer's pending payment when it carries the same reference
    // (what a manual gateway order always has) instead of stacking a second row
    // on top of it. A COD payment has no reference, so it still inserts.
    const pending = dto.transactionId
      ? await this.database.payment.findOne({
          where: {
            orderId: id,
            transactionId: dto.transactionId,
            status: PaymentStatus.DUE as string,
          },
        })
      : null;

    const payment = pending
      ? await (async () => {
          pending.status = PaymentStatus.PAID;
          pending.amount = dto.amount ?? order.total;
          pending.paidAt = new Date();
          Object.assign(pending, updaterFields(user));
          return this.database.payment.save(pending);
        })()
      : await this.database.payment.save(
          this.database.payment.create({
            orderId: id,
            method: order.paymentMethod,
            status: PaymentStatus.PAID,
            amount: dto.amount ?? order.total,
            transactionId: dto.transactionId,
            paidAt: new Date(),
            ...creatorFields(user),
          }),
        );
    order.paymentStatus = PaymentStatus.PAID;
    Object.assign(order, updaterFields(user));
    await this.database.order.save(order);
    await this.database.paymentStatusHistory.save(
      this.database.paymentStatusHistory.create({
        orderId: id,
        status: PaymentStatus.PAID,
        note: 'Payment recorded by admin',
        ...creatorFields(user),
      }),
    );
    return payment;
  }

  async updateNote(id: number, note: string, user?: JwtPayload) {
    const order = await this.database.order.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    order.note = note;
    Object.assign(order, updaterFields(user));
    return this.database.order.save(order);
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
