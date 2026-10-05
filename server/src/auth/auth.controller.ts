import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService, LoginDetails } from './auth.service';
import {
  AdminLoginDto,
  LogoutDto,
  RefreshTokenDto,
  UserLoginDto,
} from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtPayload } from './jwt/jwt-payload';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private loginDetailsFrom(req: Request): LoginDetails {
    return {
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
    };
  }

  // ---------- Admin ----------

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — Admin')
  @ApiOperation({ summary: 'Admin login with email + password' })
  adminLogin(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.authService.adminLogin(dto.email, dto.password, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('admin/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — Admin')
  @ApiOperation({ summary: 'Rotate an admin refresh token for a new token pair' })
  adminRefresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('admin/logout')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — Admin')
  @ApiOperation({ summary: 'Revoke an admin refresh token' })
  adminLogout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('admin/me')
  @ApiTags('Auth — Admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current admin profile' })
  adminMe(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }

  // ---------- User ----------

  @Public()
  @Post('user/login')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — User')
  @ApiOperation({ summary: 'Customer login with email/phone + password' })
  userLogin(@Body() dto: UserLoginDto, @Req() req: Request) {
    return this.authService.userLogin(dto.emailOrPhone, dto.password, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('user/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — User')
  @ApiOperation({ summary: 'Rotate a customer refresh token for a new token pair' })
  userRefresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('user/logout')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth — User')
  @ApiOperation({ summary: 'Revoke a customer refresh token' })
  userLogout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('user/me')
  @ApiTags('Auth — User')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current customer profile' })
  userMe(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }
}
