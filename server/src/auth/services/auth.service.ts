import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { AdminUser } from '../../database/entities/admin-user.entity';
import { User } from '../../database/entities/user.entity';
import { JwtManagerService } from '../jwt/jwt-manager.service';
import { JwtPayload } from '../jwt/jwt-payload';
import { RegisterUserDto } from '../dto/user-auth.dto';
import { UpdateProfileDto } from '../dto/user-auth.dto';

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

  async adminLogin(
    email: string,
    password: string,
    loginDetails?: LoginDetails,
  ) {
    const admin = await this.database.adminUser.findOne({
      where: { email },
    });
    if (
      !admin ||
      !admin.isActive ||
      !(await this.checkPassword(password, admin.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueTokens(this.adminPayload(admin), loginDetails);
  }

  async userLogin(
    emailOrPhone: string,
    password: string,
    loginDetails?: LoginDetails,
  ) {
    const user = await this.database.user.findOne({
      where: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });
    if (
      !user ||
      !user.isActive ||
      !user.passwordHash ||
      !(await this.checkPassword(password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.issueTokens(this.userPayload(user), loginDetails);
  }

  /** Customer self-registration with auto-login. Phone OR email is enough. */
  async register(dto: RegisterUserDto, loginDetails?: LoginDetails) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Either email or phone is required');
    }
    const dupes = await this.database.user.find({
      where: [
        ...(dto.email ? [{ email: dto.email }] : []),
        ...(dto.phone ? [{ phone: dto.phone }] : []),
      ],
    });
    if (dupes.length > 0) {
      const field = dupes.some((u) => dto.email && u.email === dto.email)
        ? 'email'
        : 'phone';
      throw new BadRequestException(`That ${field} is already registered`);
    }
    const passwordHash = await this.hashPassword(dto.password);
    const user = this.database.user.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      creatorType: 'system',
      creatorName: 'Customer self-registration',
    });
    await this.database.user.save(user);
    return this.issueTokens(this.userPayload(user), loginDetails);
  }

  /** Customer edits their own name/phone. Phone must stay unique. */
  async updateProfile(payload: JwtPayload, dto: UpdateProfileDto) {
    const user = await this.requireUser(payload.id);
    if (dto.phone && dto.phone !== user.phone) {
      const clash = await this.database.user.findOne({
        where: { phone: dto.phone },
      });
      if (clash && clash.id !== user.id) {
        throw new BadRequestException('That phone number is already in use');
      }
      user.phone = dto.phone;
    }
    if (dto.name) user.name = dto.name;
    await this.database.user.save(user);
    return this.database.user.findOne({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  /** Customer changes their own password after verifying the current one. */
  async changePassword(
    payload: JwtPayload,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.requireUser(payload.id);
    if (
      !user.passwordHash ||
      !(await this.checkPassword(currentPassword, user.passwordHash))
    ) {
      throw new BadRequestException('Current password is incorrect');
    }
    user.passwordHash = await this.hashPassword(newPassword);
    await this.database.user.save(user);
    return { message: 'Password updated successfully' };
  }

  private async requireUser(id: number): Promise<User> {
    const user = await this.database.user.findOne({ where: { id } });
    if (!user || !user.isActive) {
      throw new NotFoundException('User not found');
    }
    return user;
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
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      return admin;
    }
    const user = await this.database.user.findOne({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
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

  private hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
  }
}
