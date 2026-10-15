import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { Address } from '../../../database/entities/address.entity';
import { AddressType } from '../../../database/enums/enums';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/address.dto';

/**
 * Customer address book. Every query is scoped to the caller's userId so a
 * customer can never read or mutate someone else's addresses.
 */
@Injectable()
export class UserAddressService {
  constructor(private readonly database: DatabaseService) {}

  async list(userId: number) {
    return this.database.address.find({
      where: { userId },
      relations: { division: true, district: true },
      order: { isDefault: 'DESC', id: 'DESC' },
    });
  }

  async create(userId: number, dto: CreateAddressDto) {
    const data: Partial<Address> = {
      userId,
      recipientName: dto.recipientName,
      phone: dto.phone,
      address: dto.address,
      divisionId: dto.divisionId,
      districtId: dto.districtId,
      zipCode: dto.zipCode,
      type: dto.type ?? AddressType.SHIPPING,
      isDefault: dto.isDefault ?? false,
      createdBy: userId,
      creatorType: 'user',
    };
    if (data.isDefault) await this.clearDefault(userId, undefined);
    const saved = await this.database.address.save(
      this.database.address.create(data),
    );
    return this.findOne(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateAddressDto) {
    const address = await this.requireOwned(userId, id);
    if (dto.isDefault && !address.isDefault) {
      await this.clearDefault(userId, id);
    }
    Object.assign(address, dto, { updatedBy: userId, updaterType: 'user' });
    await this.database.address.save(address);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number) {
    const address = await this.requireOwned(userId, id);
    await this.database.address.softRemove(address);
    return { deleted: true };
  }

  async setDefault(userId: number, id: number) {
    const address = await this.requireOwned(userId, id);
    await this.clearDefault(userId, id);
    address.isDefault = true;
    await this.database.address.save(address);
    return this.findOne(userId, id);
  }

  async findOne(userId: number, id: number) {
    const address = await this.database.address.findOne({
      where: { id, userId },
      relations: { division: true, district: true },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  private async requireOwned(userId: number, id: number): Promise<Address> {
    const address = await this.database.address.findOne({
      where: { id, userId },
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  /** Un-set the default flag on the user's other addresses. */
  private async clearDefault(userId: number, exceptId?: number) {
    const others = await this.database.address.find({
      where: { userId, isDefault: true },
    });
    const targets = others.filter((a) => a.id !== exceptId);
    if (targets.length) {
      for (const t of targets) {
        t.isDefault = false;
        await this.database.address.save(t);
      }
    }
  }
}
