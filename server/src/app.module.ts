import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { CatalogModule } from './catalog/catalog.module';
import { ModerationModule } from './moderation/moderation.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { MarketingModule } from './marketing/marketing.module';
import { SettingsModule } from './settings/settings.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { JwtManagerModule } from './auth/jwt/jwt-manager.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { HttpExceptionFilter } from './auth/filters/http-exception.filter';
import { DatabaseExceptionFilter } from './auth/filters/database-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        // Global guard: 120 requests / minute per IP. Login endpoints
        // override this with a much tighter limit (@Throttle on the route).
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    JwtManagerModule,
    AuthModule,
    FileModule,
    CatalogModule,
    ModerationModule,
    OrdersModule,
    CustomersModule,
    MarketingModule,
    SettingsModule,
    AdminUsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: DatabaseExceptionFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
