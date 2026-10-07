import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

/** Storefront banners: active, currently inside their (optional) date window. */
@Injectable()
export class UserBannerService {
  constructor(private readonly database: DatabaseService) {}

  async list(position?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (position) where.position = position;
    const banners = await this.database.banner.find({
      where,
      order: { sortOrder: 'ASC', id: 'DESC' },
    });
    const now = Date.now();
    return banners.filter((b) => {
      if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
      if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
      return true;
    });
  }
}
