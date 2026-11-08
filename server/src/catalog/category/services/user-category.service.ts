import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
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

  /**
   * `parentId` omitted => all active categories, flat (unchanged default).
   * `parentId` the string 'null' => root categories only.
   * `parentId` a numeric id => direct children of that category only.
   */
  async listActive(parentId?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (parentId === 'null') where.parentId = IsNull();
    else if (parentId !== undefined) where.parentId = Number(parentId);

    return this.database.category.find({
      where,
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

    // Roll each node's count up to include every descendant's count too
    // (a parent with no products of its own still shows its children's
    // stock), computed in memory from the tree already built above.
    const rollup = (node: CategoryNode): number => {
      const childSum = node.childrenNodes.reduce(
        (sum, child) => sum + rollup(child),
        0,
      );
      node.productCount += childSum;
      return node.productCount;
    };
    roots.forEach(rollup);

    return roots;
  }

  /**
   * `categoryId` plus every active descendant id, walked from the same
   * adjacency map `tree()` builds (one `find()`, no N+1 queries). Used to
   * expand a parent-category filter so it also matches products filed
   * under its children (a parent like "Men" often holds no products of
   * its own — only "Shirts"/"Bottoms" underneath do).
   */
  async descendantIds(categoryId: number): Promise<number[]> {
    const all = await this.database.category.find({
      where: { isActive: true },
    });
    const childrenOf = new Map<number, number[]>();
    for (const c of all) {
      if (c.parentId == null) continue;
      const siblings = childrenOf.get(c.parentId) ?? [];
      siblings.push(c.id);
      childrenOf.set(c.parentId, siblings);
    }

    const ids: number[] = [];
    const seen = new Set<number>();
    const stack = [categoryId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
      stack.push(...(childrenOf.get(id) ?? []));
    }
    return ids;
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
