import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminCustomerService } from '../services/admin-customer.service';
import { UserAddressService } from '../services/user-address.service';
import { CreateAddressDto } from '../dtos/address.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
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
  constructor(
    private readonly service: AdminCustomerService,
    private readonly addresses: UserAddressService,
  ) {}

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

  @Post(':id/address')
  @ApiOperation({
    summary:
      'Create a saved address on behalf of this customer (e.g. while placing an admin order)',
  })
  async createAddress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAddressDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    await this.service.findOne(id); // 404s if the customer doesn't exist
    return this.addresses.create(id, dto, admin);
  }
}
