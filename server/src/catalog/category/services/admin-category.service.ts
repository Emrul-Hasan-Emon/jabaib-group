import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ILike } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { Category } from '../../../database/entities/category.entity';
import { JwtPayload } from '../../../auth/jwt/jwt-payload';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { CreateCategoryDto } from '../dtos/create-category.dto';
import { UpdateCategoryDto } from '../dtos/update-category.dto';
import { creatorFields, slugify, updaterFields } from '../../utils/catalog.utils';

@Injectable()
export class AdminCategoryService {
  constructor(private readonly database: DatabaseService) {}

  async list(
    pagination: Pagination,
    query: Record<string, string>,
  ) {
    const where: Record<string, unknown> = {};
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.parentId !== undefined)
      where.parentId = query.parentId === 'null' ? null : Number(query.parentId);
    if (query.q) {
      where.name = ILike(`%${query.q}%`);
    }
    const [data, count] = await this.database.category.findAndCount({
      where,
      relations: { parent: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async tree() {
    const all = await this.database.category.find({
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const byId = new Map<number, Category & { childrenNodes?: Category[] }>();
    for (const c of all) byId.set(c.id, { ...c, childrenNodes: [] });
    const roots: (Category & { childrenNodes?: Category[] })[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.childrenNodes!.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }

  async findOne(id: number) {
    const category = await this.database.category.findOne({
      where: { id },
      relations: { parent: true },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  create(dto: CreateCategoryDto, user?: JwtPayload) {
    const category = this.database.category.create({
      ...dto,
      slug: dto.slug ?? slugify(dto.name),
      ...creatorFields(user),
    });
    return this.database.category.save(category);
  }

  async update(id: number, dto: UpdateCategoryDto, user?: JwtPayload) {
    const category = await this.findOne(id);
    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    Object.assign(category, dto, updaterFields(user));
    return this.database.category.save(category);
  }

  async remove(id: number) {
    const category = await this.findOne(id);
    await this.database.category.softRemove(category);
    return { deleted: true };
  }
}
