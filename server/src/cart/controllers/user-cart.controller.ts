import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import type { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  AddCartItemDto,
  CART_SESSION_HEADER,
  MergeCartDto,
  UpdateCartItemDto,
} from '../dtos/cart.dto';
import { UserCartService } from '../services/user-cart.service';

/**
 * Customer cart. Public so guests can browse a cart too: guests are identified
 * by the `x-cart-session` header, signed-in customers by their userId (and the
 * guest cart is folded in on login via POST user/cart/merge).
 */
@ApiTags('Cart (customer)')
@Controller({ path: 'user/cart', version: '1' })
@ApiHeader({
  name: CART_SESSION_HEADER,
  required: false,
  description: 'Guest cart session id (any stable random string, min 8 chars).',
})
export class UserCartController {
  constructor(private readonly service: UserCartService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'My cart (guest session cart or signed-in cart) with totals',
  })
  get(
    @CurrentUser() user: JwtPayload | null,
    @Headers(CART_SESSION_HEADER) sessionId?: string,
  ) {
    return this.service.get(user?.id ?? null, sessionId);
  }

  @Public()
  @Post('session')
  @ApiOperation({ summary: 'Issue a fresh guest cart session id' })
  newSession() {
    return { sessionId: this.service.newSessionId() };
  }

  @Public()
  @Post('items')
  @ApiOperation({
    summary: 'Add a product (optionally a specific variant) to the cart',
  })
  add(
    @CurrentUser() user: JwtPayload | null,
    @Headers(CART_SESSION_HEADER) sessionId: string | undefined,
    @Body() dto: AddCartItemDto,
  ) {
    return this.service.add(user?.id ?? null, sessionId, dto);
  }

  @Public()
  @Patch('items/:id')
  @ApiOperation({
    summary: 'Change the quantity of a cart line (clamped to stock)',
  })
  updateQuantity(
    @CurrentUser() user: JwtPayload | null,
    @Headers(CART_SESSION_HEADER) sessionId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.service.updateQuantity(
      user?.id ?? null,
      sessionId,
      id,
      dto.quantity,
    );
  }

  @Public()
  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove one line from the cart' })
  removeItem(
    @CurrentUser() user: JwtPayload | null,
    @Headers(CART_SESSION_HEADER) sessionId: string | undefined,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.removeItem(user?.id ?? null, sessionId, id);
  }

  @Public()
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Empty the cart' })
  clear(
    @CurrentUser() user: JwtPayload | null,
    @Headers(CART_SESSION_HEADER) sessionId?: string,
  ) {
    return this.service.clear(user?.id ?? null, sessionId);
  }

  @Post('merge')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Merge the guest cart into mine (call right after login)',
  })
  merge(
    @CurrentUser() user: JwtPayload,
    @Headers(CART_SESSION_HEADER) sessionId: string | undefined,
    @Body() dto: MergeCartDto,
  ) {
    return this.service.merge(user.id, dto.sessionId ?? sessionId);
  }
}
