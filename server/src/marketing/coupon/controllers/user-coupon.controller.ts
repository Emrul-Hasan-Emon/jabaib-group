import { Body, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { UserCouponService } from '../services/user-coupon.service';

/** Live coupon check for the checkout screen (never consumes a use). */
@ApiTags('Coupons (customer)')
@Controller({ path: 'user/coupon', version: '1' })
export class UserCouponController {
  constructor(private readonly service: UserCouponService) {}

  @Public()
  @Get(':code/preview')
  @ApiOperation({
    summary: 'Check a coupon code against a basket subtotal (discount preview)',
  })
  preview(
    @CurrentUser() user: JwtPayload | null,
    @Param('code') code: string,
    @Query('subtotal') subtotal?: string,
  ) {
    return this.service.preview(user?.id ?? null, code, Number(subtotal ?? 0));
  }
}
