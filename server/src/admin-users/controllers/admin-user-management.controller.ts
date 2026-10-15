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
  ApiTags,
} from '@nestjs/swagger';
import { AdminUserManagementService } from '../services/admin-user-management.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import { PaginationParams } from '../../common/decorators/pagination-params';
import type { Pagination } from '../../common/decorators/pagination-params';
import { CreateAdminUserDto, UpdateAdminUserDto } from '../dtos/admin-user.dto';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';

/** Only the super_admin can manage other admin accounts. */
@ApiTags('Admin — Admin Users')
@ApiBearerAuth('JWT-auth')
@Roles(AdminUserRoleEnum.SUPER_ADMIN)
@Controller({ path: 'admin/admin-user', version: '1' })
export class AdminUserManagementController {
  constructor(private readonly service: AdminUserManagementService) {}

  @Get()
  @ApiOperation({ summary: 'List admin users (q=name, role, isActive)' })
  list(
    @PaginationParams() pagination: Pagination,
    @Query() query: Record<string, string>,
  ) {
    return this.service.list(pagination, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin user detail' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an admin user' })
  create(@Body() dto: CreateAdminUserDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary:
      'Upload an admin avatar — saves it in the admin folder and returns { url, path } to set via admin update.',
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
      'Remove the admin avatar — deletes the physical file and clears imageUrl/imagePath.',
  })
  removeImage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.removeImage(id, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an admin user (name, role, password, active)',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an admin user (cannot delete yourself)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.remove(id, user);
  }
}
