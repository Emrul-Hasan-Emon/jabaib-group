import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { Coupon } from '../../../database/entities/coupon.entity';
import { CouponType } from '../../../database/enums/enums';

export interface CouponCheck {
  valid: boolean;
  code: string;
  type?: string;
  discountAmount: number;
  /** Human-readable reason when `valid` is false. */
  message?: string;
}

/**
 * Customer-facing coupon validation. Mirrors the admin eligibility rules but is
 * scoped to "would this code work for this customer and this basket right now",
 * including the per-customer usage limit read from the coupon history.
 *
 * `usedCount` is only incremented when an order is actually placed, so previewing
 * a code repeatedly never burns a use.
 */
@Injectable()
export class UserCouponService {
  constructor(private readonly database: DatabaseService) {}

  private static normalize(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Validate a code against a basket subtotal. Guests skip the per-user limit
   * (there is nobody to count yet) but every other rule still applies.
   */
  async preview(
    userId: number | null,
    code: string,
    subtotal: number,
  ): Promise<CouponCheck> {
    const normalized = UserCouponService.normalize(code ?? '');
    if (!normalized) {
      return {
        valid: false,
        code: normalized,
        discountAmount: 0,
        message: 'Enter a coupon code',
      };
    }

    const coupon = await this.database.coupon.findOne({
      where: { code: normalized },
    });
    if (!coupon) {
      return {
        valid: false,
        code: normalized,
        discountAmount: 0,
        message: 'This coupon code does not exist',
      };
    }
    return this.evaluate(coupon, userId, Number(subtotal) || 0);
  }

  /** Same rules, but throws with the failure reason (used during checkout). */
  async require(userId: number | null, code: string, subtotal: number) {
    const check = await this.preview(userId, code, subtotal);
    if (!check.valid) {
      throw new BadRequestException(
        check.message ?? 'Coupon cannot be applied',
      );
    }
    return check;
  }

  private async evaluate(
    coupon: Coupon,
    userId: number | null,
    subtotal: number,
  ): Promise<CouponCheck> {
    const base = { code: coupon.code, type: coupon.type };

    if (!coupon.isActive) {
      return {
        ...base,
        valid: false,
        discountAmount: 0,
        message: 'This coupon is no longer active',
      };
    }
    const now = Date.now();
    if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
      return {
        ...base,
        valid: false,
        discountAmount: 0,
        message: 'This coupon is not active yet',
      };
    }
    if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) {
      return {
        ...base,
        valid: false,
        discountAmount: 0,
        message: 'This coupon has expired',
      };
    }
    if (subtotal < Number(coupon.minOrderAmount ?? 0)) {
      return {
        ...base,
        valid: false,
        discountAmount: 0,
        message: `Minimum order is ৳${Number(coupon.minOrderAmount ?? 0).toFixed(0)}`,
      };
    }
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return {
        ...base,
        valid: false,
        discountAmount: 0,
        message: 'This coupon has reached its usage limit',
      };
    }
    if (userId && coupon.perUserLimit > 0) {
      const used = await this.database.couponHistoryLog.count({
        where: { couponId: coupon.id, userId },
      });
      if (used >= coupon.perUserLimit) {
        return {
          ...base,
          valid: false,
          discountAmount: 0,
          message:
            'You have already used this coupon the maximum number of times',
        };
      }
    }

    const amount = Number(coupon.amount ?? 0);
    let discount =
      coupon.type === (CouponType.PERCENT as string)
        ? (subtotal * amount) / 100
        : amount;
    if (coupon.maxDiscountAmount != null) {
      discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    }
    discount = Math.min(discount, subtotal);

    return {
      ...base,
      valid: true,
      discountAmount: round2(discount),
    };
  }

  /** Record one use of a coupon (called inside the order transaction). */
  async recordUse(
    userId: number,
    couponId: number,
    code: string,
    orderId: number,
    discountAmount: number,
    orderTotal: number,
  ) {
    await this.database.couponHistoryLog.save(
      this.database.couponHistoryLog.create({
        couponId,
        userId,
        orderId,
        couponCode: code,
        discountAmount,
        orderTotal,
        createdBy: userId,
        creatorType: 'user',
      }),
    );
    await this.database.coupon.increment({ id: couponId }, 'usedCount', 1);
  }
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
