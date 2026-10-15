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
import { CreateSystemSettingDto } from '../dtos/create-system-setting.dto';
import { UpdateSystemSettingDto } from '../dtos/update-system-setting.dto';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminSystemSettingService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * All settings grouped for a key-value editor UI. When pagination filters
   * are absent this returns the full flat list grouped by `group`.
   */
  async grouped() {
    const rows = await this.database.systemSetting.find({
      order: { group: 'ASC', id: 'ASC' },
    });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      const g = row.group ?? 'general';
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(row);
    }
    return [...groups.entries()].map(([group, settings]) => ({
      group,
      settings,
    }));
  }

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.key = ILike(`%${query.q}%`);
    if (query.group) where.group = query.group;
    const [data, count] = await this.database.systemSetting.findAndCount({
      where,
      order: { group: 'ASC', id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const setting = await this.database.systemSetting.findOne({
      where: { id },
    });
    if (!setting) throw new NotFoundException('System setting not found');
    return setting;
  }

  async create(dto: CreateSystemSettingDto, user?: JwtPayload) {
    const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
    const duplicate = await this.database.systemSetting.findOne({
      where: { key },
    });
    if (duplicate) {
      throw new BadRequestException(`Setting "${key}" already exists.`);
    }
    const setting = this.database.systemSetting.create({
      ...dto,
      key,
      value: dto.value ?? '',
      ...creatorFields(user),
    });
    return this.database.systemSetting.save(setting);
  }

  async update(id: number, dto: UpdateSystemSettingDto, user?: JwtPayload) {
    const setting = await this.findOne(id);
    if (dto.key) {
      const key = dto.key.trim().toLowerCase().replace(/\s+/g, '_');
      const duplicate = await this.database.systemSetting.findOne({
        where: { key },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`Setting "${key}" already exists.`);
      }
      setting.key = key;
    }
    Object.assign(setting, dto, updaterFields(user));
    return this.database.systemSetting.save(setting);
  }

  async remove(id: number) {
    const setting = await this.findOne(id);
    await this.database.systemSetting.softRemove(setting);
    return { deleted: true };
  }
}
