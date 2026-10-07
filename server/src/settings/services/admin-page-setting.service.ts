import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import { CreatePageSettingDto } from '../../settings/dtos/create-page-setting.dto';
import { UpdatePageSettingDto } from '../../settings/dtos/update-page-setting.dto';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminPageSettingService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.title = ILike(`%${query.q}%`);
    if (query.key) where.key = ILike(`%${query.key}%`);
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.pageSettings.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const setting = await this.database.pageSettings.findOne({ where: { id } });
    if (!setting) throw new NotFoundException('Page setting not found');
    return setting;
  }

  async create(dto: CreatePageSettingDto, user?: JwtPayload) {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
    await this.ensureKeyAvailable(key);
    const setting = this.database.pageSettings.create({
      ...dto,
      key,
      ...creatorFields(user),
    });
    return this.database.pageSettings.save(setting);
  }

  async update(id: number, dto: UpdatePageSettingDto, user?: JwtPayload) {
    const setting = await this.findOne(id);
    if (dto.key) {
      const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
      await this.ensureKeyAvailable(key, id);
      setting.key = key;
    }
    Object.assign(setting, dto, updaterFields(user));
    return this.database.pageSettings.save(setting);
  }

  async remove(id: number) {
    const setting = await this.findOne(id);
    await this.database.pageSettings.softRemove(setting);
    return { deleted: true };
  }

  private async ensureKeyAvailable(key: string, excludeId?: number) {
    const existing = await this.database.pageSettings.findOne({
      where: { key },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `Page key "${key}" already exists. Use a unique key like "about_us".`,
      );
    }
  }
}
