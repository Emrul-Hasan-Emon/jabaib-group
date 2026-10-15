import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtPayload } from '../jwt/jwt-payload';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    // Public routes still read a token when one is sent: handlers such as the
    // cart and coupon preview need to tell a guest from a signed-in customer.
    // A missing or invalid token simply means "guest".
    if (isPublic) {
      if (token) {
        await this.attachUser(request, token).catch(() => undefined);
      }
      return true;
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    try {
      await this.attachUser(request, token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async attachUser(request: Request, token: string): Promise<void> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    (request as Request & { user: JwtPayload }).user = payload;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
