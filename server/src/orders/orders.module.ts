import { Module } from '@nestjs/common';
import { AdminOrderController } from './controllers/admin-order.controller';
import { AdminOrderService } from './services/admin-order.service';
import { AdminOrderReturnController } from './controllers/admin-order-return.controller';
import { AdminOrderReturnService } from './services/admin-order-return.service';

@Module({
  controllers: [AdminOrderController, AdminOrderReturnController],
  providers: [AdminOrderService, AdminOrderReturnService],
})
export class OrdersModule {}
