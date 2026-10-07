import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import { CreateAdminUserDto, UpdateAdminUserDto } from '../dtos/admin-user.dto';
import { AdminUserRoleEnum } from '../../database/enums/user-type.enum';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';
import { FileHandleService } from '../../file/services/file-handle.service';
import { UPLOAD_FOLDERS } from '../../file/upload-folders';

@Injectable()
export class AdminUserManagementService {
  constructor(
    private readonly database: DatabaseService,
    private readonly fileHandle: FileHandleService,
  ) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.adminUser.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const admin = await this.database.adminUser.findOne({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');
    return admin;
  }

  async create(dto: CreateAdminUserDto, user?: JwtPayload) {
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.database.adminUser.findOne({
      where: { email },
    });
    if (duplicate) {
      throw new ConflictException('An admin with this email already exists.');
    }
    const admin = this.database.adminUser.create({
      ...dto,
      email,
      passwordHash: await bcrypt.hash(dto.password, 10),
      isActive: dto.isActive ?? true,
      ...creatorFields(user),
    });
    return this.database.adminUser.save(admin);
  }

  async update(id: number, dto: UpdateAdminUserDto, actor: JwtPayload) {
    const admin = await this.findOne(id);
    if (dto.password) {
      admin.passwordHash = await bcrypt.hash(dto.password, 10);
    }
    if (dto.isActive === false && admin.id === Number(actor.id)) {
      throw new BadRequestException('You cannot disable your own account.');
    }
    const nextRole = dto.role ?? admin.role;
    const staysActive = dto.isActive ?? admin.isActive;
    if (
      admin.role === AdminUserRoleEnum.SUPER_ADMIN &&
      (nextRole !== AdminUserRoleEnum.SUPER_ADMIN || !staysActive)
    ) {
      const superAdmins = await this.database.adminUser.count({
        where: { role: AdminUserRoleEnum.SUPER_ADMIN, isActive: true },
      });
      if (superAdmins <= 1) {
        throw new BadRequestException(
          'Cannot demote or disable the last active super admin.',
        );
      }
    }
    const previousAvatarPath = admin.imagePath;
    Object.assign(admin, dto, updaterFields(actor));
    const saved = await this.database.adminUser.save(admin);
    // Replace/clear the avatar: delete the superseded physical file.
    if (
      previousAvatarPath &&
      saved.imagePath !== previousAvatarPath &&
      this.fileHandle.belongsTo(UPLOAD_FOLDERS.adminUser, previousAvatarPath)
    ) {
      this.fileHandle.removeIfExists(previousAvatarPath);
    }
    return saved;
  }

  /** Feature-owned upload: stores in the admin folder, returns url/path. */
  uploadImage(file: Express.Multer.File) {
    return this.fileHandle.uploadFile(file, UPLOAD_FOLDERS.adminUser);
  }

  /** Feature-owned removal: deletes the physical avatar file and clears the fields. */
  async removeImage(id: number, actor: JwtPayload) {
    const admin = await this.findOne(id);
    const previousAvatarPath = admin.imagePath;
    Object.assign(admin, { imageUrl: '', imagePath: '' }, updaterFields(actor));
    const saved = await this.database.adminUser.save(admin);
    if (previousAvatarPath) this.fileHandle.removeIfExists(previousAvatarPath);
    return saved;
  }

  async remove(id: number, actor: JwtPayload) {
    if (id === Number(actor.id)) {
      throw new BadRequestException('You cannot delete your own account.');
    }
    const admin = await this.findOne(id);
    if (admin.role === AdminUserRoleEnum.SUPER_ADMIN) {
      const superAdmins = await this.database.adminUser.count({
        where: { role: AdminUserRoleEnum.SUPER_ADMIN, isActive: true },
      });
      if (superAdmins <= 1 && admin.isActive) {
        throw new BadRequestException(
          'Cannot delete the last active super admin.',
        );
      }
    }
    await this.database.adminUser.softRemove(admin);
    return { deleted: true };
  }
}
