import { Module } from '@nestjs/common';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { UserAuthController } from './controllers/user-auth.controller';
import { AuthService } from './services/auth.service';
import { JwtManagerModule } from './jwt/jwt-manager.module';

@Module({
  imports: [JwtManagerModule],
  controllers: [AdminAuthController, UserAuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
