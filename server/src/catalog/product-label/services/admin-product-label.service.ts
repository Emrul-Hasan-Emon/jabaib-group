import {
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
import { CreateProductLabelDto } from '../dtos/create-product-label.dto';
import { UpdateProductLabelDto } from '../dtos/update-product-label.dto';
import { creatorFields, slugify, updaterFields } from '../../utils/catalog.utils';

@Injectable()
export class AdminProductLabelService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.q) where.name = ILike(`%${query.q}%`);
    const [data, count] = await this.database.productLabel.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const label = await this.database.productLabel.findOne({ where: { id } });
    if (!label) throw new NotFoundException('Product label not found');
    return label;
  }

  create(dto: CreateProductLabelDto, user?: JwtPayload) {
    return this.database.productLabel.save(
      this.database.productLabel.create({
        ...dto,
        slug: dto.slug ?? slugify(dto.name),
        ...creatorFields(user),
      }),
    );
  }

  async update(id: number, dto: UpdateProductLabelDto, user?: JwtPayload) {
    const label = await this.findOne(id);
    Object.assign(label, dto, updaterFields(user));
    return this.database.productLabel.save(label);
  }

  async remove(id: number) {
    const label = await this.findOne(id);
    await this.database.productLabel.softRemove(label);
    return { deleted: true };
  }
}
