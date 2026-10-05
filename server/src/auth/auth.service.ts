import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { AdminUser } from '../database/entities/admin-user.entity';
import { User } from '../database/entities/user.entity';
import { JwtManagerService } from './jwt/jwt-manager.service';
import { JwtPayload } from './jwt/jwt-payload';

export interface LoginDetails {
  userAgent?: string;
  origin?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtManager: JwtManagerService,
  ) {}

  async adminLogin(email: string, password: string, loginDetails?: LoginDetails) {
    const admin = await this.database.adminUser.findOne({
      where: { email },
    });
    if (!admin || !admin.isActive || !(await this.checkPassword(password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(this.adminPayload(admin), loginDetails);
  }

  async userLogin(emailOrPhone: string, password: string, loginDetails?: LoginDetails) {
    const user = await this.database.user.findOne({
      where: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });
    if (!user || !user.isActive || !user.passwordHash || !(await this.checkPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(this.userPayload(user), loginDetails);
  }

  async refresh(refreshToken: string, loginDetails?: LoginDetails) {
    const payload = await this.jwtManager.verifyRefreshToken(refreshToken);
    // Load the current record so disabled accounts can't refresh.
    const fresh =
      payload.type === 'admin'
        ? await this.database.adminUser.findOne({ where: { id: payload.id } })
        : await this.database.user.findOne({ where: { id: payload.id } });
    if (!fresh || !fresh.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    await this.jwtManager.revokeRefreshToken(refreshToken);
    const newPayload: JwtPayload =
      payload.type === 'admin'
        ? this.adminPayload(fresh as AdminUser)
        : this.userPayload(fresh as User);
    return this.issueTokens(newPayload, loginDetails);
  }

  async logout(refreshToken: string) {
    await this.jwtManager.revokeRefreshToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async me(payload: JwtPayload) {
    if (payload.type === 'admin') {
      const admin = await this.database.adminUser.findOne({
        where: { id: payload.id },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      });
      return admin;
    }
    const user = await this.database.user.findOne({
      where: { id: payload.id },
      select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
    });
    return user;
  }

  private async issueTokens(payload: JwtPayload, loginDetails?: LoginDetails) {
    const accessToken = this.jwtManager.createAccessToken(payload);
    const refreshToken = await this.jwtManager.createRefreshToken(
      payload,
      loginDetails,
    );
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: payload.id,
        type: payload.type,
        role: payload.role,
        name: payload.userName,
        sub: payload.sub,
      },
    };
  }

  private adminPayload(admin: AdminUser): JwtPayload {
    return {
      sub: admin.email,
      id: admin.id,
      type: 'admin',
      role: admin.role,
      userName: admin.name,
    };
  }

  private userPayload(user: User): JwtPayload {
    return {
      sub: user.email ?? user.phone,
      id: user.id,
      type: 'user',
      role: null,
      userName: user.name,
    };
  }

  private checkPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
