import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import { HomepageSection } from '../../../database/entities/homepage-section.entity';
import { productToSummary } from '../../../catalog/user/utils/product-summary';

/**
 * Storefront homepage sections. Each section's admin-configured `content`
 * can PIN ids (productIds / categoryIds / bannerIds) or use a SMART mode
 * ({ sort, limit }) where we resolve the latest/featured records live. The
 * landing page therefore always renders from the DB as merchandised.
 */
@Injectable()
export class UserHomepageSectionService {
  constructor(private readonly database: DatabaseService) {}

  async list() {
    const sections = await this.database.homepageSection.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    return Promise.all(sections.map((s) => this.resolve(s)));
  }

  private async resolve(section: HomepageSection) {
    const content = (section.content ?? {}) as HomepageContent;
    switch (section.type) {
      case 'products':
        return {
          ...section,
          items: await this.resolveProducts(content),
        };
      case 'categories':
        return {
          ...section,
          items: await this.resolveCategories(content),
        };
      case 'banners':
        return {
          ...section,
          items: await this.resolveBanners(content),
        };
      default:
        // custom sections pass their content through untouched.
        return { ...section, items: [] };
    }
  }

  private async resolveProducts(content: HomepageContent) {
    const pinned = toIdArray(content.productIds);
    const limit = toLimit(content.limit, 8);
    const sort = orderFromSort(
      typeof content.sort === 'string' ? content.sort : 'newest',
    );

    if (pinned.length) {
      const products = await this.database.product.find({
        where: { id: In(pinned), isPublished: true, isActive: true },
        relations: {
          category: true,
          collection: true,
          media: true,
          skus: true,
        },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      return pinned
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .slice(0, limit)
        .map(productToSummary);
    }

    const where: Record<string, unknown> = {
      isPublished: true,
      isActive: true,
    };
    const [data, count] = await this.database.product.findAndCount({
      where,
      relations: { category: true, collection: true, media: true, skus: true },
      order: sort,
      take: limit,
    });
    void count;
    return data.map(productToSummary);
  }

  private async resolveCategories(content: HomepageContent) {
    const pinned = toIdArray(content.categoryIds);
    const limit = toLimit(content.limit, 8);

    if (pinned.length) {
      const categories = await this.database.category.find({
        where: { id: In(pinned), isActive: true },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
      const byId = new Map(categories.map((c) => [c.id, c]));
      return pinned
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .slice(0, limit)
        .map(categoryItem);
    }

    const categories = await this.database.category.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
      take: limit,
    });
    return categories.map(categoryItem);
  }

  private async resolveBanners(content: HomepageContent) {
    const pinned = toIdArray(content.bannerIds);
    const limit = toLimit(content.limit, 3);

    if (pinned.length) {
      const banners = await this.database.banner.find({
        where: { id: In(pinned), isActive: true },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
      const byId = new Map(banners.map((b) => [b.id, b]));
      return pinned
        .map((id) => byId.get(id))
        .filter((b): b is NonNullable<typeof b> => !!b)
        .slice(0, limit)
        .map(bannerItem);
    }

    const banners = await this.database.banner.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'DESC' },
      take: limit,
    });
    const now = Date.now();
    return banners
      .filter((b) => {
        if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
        if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
        return true;
      })
      .map(bannerItem);
  }
}

interface HomepageContent {
  productIds?: unknown;
  categoryIds?: unknown;
  bannerIds?: unknown;
  sort?: unknown;
  limit?: unknown;
}

function categoryItem(c: {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  imageUrl: string | null;
  parentId: number | null;
}) {
  return {
    id: c.id,
    name: c.name,
    nameBN: c.nameBN,
    slug: c.slug,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
  };
}

function bannerItem(b: {
  id: number;
  title: string;
  titleBN: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  position: string | null;
}) {
  return {
    id: b.id,
    title: b.title,
    titleBN: b.titleBN,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    linkUrl: b.linkUrl,
    position: b.position,
  };
}

function toIdArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function toLimit(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return Math.min(n, 50);
}

/** Map a section "sort" hint to a TypeORM order tuple. */
function orderFromSort(
  sort: string,
): Record<string, 'ASC' | 'DESC'> | undefined {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'ASC' };
    case 'name-asc':
      return { name: 'ASC' };
    case 'featured':
      return { isFeatured: 'DESC', createdAt: 'DESC' };
    case 'price-asc':
    case 'price-desc':
      // Price-order on shelves keeps the newest-relevant default; the shop
      // list endpoint supports exact price sorting for full catalogs.
      return { createdAt: 'DESC' };
    default:
      return { createdAt: 'DESC' };
  }
}
