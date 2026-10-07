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
import { AdminAttributeService } from '../services/admin-attribute.service';
import { CreateAttributeDto } from '../dtos/create-attribute.dto';
import { UpdateAttributeDto } from '../dtos/update-attribute.dto';
import { CreateAttributeValueDto } from '../dtos/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dtos/update-attribute-value.dto';
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

@ApiTags('Catalog — Attributes')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/attribute', version: '1' })
export class AdminAttributeController {
  constructor(private readonly service: AdminAttributeService) {}

  @Get()
  @ApiOperation({ summary: 'List attributes (with values)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one attribute with values' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an attribute' })
  create(@Body() dto: CreateAttributeDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attribute' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an attribute' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Get(':id/values')
  @ApiOperation({ summary: 'List values of an attribute' })
  listValues(@Param('id', ParseIntPipe) id: number) {
    return this.service.listValues(id);
  }

  @Post(':id/values')
  @ApiOperation({ summary: 'Add a value to an attribute' })
  createValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeValueDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createValue(id, dto, user);
  }
}

@ApiTags('Catalog — Attribute Values')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/attribute-value', version: '1' })
export class AdminAttributeValueController {
  constructor(private readonly service: AdminAttributeService) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update an attribute value' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeValueDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateValue(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an attribute value' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeValue(id);
  }
}
