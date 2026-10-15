import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * Read-only storefront location data for address forms. Only active rows
 * are exposed and districts are always resolved through their parent
 * division, so the client can cascade-select country → division → district.
 */
@Injectable()
export class UserLocationService {
  constructor(private readonly database: DatabaseService) {}

  async tree() {
    const countries = await this.database.country.find({
      where: { isActive: true },
      order: { id: 'ASC' },
      relations: {
        divisions: { districts: true },
      },
    });
    // Leave only active divisions + active districts for the public tree.
    return countries.map((c) => ({
      id: c.id,
      name: c.name,
      nameBN: c.nameBN,
      code: c.code,
      divisions: (c.divisions ?? [])
        .filter((d) => d.isActive)
        .map((d) => ({
          id: d.id,
          name: d.name,
          nameBN: d.nameBN,
          districts: (d.districts ?? [])
            .filter((dt) => dt.isActive)
            .map((dt) => ({ id: dt.id, name: dt.name, nameBN: dt.nameBN })),
        })),
    }));
  }

  /** Active divisions for one country (lighter than the full tree). */
  async divisions(countryId?: number) {
    const where: Record<string, unknown> = { isActive: true };
    if (countryId) where.countryId = Number(countryId);
    return this.database.division.find({
      where,
      order: { id: 'ASC' },
      select: { id: true, name: true, nameBN: true, countryId: true },
    });
  }

  /** Active districts for one division. */
  async districts(divisionId?: number) {
    const where: Record<string, unknown> = { isActive: true };
    if (divisionId) where.divisionId = Number(divisionId);
    return this.database.district.find({
      where,
      order: { id: 'ASC' },
      select: { id: true, name: true, nameBN: true, divisionId: true },
    });
  }
}
