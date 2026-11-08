import { Product } from '../../../database/entities/product.entity';
import { ProductSKU } from '../../../database/entities/product-sku.entity';
import { ProductMedia } from '../../../database/entities/product-media.entity';

/**
 * Storefront money helpers shared by the user catalog + homepage section
 * services. A SKU is "on discount" only when discountedPrice is set AND the
 * current time falls inside its (optional) start/end window.
 */
export function isDiscountActive(sku: ProductSKU): boolean {
  if (sku.discountedPrice == null) return false;
  const now = Date.now();
  if (
    sku.discountedPriceStartDate &&
    new Date(sku.discountedPriceStartDate).getTime() > now
  ) {
    return false;
  }
  if (
    sku.discountedPriceEndDate &&
    new Date(sku.discountedPriceEndDate).getTime() < now
  ) {
    return false;
  }
  return true;
}

/** The price a customer actually pays for one SKU right now. */
export function effectiveSkuPrice(sku: ProductSKU): number {
  if (isDiscountActive(sku) && sku.discountedPrice != null)
    return sku.discountedPrice;
  return sku.price ?? 0;
}

export interface MediaSummary {
  id: number;
  url: string;
  type: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface SkuSummary {
  id: number;
  sku: string;
  price: number;
  discountedPrice: number | null;
  effectivePrice: number;
  onDiscount: boolean;
  inStock: boolean;
  quantity: number;
}

export interface ProductSummary {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  category: {
    id: number;
    name: string;
    nameBN: string | null;
    slug: string;
  } | null;
  collection: { id: number; name: string } | null;
  /** Lowest effective price across active SKUs (0 when no active SKUs). */
  priceFrom: number;
  /** Highest effective price across active SKUs. */
  priceTo: number;
  /** Highest original price across SKUs with a live discount, for strikethrough. */
  compareAtFrom: number | null;
  hasDiscount: boolean;
  inStock: boolean;
}

function mediaSummary(media: ProductMedia[]): MediaSummary[] {
  return [...media]
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.isPrimary ? -1 : 1))
    .map((m) => ({
      id: m.id,
      url: m.url,
      type: m.type,
      altText: m.altText,
      isPrimary: m.isPrimary,
      sortOrder: m.sortOrder,
    }));
}

export function skuSummaries(skus: ProductSKU[]): SkuSummary[] {
  return skus.map((s) => ({
    id: s.id,
    sku: s.sku,
    price: s.price ?? 0,
    discountedPrice: s.discountedPrice ?? null,
    effectivePrice: effectiveSkuPrice(s),
    onDiscount: isDiscountActive(s),
    inStock: s.quantity > 0,
    quantity: s.quantity,
  }));
}

/** Price range + discount flags computed from the product's SKUs. */
export function pricingFromSkus(skus: ProductSKU[]) {
  const active = skus.filter((s) => s.isActive);
  const prices = active.map(effectiveSkuPrice).filter((p) => p > 0);
  const discounts = active
    .filter((s) => isDiscountActive(s) && s.discountedPrice != null)
    .map((s) => s.price ?? 0);
  return {
    priceFrom: prices.length ? Math.min(...prices) : 0,
    priceTo: prices.length ? Math.max(...prices) : 0,
    compareAtFrom: discounts.length ? Math.max(...discounts) : null,
    hasDiscount: prices.length > 0 && discounts.length > 0,
    inStock: active.some((s) => s.quantity > 0),
  };
}

/**
 * Lean, storefront-safe view of a product for cards, shelves and PDP
 * metadata. Never leaks admin pricing (buying price) or deleted rows.
 */
export function productToSummary(product: Product): ProductSummary {
  const skus = product.skus ?? [];
  const pricing = pricingFromSkus(skus);
  const primary = (product.media ?? []).find((m) => m.isPrimary);
  return {
    id: product.id,
    name: product.name,
    nameBN: product.nameBN,
    slug: product.slug,
    description: product.description,
    thumbnailUrl: product.thumbnailUrl ?? primary?.url ?? null,
    isFeatured: product.isFeatured,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          nameBN: product.category.nameBN,
          slug: product.category.slug,
        }
      : null,
    collection: product.collection
      ? { id: product.collection.id, name: product.collection.name }
      : null,
    ...pricing,
  };
}

export { mediaSummary };
