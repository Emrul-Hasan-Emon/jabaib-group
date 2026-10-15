import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminCustomerService } from '../services/admin-customer.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaginationParams } from '../../common/decorators/pagination-params';
import type { Pagination } from '../../common/decorators/pagination-params';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Customers')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/customer', version: '1' })
export class AdminCustomerController {
  constructor(private readonly service: AdminCustomerService) {}

  @Get()
  @ApiOperation({
    summary:
      'List customers (q=name/phone/email, isActive) with order & wishlist counts',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Customer detail: orders, addresses, wishlist, providers',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
