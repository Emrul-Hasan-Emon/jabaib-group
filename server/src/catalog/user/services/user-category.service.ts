import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { Category } from '../../../database/entities/category.entity';

/** A category plus its live product count and nested children. */
type CategoryNode = Category & {
  productCount: number;
  childrenNodes: CategoryNode[];
};

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

  async tree(): Promise<CategoryNode[]> {
    const all = await this.database.category.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const counts = await this.productCounts();

    const byId = new Map<number, CategoryNode>();
    for (const c of all) {
      byId.set(c.id, {
        ...c,
        productCount: counts.get(c.id) ?? 0,
        childrenNodes: [],
      });
    }

    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      const parent = node.parentId ? byId.get(node.parentId) : undefined;
      if (parent) parent.childrenNodes.push(node);
      else roots.push(node);
    }
    return roots;
  }

  /** Live product counts per category (published + active products). */
  private async productCounts(): Promise<Map<number, number>> {
    const rows = await this.database.product
      .createQueryBuilder('p')
      .select('p.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('p.isPublished = :published', { published: true })
      .andWhere('p.isActive = :active', { active: true })
      .andWhere('p.categoryId IS NOT NULL')
      .groupBy('p.categoryId')
      .getRawMany<{ categoryId: string; count: string }>();
    return new Map(rows.map((r) => [Number(r.categoryId), Number(r.count)]));
  }
}
