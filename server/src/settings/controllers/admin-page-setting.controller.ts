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
import { AdminPageSettingService } from '../services/admin-page-setting.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../common/decorators/pagination-params';
import type { Pagination } from '../../common/decorators/pagination-params';
import { CreatePageSettingDto } from '../dtos/create-page-setting.dto';
import { UpdatePageSettingDto } from '../dtos/update-page-setting.dto';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Page Settings')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/page-settings', version: '1' })
export class AdminPageSettingController {
  constructor(private readonly service: AdminPageSettingService) {}

  @Get()
  @ApiOperation({ summary: 'List static pages (q=title, key, isActive)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Static page detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a static page' })
  create(@Body() dto: CreatePageSettingDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a static page' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePageSettingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a static page' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
