import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { MarketingModule } from '../marketing/marketing.module';
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminOrderService } from './services/admin-order.service';
import { AdminOrderReturnController } from './controllers/admin-order-return.controller';
import { AdminOrderReturnService } from './services/admin-order-return.service';
import { UserOrderController } from './controllers/user-order.controller';
import { UserCheckoutController } from './controllers/user-checkout.controller';
import { UserOrderService } from './services/user-order.service';
import { UserCheckoutService } from './services/user-checkout.service';
import { PaymentCallbackController } from './controllers/payment-callback.controller';
import { PaymentCallbackService } from './services/payment-callback.service';
import { AdminPaymentGatewayController } from './controllers/admin-payment-gateway.controller';
import { AdminPaymentGatewayService } from './services/admin-payment-gateway.service';
import { UserPaymentGatewayController } from './controllers/user-payment-gateway.controller';
import { UserPaymentGatewayService } from './services/user-payment-gateway.service';

@Module({
  imports: [FileModule, MarketingModule],
  controllers: [
    AdminOrderController,
    AdminOrderReturnController,
    UserOrderController,
    UserCheckoutController,
    PaymentCallbackController,
    AdminPaymentGatewayController,
    UserPaymentGatewayController,
  ],
  providers: [
    AdminOrderService,
    AdminOrderReturnService,
    UserOrderService,
    UserCheckoutService,
    PaymentCallbackService,
    AdminPaymentGatewayService,
    UserPaymentGatewayService,
  ],
})
export class OrdersModule {}
