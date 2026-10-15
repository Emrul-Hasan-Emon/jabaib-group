import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class JwtManagerService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly database: DatabaseService,
  ) {}

  createAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_DURATION') ??
        '1d') as SignOptions['expiresIn'],
    });
  }

  async createRefreshToken(
    payload: JwtPayload,
    loginDetails?: { userAgent?: string; origin?: string },
  ): Promise<string> {
    const token = this.jwtService.sign(
      {
        sub: payload.sub,
        id: payload.id,
        type: payload.type,
        tokenVersion: 'refresh',
      },
      {
        expiresIn: (this.configService.get<string>('JWT_REFRESH_DURATION') ??
          '30d') as SignOptions['expiresIn'],
      },
    );
    await this.database.authToken.save({
      userId: payload.id,
      userType: payload.type,
      token,
      userAgent: loginDetails?.userAgent ?? null,
      origin: loginDetails?.origin ?? null,
      revoked: false,
    });
    return token;
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.database.authToken.findOne({
      where: { token, revoked: false },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token revoked or unknown');
    }
    return payload;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const stored = await this.database.authToken.findOne({ where: { token } });
    if (stored) {
      stored.revoked = true;
      await this.database.authToken.save(stored);
    }
  }
}
