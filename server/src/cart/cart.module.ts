import { Module } from '@nestjs/common';
import { UserCartController } from './controllers/user-cart.controller';
import { UserCartService } from './services/user-cart.service';

@Module({
  controllers: [UserCartController],
  providers: [UserCartService],
})
export class CartModule {}
