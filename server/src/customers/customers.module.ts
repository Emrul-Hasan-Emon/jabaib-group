import { Module } from '@nestjs/common';
import { AdminCustomerController } from './controllers/admin-customer.controller';
import { AdminCustomerService } from './services/admin-customer.service';
import { UserAddressController } from './controllers/user-address.controller';
import { UserAddressService } from './services/user-address.service';

@Module({
  controllers: [AdminCustomerController, UserAddressController],
  providers: [AdminCustomerService, UserAddressService],
})
export class CustomersModule {}
