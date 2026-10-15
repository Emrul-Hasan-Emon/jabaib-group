import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminPaymentGatewayService } from '../services/admin-payment-gateway.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../common/decorators/pagination-params';
import type { Pagination } from '../../common/decorators/pagination-params';
import {
  CreatePaymentGatewayDto,
  UpdatePaymentGatewayDto,
} from '../dtos/payment-gateway.dto';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Payment Gateways')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/payment-gateway', version: '1' })
export class AdminPaymentGatewayController {
  constructor(private readonly service: AdminPaymentGatewayService) {}

  @Get()
  @ApiOperation({
    summary:
      'List payment gateways (q=name, type=mfs|bank, isManual, isActive)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Payment gateway detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a payment gateway — slug is generated from the name; manual gateways require their account details.',
  })
  create(
    @Body() dto: CreatePaymentGatewayDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a payment gateway' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentGatewayDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a payment gateway' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('upload-icon')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a gateway icon — stored in the payment-gateway folder, returns { url, path } to send in create/update.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadIcon(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.service.uploadIcon(file);
  }

  @Delete(':id/icon')
  @ApiOperation({ summary: 'Remove a payment gateway icon' })
  removeIcon(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeIcon(id, user);
  }
}