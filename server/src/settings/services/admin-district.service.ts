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
import { CreateDistrictDto } from '../dtos/location.dto';
import { UpdateDistrictDto } from '../dtos/location.dto';
import {
  slugify,
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminDistrictService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.district
      .createQueryBuilder('district')
      .leftJoinAndSelect('district.division', 'division')
      .leftJoinAndSelect('district.country', 'country')
      .orderBy('district.id', 'ASC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.q) {
      qb.andWhere(
        '(district.name ILIKE :q OR district.nameBN ILIKE :q OR district.slug ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (query.isActive !== undefined)
      qb.andWhere('district.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    if (query.countryId !== undefined)
      qb.andWhere('district.countryId = :countryId', {
        countryId: Number(query.countryId),
      });
    if (query.divisionId !== undefined)
      qb.andWhere('district.divisionId = :divisionId', {
        divisionId: Number(query.divisionId),
      });

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const district = await this.database.district.findOne({
      where: { id },
      relations: { division: true, country: true },
    });
    if (!district) throw new NotFoundException('District not found');
    return district;
  }

  async create(dto: CreateDistrictDto, user?: JwtPayload) {
    await this.validateParents(dto.countryId, dto.divisionId);
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    await this.ensureSlugAvailable(dto.divisionId, slug);
    const district = this.database.district.create({
      ...dto,
      slug,
      ...creatorFields(user),
    });
    return this.database.district.save(district);
  }

  async update(id: number, dto: UpdateDistrictDto, user?: JwtPayload) {
    const district = await this.findOne(id);
    const countryId = dto.countryId ?? district.countryId;
    const divisionId = dto.divisionId ?? district.divisionId;
    await this.validateParents(countryId, divisionId);
    let slug: string | undefined;
    if (dto.slug) slug = slugify(dto.slug);
    else if (dto.name) slug = slugify(dto.name);
    if (slug) {
      await this.ensureSlugAvailable(divisionId, slug, id);
      district.slug = slug;
    }
    Object.assign(district, dto, updaterFields(user));
    return this.database.district.save(district);
  }

  async remove(id: number) {
    const district = await this.findOne(id);
    await this.database.district.softRemove(district);
    return { deleted: true };
  }

  private async validateParents(countryId: number, divisionId: number) {
    const division = await this.database.division.findOne({
      where: { id: divisionId },
    });
    if (!division) throw new BadRequestException('Division not found');
    if (division.countryId !== countryId) {
      throw new BadRequestException(
        'Division does not belong to the selected country.',
      );
    }
  }

  private async ensureSlugAvailable(
    divisionId: number,
    slug: string,
    excludeId?: number,
  ) {
    const existing = await this.database.district.findOne({
      where: { divisionId, slug },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(
        `A district with slug "${slug}" already exists in this division.`,
      );
    }
  }
}
