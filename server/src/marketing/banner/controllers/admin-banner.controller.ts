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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AdminBannerService } from '../services/admin-banner.service';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../../common/decorators/pagination-params';
import type { Pagination } from '../../../common/decorators/pagination-params';
import { CreateBannerDto } from '../dtos/create-banner.dto';
import { UpdateBannerDto } from '../dtos/update-banner.dto';
import { AdminUserRoleEnum } from '../../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Banners')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/banner', version: '1' })
export class AdminBannerController {
  constructor(private readonly service: AdminBannerService) {}

  @Get()
  @ApiOperation({ summary: 'List banners (q=title, position, isActive)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Banner detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a banner' })
  create(@Body() dto: CreateBannerDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload a banner image — saves it in the banner folder and returns { url, path } to set via create/update (desktop or mobile).',
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

  @Delete(':id/image')
  @ApiOperation({
    summary:
      'Remove a banner image — deletes the physical file and clears the matching fields. Use kind=mobile for the mobile image, kind=all for both.',
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: ['desktop', 'mobile', 'all'],
    description: 'Which image to remove (default: desktop).',
  })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Query('kind') kind?: 'desktop' | 'mobile' | 'all',
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.service.removeImage(id, kind, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a banner' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a banner' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
