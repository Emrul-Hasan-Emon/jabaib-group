import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrderService } from '../services/admin-order.service';
import {
  RecordPaymentDto,
  UpdateOrderNoteDto,
  UpdateOrderStatusDto,
} from '../dtos/order.dto';
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

@ApiTags('Orders — Admin')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/order', version: '1' })
export class AdminOrderController {
  constructor(private readonly service: AdminOrderService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with filters' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get('meta/locations')
  @ApiOperation({ summary: 'Divisions → districts for filter dropdowns' })
  locations() {
    return this.service.locations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Transition order status (writes history)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user);
  }

  @Post(':id/payment')
  @ApiOperation({ summary: 'Record payment (e.g. COD received on delivery)' })
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.recordPayment(id, dto, user);
  }

  @Patch(':id/note')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateNote(id, dto.note, user);
  }
}
