import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserPaymentGatewayService } from '../services/user-payment-gateway.service';
import { Public } from '../../../auth/decorators/public.decorator';

/**
 * Storefront payment options. Public (and optional-auth) so the checkout page
 * can render the configured gateways before sign-in.
 */
@ApiTags('Payment Gateways — User')
@Public()
@Controller({ path: 'user/payment-gateway', version: '1' })
export class UserPaymentGatewayController {
  constructor(private readonly service: UserPaymentGatewayService) {}

  @Get()
  @ApiOperation({
    summary:
      'Active payment gateways with their instructions and the fields a manual payment must collect.',
  })
  list() {
    return this.service.listActive();
  }
}