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
import { AdminCountryService } from '../services/admin-country.service';
import { AdminDivisionService } from '../services/admin-division.service';
import { AdminDistrictService } from '../services/admin-district.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../common/decorators/pagination-params';
import type { Pagination } from '../../common/decorators/pagination-params';
import {
  CreateCountryDto,
  CreateDivisionDto,
  CreateDistrictDto,
} from '../dtos/location.dto';
import {
  UpdateCountryDto,
  UpdateDivisionDto,
  UpdateDistrictDto,
} from '../dtos/location.dto';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

const ADMIN_ROLES = [
  AdminUserRoleEnum.SUPER_ADMIN,
  AdminUserRoleEnum.ADMIN,
  AdminUserRoleEnum.EDITOR,
];

@ApiTags('Admin — Locations')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/country', version: '1' })
export class AdminCountryController {
  constructor(private readonly service: AdminCountryService) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Locations tree: countries → divisions → districts',
  })
  tree() {
    return this.service.tree();
  }

  @Get()
  @ApiOperation({ summary: 'List countries (q=name, isActive)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Country detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a country' })
  create(@Body() dto: CreateCountryDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a country' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a country' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@ApiTags('Admin — Locations')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/division', version: '1' })
export class AdminDivisionController {
  constructor(private readonly service: AdminDivisionService) {}

  @Get()
  @ApiOperation({ summary: 'List divisions (q, countryId, isActive)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Division detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a division' })
  create(@Body() dto: CreateDivisionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a division' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDivisionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a division' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

@ApiTags('Admin — Locations')
@ApiBearerAuth('JWT-auth')
@Roles(...ADMIN_ROLES)
@Controller({ path: 'admin/district', version: '1' })
export class AdminDistrictController {
  constructor(private readonly service: AdminDistrictService) {}

  @Get()
  @ApiOperation({
    summary: 'List districts (q, countryId, divisionId, isActive)',
  })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'District detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a district' })
  create(@Body() dto: CreateDistrictDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a district' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDistrictDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a district' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
