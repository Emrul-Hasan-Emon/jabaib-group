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
import { CreateLanguageDto } from '../dtos/create-language.dto';
import { UpdateLanguageDto } from '../dtos/update-language.dto';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminLanguageService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.language.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const language = await this.database.language.findOne({ where: { id } });
    if (!language) throw new NotFoundException('Language not found');
    return language;
  }

  async create(dto: CreateLanguageDto, user?: JwtPayload) {
    const code = dto.code.trim().toLowerCase();
    const duplicate = await this.database.language.findOne({ where: { code } });
    if (duplicate) {
      throw new BadRequestException(`Language "${code}" already exists.`);
    }
    if (dto.isDefault) await this.clearDefault();
    const language = this.database.language.create({
      ...dto,
      code,
      isDefault: dto.isDefault ?? false,
      ...creatorFields(user),
    });
    return this.database.language.save(language);
  }

  async update(id: number, dto: UpdateLanguageDto, user?: JwtPayload) {
    const language = await this.findOne(id);
    if (dto.code) {
      const code = dto.code.trim().toLowerCase();
      const duplicate = await this.database.language.findOne({
        where: { code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`Language "${code}" already exists.`);
      }
      language.code = code;
    }
    if (dto.isDefault) await this.clearDefault(id);
    Object.assign(language, dto, updaterFields(user));
    return this.database.language.save(language);
  }

  async remove(id: number) {
    const language = await this.findOne(id);
    if (language.isDefault) {
      throw new BadRequestException(
        'Cannot delete the default language — set another language as default first.',
      );
    }
    await this.database.language.softRemove(language);
    return { deleted: true };
  }

  /** Ensures exactly one language has isDefault = true. */
  private async clearDefault(excludeId?: number) {
    await this.database.language
      .createQueryBuilder()
      .update()
      .set({ isDefault: false })
      .where(excludeId ? 'id != :excludeId' : '1 = 1')
      .setParameters(excludeId ? { excludeId } : {})
      .execute();
  }
}
