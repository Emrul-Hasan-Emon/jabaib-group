import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { OrderItem } from '../../../database/entities/order-item.entity';
import { ProductSKU } from '../../../database/entities/product-sku.entity';
import { OrderReturn } from '../../../database/entities/order-return.entity';
import { OrderReturnItem } from '../../../database/entities/order-return-item.entity';
import { OrderReturnStatusHistory } from '../../../database/entities/order-return-status-history.entity';
import { OrderStatusHistory } from '../../../database/entities/order-status-history.entity';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { OrderReturnStatus, OrderStatus } from '../../../database/enums/enums';
import { CancelOrderDto, RequestReturnDto } from '../dtos/user-order.dto';

/** Days after delivery during which a return can be requested. */
export const RETURN_WINDOW_DAYS = 7;

/**
 * Customer order history: list, detail, cancel while still pending, and return
 * requests inside the post-delivery window. Every read is scoped to the caller,
 * and every write lands its own status-history row stamped with the customer.
 */
@Injectable()
export class UserOrderService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number, pagination: Pagination) {
    const [rows, count] = await this.database.order.findAndCount({
      where: { userId },
      relations: { items: { product: true }, address: true },
      order: { id: 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });

    const openReturns = await this.database.orderReturn.find({
      where: { userId },
      relations: { items: true },
    });
    const returnByOrder = new Map<number, string>();
    for (const r of openReturns) returnByOrder.set(r.orderId, r.status);

    const data = rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      deliveryType: o.deliveryType,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      itemCount: (o.items ?? []).reduce((n, i) => n + i.quantity, 0),
      total: Number(o.total),
      subtotal: Number(o.subtotal),
      deliveryCharge: Number(o.deliveryCharge),
      discountAmount: Number(o.discountAmount),
      couponCode: o.couponCode,
      thumbnailUrl:
        (o.items ?? []).map((i) => i.product?.thumbnailUrl).find(Boolean) ??
        null,
      createdAt: o.createdAt,
      returnStatus: returnByOrder.get(o.id) ?? null,
    }));

    return getPaginateData(data, count, pagination);
  }

  async findOne(userId: number, id: number) {
    const order = await this.database.order.findOne({
      where: { id, userId },
      relations: {
        items: { product: true },
        address: { division: true, district: true },
        statusHistory: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const history = await this.database.orderStatusHistory.find({
      where: { orderId: id },
      order: { id: 'ASC' },
    });
    const payments = await this.database.payment.find({
      where: { orderId: id },
      order: { id: 'ASC' },
    });
    const returns = await this.database.orderReturn.find({
      where: { orderId: id },
      relations: { items: true, statusHistory: true },
      order: { id: 'DESC' },
    });
    const eligibility = this.returnEligibility(order.status, returns, history);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      deliveryType: order.deliveryType,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      subtotal: Number(order.subtotal),
      deliveryCharge: Number(order.deliveryCharge),
      discountAmount: Number(order.discountAmount),
      couponCode: order.couponCode,
      total: Number(order.total),
      note: order.note,
      createdAt: order.createdAt,
      items: (order.items ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        productSKUId: i.productSKUId,
        name: i.productName,
        skuData: safeJson(i.skuData),
        slug: i.product?.slug ?? null,
        image: i.product?.thumbnailUrl ?? null,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        unitDiscountedPrice: Number(i.unitDiscountedPricePrice),
        totalPrice: Number(i.totalPrice),
        totalDiscountedPrice: Number(i.totalDiscountedPrice),
      })),
      address: order.address,
      statusHistory: history.map((h) => ({
        status: h.status,
        note: h.note,
        at: h.createdAt,
      })),
      payments: payments.map((p) => ({
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
        transactionId: p.transactionId,
        // What the customer submitted for a manual gateway (txnId / account
        // details) — their own data, so it belongs in their order view.
        metaData: p.metaData ?? null,
        paidAt: p.paidAt,
      })),
      returns: returns.map((r) => ({
        id: r.id,
        returnNumber: r.returnNumber,
        status: r.status,
        reason: r.reason,
        refundAmount: Number(r.refundAmount),
        refundMethod: r.refundMethod,
        media: r.media ?? [],
        createdAt: r.createdAt,
        items: (r.items ?? []).map((ri) => ({
          orderItemId: ri.orderItemId,
          quantity: ri.quantity,
          reason: ri.reason,
        })),
      })),
      canCancel: is(order.status, OrderStatus.PENDING),
      canReturn: eligibility.allowed,
      returnReason: eligibility.reason,
      returnWindowEnds: isoOrNull(this.returnWindowEnd(history)),
    };
  }

  /** Cancel own order while it is still pending. */
  async cancel(user: JwtPayload, id: number, dto: CancelOrderDto) {
    const order = await this.database.order.findOne({
      where: { id, userId: user.id },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!is(order.status, OrderStatus.PENDING)) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    if (dto.reason?.trim()) {
      order.note = dto.reason.trim();
    }
    await this.database.transaction(async (manager) => {
      await manager.save(order);

      // Checkout decremented stock when the order was placed. A cancelled
      // pending order was never shipped, so those units go back on the shelf —
      // otherwise abandoned orders permanently consume inventory.
      const items = await manager.find(OrderItem, { where: { orderId: id } });
      for (const item of items) {
        if (!item.productSKUId) continue;
        await manager.increment(
          ProductSKU,
          { id: item.productSKUId },
          'quantity',
          item.quantity,
        );
      }

      await manager.save(
        manager.create(OrderStatusHistory, {
          orderId: id,
          status: OrderStatus.CANCELLED,
          note: dto.reason?.trim() || 'Cancelled by customer',
          createdBy: user.id,
          creatorType: 'user',
        }),
      );
    });
    return this.findOne(user.id, id);
  }

  /**
   * Request a return on a delivered order inside the return window. Item
   * quantities are validated against what was ordered and what was already
   * returned.
   */
  async requestReturn(user: JwtPayload, id: number, dto: RequestReturnDto) {
    const order = await this.database.order.findOne({
      where: { id, userId: user.id },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const history = await this.database.orderStatusHistory.find({
      where: { orderId: id },
      order: { id: 'ASC' },
    });
    const existingReturns = await this.database.orderReturn.find({
      where: { orderId: id },
      relations: { items: true },
    });

    const eligibility = this.returnEligibility(
      order.status,
      existingReturns,
      history,
    );
    if (!eligibility.allowed) {
      throw new BadRequestException(
        eligibility.reason ?? 'Return not available',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Select at least one item to return');
    }

    const alreadyReturned = new Map<number, number>();
    for (const r of existingReturns) {
      if (is(r.status, OrderReturnStatus.REJECTED)) continue;
      for (const ri of r.items ?? []) {
        alreadyReturned.set(
          ri.orderItemId,
          (alreadyReturned.get(ri.orderItemId) ?? 0) + ri.quantity,
        );
      }
    }

    const lines = dto.items.map((line) => {
      const item = (order.items ?? []).find((i) => i.id === line.orderItemId);
      if (!item) {
        throw new BadRequestException(
          'One of the items is not part of this order',
        );
      }
      const returned = alreadyReturned.get(line.orderItemId) ?? 0;
      const remaining = item.quantity - returned;
      if (line.quantity > remaining) {
        throw new BadRequestException(
          remaining > 0
            ? `Only ${remaining} of "${item.productName}" can still be returned`
            : `"${item.productName}" has already been returned`,
        );
      }
      return { orderItem: item, quantity: line.quantity, reason: line.reason };
    });

    const refundAmount = round2(
      lines.reduce((sum, line) => {
        const unit = Number(
          line.orderItem.unitDiscountedPricePrice ?? line.orderItem.unitPrice,
        );
        return sum + unit * line.quantity;
      }, 0),
    );

    const created = await this.database.transaction(async (manager) => {
      const returnNumber = await this.nextReturnNumber(manager);
      const ret = await manager.save(
        manager.create(OrderReturn, {
          returnNumber,
          orderId: id,
          userId: user.id,
          status: OrderReturnStatus.REQUESTED,
          reason: dto.reason.trim(),
          refundAmount,
          refundMethod: order.paymentMethod,
          media: dto.media?.length ? dto.media : undefined,
          createdBy: user.id,
          creatorType: 'user',
        }),
      );
      for (const line of lines) {
        await manager.save(
          manager.create(OrderReturnItem, {
            orderReturnId: ret.id,
            orderItemId: line.orderItem.id,
            quantity: line.quantity,
            reason: line.reason,
            createdBy: user.id,
            creatorType: 'user',
          }),
        );
      }
      await manager.save(
        manager.create(OrderReturnStatusHistory, {
          orderReturnId: ret.id,
          status: OrderReturnStatus.REQUESTED,
          note: 'Return requested by customer',
          createdBy: user.id,
          creatorType: 'user',
        }),
      );
      return ret;
    });

    return { id: created.id, returnNumber: created.returnNumber };
  }

  /**
   * A return can only be requested on a delivered order, within
   * RETURN_WINDOW_DAYS of the delivered status row, and only while no other
   * return is open on that order.
   */
  private returnEligibility(
    status: string,
    returns: { status: string }[],
    history: { status: string; createdAt: Date }[],
  ): { allowed: boolean; reason?: string } {
    if (!is(status, OrderStatus.DELIVERED)) {
      return {
        allowed: false,
        reason: 'Only delivered orders can be returned',
      };
    }
    const windowEnd = this.returnWindowEnd(history);
    if (!windowEnd) {
      return {
        allowed: false,
        reason: `The ${RETURN_WINDOW_DAYS}-day return window has closed`,
      };
    }
    const open = returns.find(
      (r) =>
        !is(r.status, OrderReturnStatus.REJECTED) &&
        !is(r.status, OrderReturnStatus.COMPLETED),
    );
    if (open) {
      return {
        allowed: false,
        reason: 'A return request is already open for this order',
      };
    }
    return { allowed: true };
  }

  /**
   * End of the return window for a delivered order (null when there is no
   * delivered row yet, or the window has passed).
   */
  private returnWindowEnd(
    history: { status: string; createdAt: Date }[],
  ): number | null {
    const delivered = [...(history ?? [])]
      .reverse()
      .find((h) => is(h.status, OrderStatus.DELIVERED));
    if (!delivered) return null;
    const end =
      new Date(delivered.createdAt).getTime() +
      RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() <= end ? end : null;
  }

  private async nextReturnNumber(
    manager: import('typeorm').EntityManager,
  ): Promise<string> {
    const stamp = [
      String(new Date().getFullYear()).slice(-2),
      String(new Date().getMonth() + 1).padStart(2, '0'),
      String(new Date().getDate()).padStart(2, '0'),
    ].join('');
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = `RET-${stamp}-${Math.random()
        .toString(16)
        .slice(2, 6)
        .toUpperCase()}`;
      const clash = await manager.findOne(OrderReturn, {
        where: { returnNumber: candidate },
      });
      if (!clash) return candidate;
    }
    throw new BadRequestException('Could not allocate a return number');
  }
}

/** Order/return status columns are plain strings; compare as such. */
function is(value: string, status: OrderStatus | OrderReturnStatus): boolean {
  return value === (status as string);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Epoch millis (or nothing) as an ISO string for the API. */
function isoOrNull(epoch: number | null): string | null {
  return epoch == null ? null : new Date(epoch).toISOString();
}

/** SKU snapshot is stored as a JSON string; keep it readable either way. */
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}
