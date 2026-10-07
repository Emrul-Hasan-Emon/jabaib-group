import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateAttributeDto } from '../dtos/create-attribute.dto';
import { UpdateAttributeDto } from '../dtos/update-attribute.dto';
import { CreateAttributeValueDto } from '../dtos/create-attribute-value.dto';
import { UpdateAttributeValueDto } from '../dtos/update-attribute-value.dto';
import {
  creatorFields,
  slugify,
  updaterFields,
} from '../../utils/catalog.utils';

@Injectable()
export class AdminAttributeService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const qb = this.database.attribute
      .createQueryBuilder('attribute')
      .leftJoinAndSelect('attribute.values', 'values')
      .orderBy('attribute.id', 'ASC')
      .addOrderBy('values.sortOrder', 'ASC')
      .skip(pagination.offset)
      .take(pagination.size);

    if (query.isActive !== undefined) {
      qb.andWhere('attribute.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }
    if (query.q) {
      qb.andWhere('attribute.name ILIKE :q', { q: `%${query.q}%` });
    }
    if (query.valueName) {
      qb.andWhere('values.name ILIKE :valueName', {
        valueName: `%${query.valueName}%`,
      });
    }

    const [data, count] = await qb.getManyAndCount();
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const attribute = await this.database.attribute.findOne({
      where: { id },
      relations: { values: true },
    });
    if (!attribute) throw new NotFoundException('Attribute not found');
    return attribute;
  }

  async create(dto: CreateAttributeDto, user?: JwtPayload) {
    const { values, ...rest } = dto;
    const attribute = await this.database.attribute.save(
      this.database.attribute.create({
        ...rest,
        slug: dto.slug ?? slugify(dto.name),
        ...creatorFields(user),
      }),
    );
    if (values?.length) {
      for (const v of values) {
        await this.database.attributeValue.save(
          this.database.attributeValue.create({
            ...v,
            attributeId: attribute.id,
            ...creatorFields(user),
          }),
        );
      }
    }
    return this.findOne(attribute.id);
  }

  async update(id: number, dto: UpdateAttributeDto, user?: JwtPayload) {
    const attribute = await this.findOne(id);
    const { values, ...rest } = dto;
    Object.assign(attribute, rest, updaterFields(user));
    await this.database.attribute.save(attribute);
    if (values?.length) {
      for (const v of values) {
        await this.database.attributeValue.save(
          this.database.attributeValue.create({
            ...v,
            attributeId: attribute.id,
            ...creatorFields(user),
          }),
        );
      }
    }
    return this.findOne(id);
  }

  async remove(id: number) {
    const attribute = await this.findOne(id);
    await this.database.attribute.softRemove(attribute);
    return { deleted: true };
  }

  // ---- Attribute values ----

  async listValues(attributeId: number) {
    await this.findOne(attributeId);
    return this.database.attributeValue.find({
      where: { attributeId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async createValue(
    attributeId: number,
    dto: CreateAttributeValueDto,
    user?: JwtPayload,
  ) {
    await this.findOne(attributeId);
    return this.database.attributeValue.save(
      this.database.attributeValue.create({
        ...dto,
        attributeId,
        ...creatorFields(user),
      }),
    );
  }

  async updateValue(
    valueId: number,
    dto: UpdateAttributeValueDto,
    user?: JwtPayload,
  ) {
    const value = await this.database.attributeValue.findOne({
      where: { id: valueId },
    });
    if (!value) throw new NotFoundException('Attribute value not found');
    Object.assign(value, dto, updaterFields(user));
    return this.database.attributeValue.save(value);
  }

  async removeValue(valueId: number) {
    const value = await this.database.attributeValue.findOne({
      where: { id: valueId },
    });
    if (!value) throw new NotFoundException('Attribute value not found');
    await this.database.attributeValue.softRemove(value);
    return { deleted: true };
  }
}
