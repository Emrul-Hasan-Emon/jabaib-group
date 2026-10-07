import { Module } from '@nestjs/common';
import { AdminCustomerController } from './controllers/admin-customer.controller';
import { AdminCustomerService } from './services/admin-customer.service';

@Module({
  controllers: [AdminCustomerController],
  providers: [AdminCustomerService],
})
export class CustomersModule {}
