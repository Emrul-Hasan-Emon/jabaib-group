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
import { AuthService, LoginDetails } from '../services/auth.service';
import {
  LogoutDto,
  RefreshTokenDto,
  UserLoginDto,
} from '../dto/login.dto';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { JwtPayload } from '../jwt/jwt-payload';

@ApiTags('Auth — User')
@Controller({ path: 'user/auth', version: '1' })
export class UserAuthController {
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
  @ApiOperation({ summary: 'Customer login with email/phone + password' })
  userLogin(@Body() dto: UserLoginDto, @Req() req: Request) {
    return this.authService.userLogin(dto.emailOrPhone, dto.password, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a customer refresh token for a new token pair' })
  userRefresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, this.loginDetailsFrom(req));
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a customer refresh token' })
  userLogout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Current customer profile' })
  userMe(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user);
  }
}
