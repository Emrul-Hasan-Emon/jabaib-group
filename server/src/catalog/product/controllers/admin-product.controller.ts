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
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
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
  ReorderProductMediaDto,
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
    summary:
      'List products (q, categoryId, collectionId, isPublished/isFeatured/isActive, sort=name|createdAt:asc|desc)',
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
  @ApiOperation({
    summary:
      'Create a product (then upload thumbnail/media via the product upload endpoints)',
  })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a product thumbnail — saves it in the product folder and returns { url, path } to set via product update.',
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

  @Post('media/upload-many')
  @UseInterceptors(FilesInterceptor('files', 20))
  @ApiOperation({
    summary:
      'Upload several media files at once — saves each in the product/media folder and returns { url, path } per file for POST /v1/admin/product/:id/media.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 20,
        },
      },
    },
  })
  uploadMediaMany(@UploadedFiles() files?: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException('files are required');
    return this.service.uploadMediaMany(files);
  }

  @Post('media/upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a media gallery image/video — saves it in the product/media folder and returns { url, path } for POST /v1/admin/product/:id/media.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  uploadMediaImage(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.service.uploadMedia(file);
  }

  @Delete(':id/image')
  @ApiOperation({
    summary:
      'Remove the product thumbnail — deletes the physical file and clears thumbnailUrl/thumbnailPath.',
  })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeImage(id, user);
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

  @Put(':id/media/reorder')
  @ApiOperation({
    summary:
      'Reorder the media gallery — body is the full list of media ids in desired display order (every item exactly once); sortOrder is derived from position.',
  })
  reorderMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReorderProductMediaDto,
  ) {
    return this.service.reorderMedia(id, dto.order);
  }

  @Delete(':id/media/:mediaId')
  removeMedia(
    @Param('id', ParseIntPipe) id: number,
    @Param('mediaId', ParseIntPipe) mediaId: number,
  ) {
    return this.service.removeMedia(id, mediaId);
  }
}
