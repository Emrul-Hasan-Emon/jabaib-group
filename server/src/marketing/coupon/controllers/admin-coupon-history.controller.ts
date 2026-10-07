import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminCouponService } from '../services/admin-coupon.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { AdminUserRoleEnum } from '../../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Coupons')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/coupon-history', version: '1' })
export class AdminCouponHistoryController {
  constructor(private readonly service: AdminCouponService) {}

  @Get()
  @ApiOperation({
    summary:
      'Coupon usage audit (filters: couponId, couponCode, customerName, mobile, orderNumber, startDate, endDate)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.historyList(pagination, query);
  }
}
