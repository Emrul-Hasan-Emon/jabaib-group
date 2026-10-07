import * as crypto from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Param,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { PaymentMethod } from '../../database/enums/enums';
import { PaymentCallbackDto } from '../dtos/payment-callback.dto';
import { PaymentCallbackService } from '../services/payment-callback.service';

const ONLINE_PROVIDERS = [
  PaymentMethod.BKASH,
  PaymentMethod.NAGAD,
  PaymentMethod.CARD,
];

@ApiTags('Payment Callbacks')
@Controller({ path: 'payment/callback', version: '1' })
export class PaymentCallbackController {
  constructor(
    private readonly service: PaymentCallbackService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post(':provider')
  @ApiOperation({
    summary: 'bKash/Nagad/card gateway callback — updates Payment + Order',
  })
  handle(
    @Param('provider') provider: string,
    @Body() dto: PaymentCallbackDto,
    @Headers('x-callback-signature') signature: string | undefined,
  ) {
    if (!ONLINE_PROVIDERS.includes(provider as PaymentMethod)) {
      throw new BadRequestException(`Unknown payment provider "${provider}"`);
    }
    this.verifySignature(dto, signature);
    return this.service.handle(provider as PaymentMethod, dto);
  }

  /**
   * Placeholder verification until the real provider SDKs (bKash/Nagad/card)
   * are wired in — each has its own signature scheme. For now every callback is
   * HMAC-SHA256 signed with a shared secret.
   *
   * Fails CLOSED in production: if the secret is missing the endpoint refuses
   * every call rather than trusting unsigned requests (an attacker could
   * otherwise mark arbitrary orders as paid). The skip only applies to local
   * development, where there is no real gateway to sign anything.
   */
  private verifySignature(dto: PaymentCallbackDto, signature?: string): void {
    const secret = this.configService.get<string>('PAYMENT_CALLBACK_SECRET');
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';

    if (!secret) {
      if (isProduction) {
        throw new ServiceUnavailableException(
          'Payment callbacks are disabled: PAYMENT_CALLBACK_SECRET is not configured',
        );
      }
      return;
    }
    if (!signature) {
      throw new UnauthorizedException('Missing callback signature');
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(dto))
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const givenBuf = Buffer.from(signature, 'hex');
    const valid =
      expectedBuf.length === givenBuf.length &&
      crypto.timingSafeEqual(expectedBuf, givenBuf);
    if (!valid) {
      throw new UnauthorizedException('Invalid callback signature');
    }
  }
}
