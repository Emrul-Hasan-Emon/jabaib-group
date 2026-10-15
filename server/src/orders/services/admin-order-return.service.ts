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
import { OrderReturnStatus } from '../../database/enums/enums';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';
import { UpdateOrderReturnStatusDto } from '../dtos/order-return.dto';

const RETURN_TRANSITIONS: Record<string, OrderReturnStatus[]> = {
  [OrderReturnStatus.REQUESTED]: [
    OrderReturnStatus.APPROVED,
    OrderReturnStatus.REJECTED,
  ],
  [OrderReturnStatus.APPROVED]: [OrderReturnStatus.PICKED_UP],
  [OrderReturnStatus.PICKED_UP]: [
    OrderReturnStatus.REFUNDED,
    OrderReturnStatus.COMPLETED,
  ],
  [OrderReturnStatus.REFUNDED]: [OrderReturnStatus.COMPLETED],
  [OrderReturnStatus.REJECTED]: [],
  [OrderReturnStatus.COMPLETED]: [],
};

@Injectable()
export class AdminOrderReturnService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.orderReturn
      .createQueryBuilder('ret')
      .leftJoinAndSelect('ret.user', 'user')
      .leftJoinAndSelect('ret.order', 'order')
      .orderBy('ret.id', 'DESC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.status)
      qb.andWhere('ret.status = :status', { status: query.status });
    if (query.orderId)
      qb.andWhere('ret.orderId = :orderId', { orderId: Number(query.orderId) });
    if (query.q)
      qb.andWhere('ret.returnNumber ILIKE :returnNumber', {
        returnNumber: `%${query.q}%`,
      });
    if (query.orderNumber)
      qb.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${query.orderNumber}%`,
      });
    if (query.customerName)
      qb.andWhere('user.name ILIKE :customerName', {
        customerName: `%${query.customerName}%`,
      });
    if (query.refundMethod)
      qb.andWhere('ret.refundMethod = :refundMethod', {
        refundMethod: query.refundMethod,
      });
    const start = query.startDate ?? query.from;
    const end = query.endDate ?? query.to;
    if (start)
      qb.andWhere('ret.createdAt >= :start', { start: new Date(start) });
    if (end) qb.andWhere('ret.createdAt <= :end', { end: new Date(end) });

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const ret = await this.database.orderReturn.findOne({
      where: { id },
      relations: {
        user: true,
        order: true,
        items: { orderItem: true },
        statusHistory: true,
      },
    });
    if (!ret) throw new NotFoundException('Return not found');
    return ret;
  }

  async updateStatus(
    id: number,
    dto: UpdateOrderReturnStatusDto,
    user?: JwtPayload,
  ) {
    const ret = await this.database.orderReturn.findOne({ where: { id } });
    if (!ret) throw new NotFoundException('Return not found');
    const allowed = RETURN_TRANSITIONS[ret.status] ?? [];
    if (!allowed.includes(dto.status as OrderReturnStatus)) {
      throw new BadRequestException(
        `Cannot move return from "${ret.status}" to "${dto.status}"`,
      );
    }
    ret.status = dto.status;
    if (dto.refundAmount !== undefined) ret.refundAmount = dto.refundAmount;
    if (dto.refundMethod !== undefined) ret.refundMethod = dto.refundMethod;
    Object.assign(ret, updaterFields(user));
    await this.database.orderReturn.save(ret);
    await this.database.orderReturnStatusHistory.save(
      this.database.orderReturnStatusHistory.create({
        orderReturnId: id,
        status: dto.status as OrderReturnStatus,
        note: dto.note,
        ...creatorFields(user),
      }),
    );
    return this.findOne(id);
  }
}
