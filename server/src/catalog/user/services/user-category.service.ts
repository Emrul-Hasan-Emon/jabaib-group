import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

/** Storefront-facing read model for categories (public catalog browsing). */
@Injectable()
export class UserCategoryService {
  constructor(private readonly database: DatabaseService) {}

  async listActive() {
    return this.database.category.find({
      where: { isActive: true },
      relations: { parent: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  async tree() {
    const all = await this.database.category.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const byId = new Map<number, any>();
    for (const c of all) byId.set(c.id, { ...c, childrenNodes: [] });
    const roots: any[] = [];
    for (const c of byId.values()) {
      if (c.parentId && byId.has(c.parentId)) {
        byId.get(c.parentId)!.childrenNodes.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots;
  }
}
