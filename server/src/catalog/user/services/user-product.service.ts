import { Injectable } from '@nestjs/common';
import { ILike, In } from 'typeorm';
import { DatabaseService } from '../../../database/database.service';
import {
  Pagination,
  getPaginateData,
} from '../../../common/decorators/pagination-params';
import { Product } from '../../../database/entities/product.entity';
import { pricingFromSkus, productToSummary } from '../utils/product-summary';

export type ProductSort =
  'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc';

const PRICE_SORTS: ProductSort[] = ['price-asc', 'price-desc'];

/**
 * Storefront-facing product browsing: only published, active products.
 * `list()` returns lean summaries (image + price range + stock) so cards
 * and shelves stay fast; `findOne`/`findBySlug` return the full record
 * (media gallery + SKU variants) for the product detail page.
 */
@Injectable()
export class UserProductService {
  constructor(private readonly database: DatabaseService) {}

  async list(pagination: Pagination, query: Record<string, string>) {
    const { where, q } = this.buildWhere(query);
    const sort = this.normalizeSort(query.sort);

    // Attribute-value filter (e.g. Size=M AND Color=Black): reduce to the
    // products that own an ACTIVE SKU carrying ALL the selected values.
    const attrValueIds = this.parseAttrValues(query.attrValues);
    let attributeScopedIds: number[] | null = null;
    if (attrValueIds.length) {
      attributeScopedIds = await this.matchingProductIds(attrValueIds);
      if (attributeScopedIds.length === 0) {
        return getPaginateData([], 0, pagination);
      }
      where.id = In(attributeScopedIds);
    }

    if (PRICE_SORTS.includes(sort)) {
      return this.listPriceSorted(
        where,
        q,
        sort,
        pagination,
        attributeScopedIds,
      );
    }

    const [data, count] = await this.database.product.findAndCount({
      where,
      relations: { category: true, collection: true, media: true, skus: true },
      order:
        sort === 'name-asc'
          ? { name: 'ASC' }
          : { createdAt: sort === 'oldest' ? 'ASC' : 'DESC' },
      skip: pagination.offset,
      take: pagination.size,
    });
    return getPaginateData(data.map(productToSummary), count, pagination);
  }

