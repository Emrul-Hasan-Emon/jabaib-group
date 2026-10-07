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
import { CreateDivisionDto } from '../dtos/location.dto';
import { UpdateDivisionDto } from '../dtos/location.dto';
import {
  slugify,
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminDivisionService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.division
      .createQueryBuilder('division')
      .leftJoinAndSelect('division.country', 'country')
      .orderBy('division.id', 'ASC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.q) {
      qb.andWhere(
        '(division.name ILIKE :q OR division.nameBN ILIKE :q OR division.slug ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (query.isActive !== undefined)
      qb.andWhere('division.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    if (query.countryId !== undefined)
      qb.andWhere('division.countryId = :countryId', {
        countryId: Number(query.countryId),
      });

    const [data, count] = await qb.getManyAndCount();
    const ids = data.map((d) => d.id);
    const countsMap = new Map<number, number>();
    if (ids.length) {
      const rows = await this.database.district
        .createQueryBuilder('district')
        .select('district.divisionId', 'divisionId')
        .addSelect('COUNT(*)', 'cnt')
        .where('district.divisionId IN (:...ids)', { ids })
        .groupBy('district.divisionId')
        .getRawMany<{ divisionId: number; cnt: string }>();
      for (const r of rows) countsMap.set(Number(r.divisionId), Number(r.cnt));
    }
    const rows = data.map((d) => ({
      ...d,
      districtCount: countsMap.get(d.id) ?? 0,
    }));
    return getPaginateData(rows, count, pagination);
  }

  async findOne(id: number) {
    const division = await this.database.division.findOne({
      where: { id },
      relations: { country: true, districts: true },
    });
    if (!division) throw new NotFoundException('Division not found');
    return division;
  }

  async create(dto: CreateDivisionDto, user?: JwtPayload) {
    await this.ensureCountry(dto.countryId);
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(dto.countryId, slug);
    const division = this.database.division.create({
      ...dto,
      slug,
      ...creatorFields(user),
    });
    return this.database.division.save(division);
  }

  async update(id: number, dto: UpdateDivisionDto, user?: JwtPayload) {
    const division = await this.findOne(id);
    if (dto.countryId !== undefined) {
      await this.ensureCountry(dto.countryId);
    }
    let slug: string | undefined;
    if (dto.slug) slug = slugify(dto.slug);
    else if (dto.name) slug = slugify(dto.name);
    if (slug) {
      await this.ensureSlugAvailable(
        dto.countryId ?? division.countryId,
        slug,
        id,
      );
      division.slug = slug;
    }
    Object.assign(division, dto, updaterFields(user));
    return this.database.division.save(division);
  }

  async remove(id: number) {
    const division = await this.findOne(id);
    await this.database.division.softRemove(division);
    return { deleted: true };
  }

  private async ensureCountry(countryId: number) {
    const country = await this.database.country.findOne({
      where: { id: countryId },
    });
    if (!country) throw new BadRequestException('Country not found');
    return country;
  }

  private async ensureSlugAvailable(
    countryId: number,
    slug: string,
    excludeId?: number,
  ) {
    const existing = await this.database.division.findOne({
      where: { countryId, slug },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `A division with slug "${slug}" already exists in this country.`,
      );
    }
  }
}
