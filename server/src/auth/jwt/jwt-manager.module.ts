import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { JwtManagerService } from './jwt-manager.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_DURATION') ??
            '1d') as SignOptions['expiresIn'],
          algorithm: 'HS512',
        },
      }),
    }),
  ],
  providers: [JwtManagerService],
  exports: [JwtManagerService, JwtModule],
})
export class JwtManagerModule {}
