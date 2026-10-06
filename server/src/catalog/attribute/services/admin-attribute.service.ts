import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike } from 'typeorm';
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
import { creatorFields, slugify, updaterFields } from '../../utils/catalog.utils';

@Injectable()
export class AdminAttributeService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.q) where.name = ILike(`%${query.q}%`);
    const [data, count] = await this.database.attribute.findAndCount({
      where,
      relations: { values: true },
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
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

  create(dto: CreateAttributeDto, user?: JwtPayload) {
    return this.database.attribute.save(
      this.database.attribute.create({
        ...dto,
        slug: dto.slug ?? slugify(dto.name),
        ...creatorFields(user),
      }),
    );
  }

  async update(id: number, dto: UpdateAttributeDto, user?: JwtPayload) {
    const attribute = await this.findOne(id);
    Object.assign(attribute, dto, updaterFields(user));
    return this.database.attribute.save(attribute);
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
