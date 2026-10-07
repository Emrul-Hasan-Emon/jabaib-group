import { Module } from '@nestjs/common';
import { FileModule } from '../file/file.module';
import { MarketingModule } from '../marketing/marketing.module';
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminOrderService } from './services/admin-order.service';
import { AdminOrderReturnController } from './controllers/admin-order-return.controller';
import { AdminOrderReturnService } from './services/admin-order-return.service';
import { UserOrderController } from './user/controllers/user-order.controller';
import { UserCheckoutController } from './user/controllers/user-checkout.controller';
import { UserOrderService } from './user/services/user-order.service';
import { UserCheckoutService } from './user/services/user-checkout.service';
import { PaymentCallbackController } from './controllers/payment-callback.controller';
import { PaymentCallbackService } from './services/payment-callback.service';

@Module({
  imports: [FileModule, MarketingModule],
  controllers: [
    AdminOrderController,
    AdminOrderReturnController,
    UserOrderController,
    UserCheckoutController,
    PaymentCallbackController,
  ],
  providers: [
    AdminOrderService,
    AdminOrderReturnService,
    UserOrderService,
    UserCheckoutService,
    PaymentCallbackService,
  ],
})
export class OrdersModule {}
