import { createApiClient } from './api-client';
import type { ProductSummary } from './storefront';

/** The customer authed client shape (from useUserAuth().api). */
export type CustomerApiClient = ReturnType<typeof createApiClient>;

/**
 * Typed calls against the AUTHENTICATED customer endpoints (reviews +
 * wishlist). These need the caller's `api` client from `useUserAuth()`, so
 * they live outside the public `storefront` client.
 */

export interface WishlistItem {
  id: number;
  addedAt: string;
  product: ProductSummary;
}

export interface MyReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  images: string[] | null;
  isApproved: boolean;
  verified: boolean;
  createdAt: string;
  product: {
    id: number | null;
    name: string | null;
    nameBN: string | null;
    slug: string | null;
    thumbnailUrl: string | null;
  };
}

export interface PaginatedItems<T> {
  pagination: { totalItems: number; page: number; size: number; hasNext: boolean };
  data: T[];
}

export const customerApi = {
  // Wishlist -------------------------------------------------------------
  wishlistIds: (api: CustomerApiClient) => api.get<number[]>('/v1/user/wishlist/ids'),
  wishlist: (api: CustomerApiClient) => api.get<WishlistItem[]>('/v1/user/wishlist'),
  wishlistAdd: (api: CustomerApiClient, productId: number) =>
    api.post<{ added: boolean }>(`/v1/user/wishlist/${productId}`),
  wishlistRemove: (api: CustomerApiClient, productId: number) =>
    api.del<{ removed: boolean }>(`/v1/user/wishlist/${productId}`),

  // Reviews --------------------------------------------------------------
  myReviews: (api: CustomerApiClient) =>
    api.get<PaginatedItems<MyReviewItem>>('/v1/user/review/my'),
  submitReview: (
    api: CustomerApiClient,
    body: { productId: number; rating: number; comment?: string },
  ) =>
    api.post<{ id: number; isApproved: boolean }>('/v1/user/review', {
      ...body,
      comment: body.comment?.trim() || undefined,
    }),
  deleteReview: (api: CustomerApiClient, id: number) =>
    api.del<{ deleted: boolean }>(`/v1/user/review/${id}`),
};