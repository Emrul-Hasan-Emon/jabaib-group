import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AdminSkuService } from '../services/admin-sku.service';
import { CreateSkuDto, UpdateSkuDto } from '../dtos/sku.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { AdminUserRoleEnum } from '../../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Catalog — SKUs')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin', version: '1' })
export class AdminSkuController {
  constructor(private readonly service: AdminSkuService) {}

  @Get('product/:productId/skus')
  @ApiOperation({ summary: 'List SKUs of a product with their variants' })
  listByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.service.listByProduct(productId);
  }

  @Post('product/:productId/skus')
  @ApiOperation({
    summary:
      'Create one SKU for a product. discountedPrice defaults to price; dates define discount validity. variants = attributeId/attributeValueId pairs.',
  })
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreateSkuDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(productId, dto, user);
  }

  @Get('sku/:id')
  @ApiOperation({ summary: 'Get one SKU' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch('sku/:id')
  @ApiOperation({ summary: 'Update a SKU (pass variants array to replace pairs)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSkuDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete('sku/:id')
  @ApiOperation({ summary: 'Soft-delete a SKU' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
