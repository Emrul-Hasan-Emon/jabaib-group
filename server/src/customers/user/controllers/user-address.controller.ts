import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAddressService } from '../services/user-address.service';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/address.dto';

@ApiTags('Customer — Address Book')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'user/address', version: '1' })
export class UserAddressController {
  constructor(private readonly service: UserAddressService) {}

  @Get()
  @ApiOperation({ summary: 'My addresses (default first)' })
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add an address (+ optional set default)' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAddressDto) {
    return this.service.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update one of my addresses' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete one of my addresses' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(user.id, id);
  }

  @Post(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make this my default address' })
  setDefault(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.setDefault(user.id, id);
  }
}
