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
import {
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminProductService } from '../services/admin-product.service';
import { CreateProductDto } from '../dtos/create-product.dto';
import { UpdateProductDto } from '../dtos/update-product.dto';
import {
  CreateProductMediaDto,
  UpdateProductMediaDto,
} from '../dtos/product-media.dto';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { AdminUserRoleEnum } from '../../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

class BulkSetActiveDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  isActive: boolean;
}

@ApiTags('Catalog — Products')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/product', version: '1' })
export class AdminProductController {
  constructor(private readonly service: AdminProductService) {}

  @Get()
  @ApiOperation({
    summary: 'List products (q, categoryId, productLabelId, isPublished/isFeatured/isActive, sort=name|createdAt:asc|desc)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Product detail with media, skus and variants' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product (then upload thumbnail/media via /file/upload)' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('bulk/activate')
  @ApiOperation({ summary: 'Bulk activate/deactivate products' })
  bulkSetActive(
    @Body() dto: BulkSetActiveDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.bulkSetActive(dto.ids, dto.isActive, user);
  }

  @Get(':id/media')
  listMedia(@Param('id', ParseIntPipe) id: number) {
    return this.service.listMedia(id);
  }

  @Post(':id/media')
  addMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProductMediaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.addMedia(id, dto, user);
  }

  @Patch(':id/media/:mediaId')
  updateMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
    @Body() dto: UpdateProductMediaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateMedia(id, mediaId, dto, user);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
  ) {
    return this.service.removeMedia(id, mediaId);
  }
}
