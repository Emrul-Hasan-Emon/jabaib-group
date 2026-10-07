import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { UserWishlistService } from '../services/user-wishlist.service';

@ApiTags('Catalog — Wishlist (customer)')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'user/wishlist', version: '1' })
export class UserWishlistController {
  constructor(private readonly service: UserWishlistService) {}

  @Get()
  @ApiOperation({ summary: 'My wishlist with product summaries' })
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.id);
  }

  @Get('ids')
  @ApiOperation({ summary: 'My wishlist product ids (heart states)' })
  ids(@CurrentUser() user: JwtPayload) {
    return this.service.ids(user.id);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add a product to my wishlist (idempotent)' })
  add(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.service.add(user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a product from my wishlist' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.service.remove(user.id, productId);
  }
}
