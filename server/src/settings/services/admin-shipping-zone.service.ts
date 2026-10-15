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
import { CreateShippingZoneDto } from '../dtos/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from '../dtos/update-shipping-zone.dto';
import { DeliveryType } from '../../database/enums/enums';
import {
  creatorFields,
  updaterFields,
} from '../../catalog/utils/catalog.utils';

@Injectable()
export class AdminShippingZoneService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const where: Record<string, unknown> = {};
    if (query.q) where.name = ILike(`%${query.q}%`);
    if (query.code) where.code = query.code;
    if (query.isActive !== undefined)
      where.isActive = query.isActive === 'true';
    const [data, count] = await this.database.shippingZone.findAndCount({
      where,
      order: { id: 'ASC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data, count, pagination);
  }

  async findOne(id: number) {
    const zone = await this.database.shippingZone.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async create(dto: CreateShippingZoneDto, user?: JwtPayload) {
    const code = dto.code.trim().toLowerCase() as DeliveryType;
    const duplicate = await this.database.shippingZone.findOne({
      where: { code },
    });
    if (duplicate) {
      throw new BadRequestException(
        `A "${code}" shipping zone already exists — update it instead of creating a duplicate.`,
      );
    }
    const zone = this.database.shippingZone.create({
      ...dto,
      code,
      charge: Number(dto.charge),
      ...creatorFields(user),
    });
    return this.database.shippingZone.save(zone);
  }

  async update(id: number, dto: UpdateShippingZoneDto, user?: JwtPayload) {
    const zone = await this.findOne(id);
    if (dto.code) {
      const code = dto.code.trim().toLowerCase() as DeliveryType;
      const duplicate = await this.database.shippingZone.findOne({
        where: { code },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `A "${code}" shipping zone already exists.`,
        );
      }
      zone.code = code;
    }
    Object.assign(
      zone,
      dto,
      dto.charge !== undefined ? { charge: Number(dto.charge) } : {},
      updaterFields(user),
    );
    return this.database.shippingZone.save(zone);
  }

  async remove(id: number) {
    const zone = await this.findOne(id);
    await this.database.shippingZone.softRemove(zone);
    return { deleted: true };
  }
}
