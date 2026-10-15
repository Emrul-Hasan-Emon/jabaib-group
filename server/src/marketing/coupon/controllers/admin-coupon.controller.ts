import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminCouponService } from '../services/admin-coupon.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { CreateCouponDto } from '../dtos/create-coupon.dto';
import { UpdateCouponDto } from '../dtos/update-coupon.dto';
import { AdminUserRoleEnum } from '../../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Coupons')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/coupon', version: '1' })
export class AdminCouponController {
  constructor(private readonly service: AdminCouponService) {}

  @Get()
  @ApiOperation({
    summary:
      'List coupons (code, type, isActive, startDate, endDate — date range filters coupons eligible within that window)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Usage history for one coupon' })
  history(@Param('id', ParseIntPipe) id: number) {
    return this.service.historyForCoupon(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Coupon detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a coupon' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a coupon' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