  /**
   * Attribute facet counts for the current browsing scope (category /
   * collection / query) so the filter UI can show "M (12)"-style badges.
   * Counts are computed on the raw SKU tables against published+active
   * products. The selected attrValues are intentionally ignored so the
   * facets stay stable while toggling values.
   */
  async facets(params: Record<string, string>) {
    const qb = this.database.productSKUVariant
      .createQueryBuilder('v')
      .innerJoin('v.sku', 's')
      .innerJoin(Product, 'p', 'p.id = s.productId')
      .select('v.attributeValueId', 'attributeValueId')
      .addSelect('COUNT(DISTINCT p.id)', 'count')
      .where('s.isActive = :active', { active: true })
      .andWhere('v.isActive = :variantActive', { variantActive: true })
      .andWhere('p.isPublished = :published', { published: true })
      .andWhere('p.isActive = :isActive', { isActive: true })
      .groupBy('v.attributeValueId');

    if (params.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: Number(params.categoryId),
      });
    }
    if (params.collectionId) {
      qb.andWhere('p.collectionId = :collectionId', {
        collectionId: Number(params.collectionId),
      });
    }
    const q = params.q?.trim();
    if (q)
      qb.andWhere('(p.name ILIKE :q OR p.nameBN ILIKE :q)', { q: `%${q}%` });

    const raw = await qb.getRawMany<{
      attributeValueId: string;
      count: string;
    }>();
    const counts = new Map<number, number>();
    for (const r of raw) {
      counts.set(Number(r.attributeValueId), Number(r.count));
    }

    const attributes = await this.database.attribute.find({
      where: { isActive: true },
      relations: { values: true },
      order: { id: 'ASC' },
    });

    const groups: {
      attributeId: number;
      attributeName: string;
      values: { valueId: number; value: string; count: number }[];
    }[] = [];
    for (const attr of attributes) {
      const values = (attr.values ?? [])
        .filter((v) => counts.has(v.id))
        .map((v) => ({
          valueId: v.id,
          value: v.name,
          count: counts.get(v.id)!,
        }))
        .sort((a, b) => b.count - a.count);
      if (values.length) {
        groups.push({ attributeId: attr.id, attributeName: attr.name, values });
      }
    }
    return groups;
  }

  /** Distinct product ids owning a single active SKU with ALL given values. */
  private async matchingProductIds(attrValueIds: number[]): Promise<number[]> {
    const rows = await this.database.productSKUVariant
      .createQueryBuilder('v')
      .innerJoin('v.sku', 's')
      .select('s.productId', 'productId')
      .where('s.isActive = :active', { active: true })
      .andWhere('v.isActive = :variantActive', { variantActive: true })
      .andWhere('v.attributeValueId IN (:...ids)', { ids: attrValueIds })
      .groupBy('s.productId')
      .having('COUNT(DISTINCT v.attributeValueId) = :n', {
        n: attrValueIds.length,
      })
      .getRawMany<{ productId: string }>();
    return rows
      .map((r) => Number(r.productId))
      .filter((id) => Number.isInteger(id));
  }

  private parseAttrValues(raw?: string): number[] {
    if (!raw) return [];
    const ids = String(raw)
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return [...new Set(ids)];
  }

  async findOne(id: number) {
    const product = await this.database.product.findOne({
      where: { id, isPublished: true, isActive: true },
      relations: {
        category: true,
        collection: true,
        media: true,
        skus: { skuVariants: { attribute: true, attributeValue: true } },
      },
    });
    if (!product) return null;
    return { ...product, pricing: pricingFromSkus(product.skus ?? []) };
  }

  async findBySlug(slug: string) {
    const product = await this.database.product.findOne({
      where: { slug, isPublished: true, isActive: true },
      relations: {
        category: true,
        collection: true,
        media: true,
        skus: { skuVariants: { attribute: true, attributeValue: true } },
      },
    });
    if (!product) return null;
    return { ...product, pricing: pricingFromSkus(product.skus ?? []) };
  }

  private buildWhere(query: Record<string, string>) {
    const where: Record<string, unknown> = {
      isPublished: true,
      isActive: true,
    };
    if (query.q) where.name = ILike(`%${query.q.trim()}%`);
    if (query.categoryId) where.categoryId = Number(query.categoryId);
    if (query.collectionId) where.collectionId = Number(query.collectionId);
    if (query.isFeatured === 'true') where.isFeatured = true;
    return { where, q: query.q?.trim() };
  }

  private normalizeSort(raw?: string): ProductSort {
    if (
      ['newest', 'oldest', 'price-asc', 'price-desc', 'name-asc'].includes(
        raw ?? '',
      )
    ) {
      return raw as ProductSort;
    }
    return 'newest';
  }

  /**
   * Order by the cheapest active SKU. Uses a correlated subquery on the
   * raw `product_sku` table (discount windows applied) so ordering is exact
   * across pages — sorting in JS after pagination would be wrong.
   */
  private async listPriceSorted(
    where: Record<string, unknown>,
    q: string | undefined,
    sort: ProductSort,
    pagination: Pagination,
    attributeScopedIds: number[] | null = null,
  ) {
    const count = await this.database.product.count({ where });

    const qb = this.database.product
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .where('p.isPublished = :published', { published: true })
      .andWhere('p.isActive = :active', { active: true })
      .addSelect(
        `(SELECT MIN(
            CASE WHEN s."discountedPrice" IS NOT NULL
              AND (s."discountedPriceStartDate" IS NULL OR s."discountedPriceStartDate" <= :now)
              AND (s."discountedPriceEndDate" IS NULL OR s."discountedPriceEndDate" >= :now)
            THEN s."discountedPrice" ELSE s.price END)
          FROM "product_sku" s
          WHERE s."productId" = p.id AND s."isActive" = true)`,
        'priceFrom',
      )
      .setParameter('now', new Date());

    if (attributeScopedIds && attributeScopedIds.length) {
      qb.andWhere('p.id IN (:...attributeScopedIds)', { attributeScopedIds });
    }
    if (where.categoryId)
      qb.andWhere('p.categoryId = :categoryId', {
        categoryId: where.categoryId,
      });
    if (where.collectionId)
      qb.andWhere('p.collectionId = :collectionId', {
        collectionId: where.collectionId,
      });
    if (where.isFeatured)
      qb.andWhere('p.isFeatured = :isFeatured', { isFeatured: true });
    if (q)
      qb.andWhere('(p.name ILIKE :q OR p.nameBN ILIKE :q)', { q: `%${q}%` });

    const direction = sort === 'price-asc' ? 'ASC' : 'DESC';
    qb.orderBy('priceFrom', direction).addOrderBy('p.id', 'ASC');
    qb.offset(pagination.offset).limit(pagination.size);

    const rows = await qb.getRawMany<{
      id: number;
      priceFrom: string | null;
    }>();
    const ids = rows.map((r) => r.id).filter((id): id is number => id != null);

    let items: Product[] = [];
    if (ids.length) {
      const loaded = await this.database.product.find({
        where: { id: In(ids) },
        relations: {
          category: true,
          collection: true,
          media: true,
          skus: true,
        },
      });
      const byId = new Map(loaded.map((p) => [p.id, p]));
      items = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
    }

    return getPaginateData(items.map(productToSummary), count, pagination);
  }
}
