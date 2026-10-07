import { Injectable, NotFoundException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../database/database.service';
import { JwtPayload } from '../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../common/decorators/pagination-params';
import { CreateCountryDto } from '../dtos/location.dto';
import { UpdateCountryDto } from '../dtos/location.dto';
import {
  slugify,
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminCountryService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) {
      where.name = ILike(`%${query.q}%`);
    }
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.country.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    const rows = await this.withDivisionCounts(data);
    return getPaginateData(rows, count, pagination);
  }

  /** Countries → active divisions → active districts, for pickers and storefront. */
  tree() {
    return this.database.country.find({
      order: { id: 'ASC' },
      relations: {
        divisions: { districts: true },
      },
    });
  }

  async findOne(id: number) {
    const country = await this.database.country.findOne({
      where: { id },
      relations: { divisions: true },
    });
    if (!country) throw new NotFoundException('Country not found');
    return country;
  }

  async create(dto: CreateCountryDto, user?: JwtPayload) {
    const country = this.database.country.create({
      ...dto,
      slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
      ...creatorFields(user),
    });
    return this.database.country.save(country);
  }

  async update(id: number, dto: UpdateCountryDto, user?: JwtPayload) {
    const country = await this.findOne(id);
    if (dto.slug) dto.slug = slugify(dto.slug);
    Object.assign(country, dto, updaterFields(user));
    return this.database.country.save(country);
  }

  async remove(id: number) {
    const country = await this.findOne(id);
    await this.database.country.softRemove(country);
    return { deleted: true };
  }

  private async withDivisionCounts(
    data: import('../../database/entities/country.entity').Country[],
  ) {
    const ids = data.map((c) => c.id);
    if (!ids.length) return data;
    const rows = await this.database.division
      .createQueryBuilder('division')
      .select('division.countryId', 'countryId')
      .addSelect('COUNT(*)', 'cnt')
      .where('division.countryId IN (:...ids)', { ids })
      .groupBy('division.countryId')
      .getRawMany<{ countryId: number; cnt: string }>();
    const map = new Map(rows.map((r) => [Number(r.countryId), Number(r.cnt)]));
    return data.map((c) => ({ ...c, divisionCount: map.get(c.id) ?? 0 }));
  }
}
