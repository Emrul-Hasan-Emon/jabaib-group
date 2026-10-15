import { API_URL } from './config';

/**
 * Typed client for the PUBLIC storefront endpoints. No auth tokens are
 * needed for browsing; customer-only endpoints live in user-auth.tsx.
 */

export interface CategorySummary {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
}

export interface CollectionSummary {
  id: number;
  name: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  category: CategorySummary | null;
  collection: { id: number; name: string } | null;
  priceFrom: number;
  priceTo: number;
  compareAtFrom: number | null;
  hasDiscount: boolean;
  inStock: boolean;
}

export interface SkuVariant {
  id: number;
  attribute: { id: number; name: string; nameBN?: string | null };
  /** AttributeValue entity — the label field is `name` (not `value`, which only
   *  exists on the facets DTO returned by user/product/facets). */
  attributeValue: { id: number; name: string; nameBN?: string | null };
}

export interface Sku {
  id: number;
  sku: string;
  price: number;
  discountedPrice: number | null;
  discountedPriceStartDate?: string | null;
  discountedPriceEndDate?: string | null;
  quantity: number;
  isActive: boolean;
  isDefault: boolean;
  skuVariants?: SkuVariant[];
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  descriptionBN: string | null;
  media: Array<{
    id: number;
    url: string;
    type: string;
    altText: string | null;
    isPrimary: boolean;
    sortOrder: number;
  }>;
  skus: Sku[];
  pricing: {
    priceFrom: number;
    priceTo: number;
    compareAtFrom: number | null;
    hasDiscount: boolean;
    inStock: boolean;
  };
}

export interface Banner {
  id: number;
  title: string;
  titleBN: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  position: string | null;
}

export interface HomepageSection {
  id: number;
  key: string;
  title: string;
  titleBN: string | null;
  type: 'products' | 'categories' | 'banners' | 'custom';
  content: Record<string, unknown>;
  sortOrder: number;
  items: ProductSummary[] | CategoryItem[] | Banner[];
}

export interface CategoryItem {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  imageUrl: string | null;
  parentId: number | null;
}

export interface CategoryNode extends CategoryItem {
  /** Number of published + active products in this category (tree response). */
  productCount?: number;
  childrenNodes?: CategoryNode[];
}

export interface Collection {
  id: number;
  name: string;
}

/** Attribute with its values (from user/attribute) for filter facets. */
export interface AttributeValueItem {
  id: number;
  name: string;
  nameBN: string | null;
  colorCode: string | null;
}
export interface AttributeGroup {
  id: number;
  name: string;
  nameBN: string | null;
  values: AttributeValueItem[];
}

/** Facet counts for the currently browsed scope (category/collection/q). */
export interface FacetGroup {
  attributeId: number;
  attributeName: string;
  values: { valueId: number; value: string; count: number }[];
}

export interface ReviewSummary {
  count: number;
  average: number;
  /** Star buckets 1..5 — only approved reviews are ever counted. */
  distribution: Record<number, number>;
}
export interface ProductReview {
  id: number;
  rating: number;
  comment: string | null;
  images: string[] | null;
  /** True when the review came from a real (delivered) order. */
  verified: boolean;
  createdAt: string;
  user: { name: string };
}
export interface ProductReviewsResponse extends Paginated<ProductReview> {
  summary: ReviewSummary;
}

export interface LocationDistrict {
  id: number;
  name: string;
  nameBN: string | null;
}
export interface LocationDivision extends LocationDistrict {
  districts: LocationDistrict[];
}
export interface LocationCountry {
  id: number;
  name: string;
  nameBN: string | null;
  code: string;
  divisions: LocationDivision[];
}

export interface Paginated<T> {
  pagination: { totalItems: number; page: number; size: number; hasNext: boolean };
  data: T[];
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}/v1/${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${res.status})`);
  }
  return res.json();
}

function qs(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export type ProductSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'name-asc';

export interface ProductQuery {
  page?: number;
  size?: number;
  q?: string;
  categoryId?: number;
  collectionId?: number;
  attrValues?: string;
  isFeatured?: boolean;
  sort?: ProductSort;
}

export const storefront = {
  products: (params: ProductQuery = {}) =>
    get<Paginated<ProductSummary>>(
      `user/product${qs({ page: params.page ?? 0, size: params.size ?? 20, q: params.q, categoryId: params.categoryId, collectionId: params.collectionId, isFeatured: params.isFeatured ? 'true' : undefined, attrValues: params.attrValues, sort: params.sort })}`,
    ),
  facets: (params: { categoryId?: number; collectionId?: number; q?: string } = {}) =>
    get<FacetGroup[]>(
      `user/product/facets${qs({ categoryId: params.categoryId, collectionId: params.collectionId, q: params.q })}`,
    ),
  productBySlug: (slug: string) => get<ProductDetail>(`user/product/slug/${encodeURIComponent(slug)}`),
  productReviews: (productId: number, page = 0, size = 6) =>
    get<ProductReviewsResponse>(
      `user/review/product/${productId}${qs({ page, size })}`,
    ),
  banners: (position?: string) =>
    get<Banner[]>(`user/banner${position ? `?position=${encodeURIComponent(position)}` : ''}`),
  homepageSections: () => get<HomepageSection[]>('user/homepage-section'),
  categoryTree: () => get<CategoryNode[]>('user/category/tree'),
  categories: () => get<CategorySummary[]>('user/category'),
  collections: () => get<Collection[]>('user/collection'),
  attributes: () => get<AttributeGroup[]>('user/attribute'),
  locationTree: () => get<LocationCountry[]>('user/location/tree'),
};