import { Injectable, NotFoundException } from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateCollectionDto } from '../dtos/create-collection.dto';
import { UpdateCollectionDto } from '../dtos/update-collection.dto';
import {
  creatorFields,
  slugify,
  updaterFields,
} from '../../utils/catalog.utils';

@Injectable()
export class AdminCollectionService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    if (query.q) where.name = ILike(`%${query.q}%`);
    const [data, count] = await this.database.collection.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const collection = await this.database.collection.findOne({
      where: { id },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  create(dto: CreateCollectionDto, user?: JwtPayload) {
    return this.database.collection.save(
      this.database.collection.create({
        ...dto,
        slug: dto.slug ?? slugify(dto.name),
        ...creatorFields(user),
      }),
    );
  }

  async update(id: number, dto: UpdateCollectionDto, user?: JwtPayload) {
    const collection = await this.findOne(id);
    Object.assign(collection, dto, updaterFields(user));
    return this.database.collection.save(collection);
  }

  async remove(id: number) {
    const collection = await this.findOne(id);
    await this.database.collection.softRemove(collection);
    return { deleted: true };
  }
}
