import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

  @Post('sku/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a SKU image — saves it in the product/sku folder and returns { url, path } to set via SKU update.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.service.uploadImage(file);
  }

  @Delete('sku/:id/image')
  @ApiOperation({
    summary:
      'Remove the SKU image — deletes the physical file and clears imageUrl/imagePath.',
  })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeImage(id, user);
  }

  @Patch('sku/:id')
  @ApiOperation({
    summary:
      'Update a SKU — only price, discountedPrice, isActive and isDefault are editable.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSkuDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }
}
