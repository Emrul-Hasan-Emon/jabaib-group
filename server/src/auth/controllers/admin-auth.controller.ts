import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, LoginDetails } from '../services/auth.service';
import { AdminLoginDto, LogoutDto, RefreshTokenDto } from '../dto/login.dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { JwtPayload } from '../jwt/jwt-payload';

@ApiTags('Auth — Admin')
@Controller({ path: 'admin/auth', version: '1' })
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  private loginDetailsFrom(req: Request): LoginDetails {
    return {
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Admin login with email + password' })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(
      dto.email,
      dto.password,
      this.loginDetailsFrom(req),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate an admin refresh token for a new token pair',
  })
  adminRefresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(
      dto.refreshToken,
      this.loginDetailsFrom(req),
    );
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an admin refresh token' })
  adminLogout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current admin profile' })
  adminMe(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }
}
