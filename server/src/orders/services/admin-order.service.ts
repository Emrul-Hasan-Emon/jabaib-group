import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../database/enums/enums';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';
import { UpdateOrderStatusDto, RecordPaymentDto } from '../dtos/order.dto';

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
  constructor(private readonly database: DatabaseService) {}

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
            status: PaymentStatus.PENDING as string,
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
