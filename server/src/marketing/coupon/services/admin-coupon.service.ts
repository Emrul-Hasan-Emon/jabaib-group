import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { UpdateCouponDto } from '../dtos/update-coupon.dto';
import {
  creatorFields,
  updaterFields,
} from '../../../catalog/utils/catalog.utils';

@Injectable()
export class AdminCouponService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.coupon
      .createQueryBuilder('coupon')
      .orderBy('coupon.id', 'DESC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.code) {
      qb.andWhere('coupon.code ILIKE :code', { code: `%${query.code}%` });
    }
    if (query.type) {
      qb.andWhere('coupon.type = :type', { type: query.type });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('coupon.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    const start = query.startDate
      ? this.parseDate(query.startDate, 'startDate')
      : null;
    const end = query.endDate ? this.parseDate(query.endDate, 'endDate') : null;
    if (start && end && start > end) {
      throw new BadRequestException('startDate must be on or before endDate.');
    }
    // Eligibility overlap: coupon's validity window intersects [start, end].
    // Null boundaries on the coupon mean "unbounded" in that direction.
    if (start) {
      qb.andWhere('(coupon.endsAt IS NULL OR coupon.endsAt >= :start)', {
        start,
      });
    }
    if (end) {
      qb.andWhere('(coupon.startsAt IS NULL OR coupon.startsAt <= :end)', {
        end,
      });
    }

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const coupon = await this.database.coupon.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async create(dto: CreateCouponDto, user?: JwtPayload) {
    const code = this.normalizeCode(dto.code);
    await this.ensureCodeAvailable(code);
    const coupon = this.database.coupon.create({
      ...dto,
      code,
      minOrderAmount: dto.minOrderAmount ?? 0,
      usageLimit: dto.usageLimit ?? 0,
      perUserLimit: dto.perUserLimit ?? 1,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      ...creatorFields(user),
    });
    return this.database.coupon.save(coupon);
  }

  async update(id: number, dto: UpdateCouponDto, user?: JwtPayload) {
    const existing = await this.findOne(id);
    if (dto.code) {
      const code = this.normalizeCode(dto.code);
      await this.ensureCodeAvailable(code, id);
      existing.code = code;
    }
    // Normalized code is set above; drop it from the spread so Object.assign
    // cannot clobber it back to the raw (untrimmed/uncased) input.
    const { code: _code, ...rest } = dto;
    Object.assign(existing, rest, {
      startsAt:
        dto.startsAt !== undefined
          ? dto.startsAt
            ? new Date(dto.startsAt)
            : null
          : existing.startsAt,
      endsAt:
        dto.endsAt !== undefined
          ? dto.endsAt
            ? new Date(dto.endsAt)
            : null
          : existing.endsAt,
      ...updaterFields(user),
    });
    return this.database.coupon.save(existing);
  }

  async remove(id: number) {
    const coupon = await this.findOne(id);
    await this.database.coupon.softRemove(coupon);
    return { deleted: true };
  }

  /** Usage log for one coupon, newest first. */
  historyForCoupon(couponId: number) {
    return this.database.couponHistoryLog.find({
      where: { couponId },
      relations: { user: true, order: true },
      order: { id: 'DESC' },
      take: 200,
    });
  }

  /** Global coupon-usage audit with filters. */
  async historyList(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.couponHistoryLog
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.coupon', 'coupon')
      .leftJoinAndSelect('log.user', 'user')
      .leftJoinAndSelect('log.order', 'order')
      .orderBy('log.id', 'DESC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.couponId)
      qb.andWhere('log.couponId = :couponId', {
        couponId: Number(query.couponId),
      });
    if (query.couponCode)
      qb.andWhere('log.couponCode ILIKE :couponCode', {
        couponCode: `%${query.couponCode}%`,
      });
    // Customer filters are name / mobile based (no userId filter).
    if (query.customerName)
      qb.andWhere('user.name ILIKE :customerName', {
        customerName: `%${query.customerName}%`,
      });
    if (query.mobile)
      qb.andWhere('user.phone ILIKE :mobile', { mobile: `%${query.mobile}%` });
    if (query.orderId)
      qb.andWhere('log.orderId = :orderId', { orderId: Number(query.orderId) });
    if (query.orderNumber)
      qb.andWhere('order.orderNumber ILIKE :orderNumber', {
        orderNumber: `%${query.orderNumber}%`,
      });

    const start = query.startDate
      ? this.parseDate(query.startDate, 'startDate')
      : null;
    const end = query.endDate ? this.parseDate(query.endDate, 'endDate') : null;
    if (start && end && start > end) {
      throw new BadRequestException('startDate must be on or before endDate.');
    }
    if (start) qb.andWhere('log.createdAt >= :start', { start });
    if (end) qb.andWhere('log.createdAt <= :end', { end });

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  /**
   * Parse a `YYYY-MM-DD` (or full ISO) date parameter. Date-only values are
   * span-adjusted so `endDate` covers the whole final day.
   */
  private parseDate(value: string, name: 'startDate' | 'endDate'): Date {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = isDateOnly
      ? name === 'startDate'
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(`${value}T23:59:59.999Z`)
      : new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        `Invalid ${name} "${value}" — use YYYY-MM-DD.`,
      );
    }
    return parsed;
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase().replace(/\s+/g, '');
  }

  private async ensureCodeAvailable(code: string, excludeId?: number) {
    const existing = await this.database.coupon
      .createQueryBuilder('coupon')
      .where('LOWER(coupon.code) = LOWER(:code)', { code })
      .getOne();
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `Coupon code "${code}" already exists — choose a unique code.`,
      );
    }
  }
}
