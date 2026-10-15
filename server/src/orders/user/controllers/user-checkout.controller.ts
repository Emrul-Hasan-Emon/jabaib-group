import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../../../auth/jwt/jwt-payload';
import { PreviewCheckoutDto } from '../dtos/user-order.dto';
import { UserCheckoutService } from '../services/user-checkout.service';

/** Order totals are recomputed server-side on every preview. */
@ApiTags('Checkout (customer)')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'user/checkout', version: '1' })
export class UserCheckoutController {
  constructor(private readonly service: UserCheckoutService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Preview checkout totals (items, address, delivery charge, coupon, total)',
  })
  preview(@CurrentUser() user: JwtPayload, @Body() dto: PreviewCheckoutDto) {
    return this.service.preview(user, dto);
  }
}
