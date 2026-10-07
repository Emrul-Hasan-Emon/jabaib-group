import { API_URL } from './config';

/**
 * Resolve a stored file reference to a loadable URL. Backend entities keep
 * relative paths like `jabaib/product/123-a.jpg` (served by the API from its
 * upload root at `/`), so we prefix the API origin here. Absolute URLs
 * (future S3/CDN) pass through untouched.
 */
export function mediaUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const clean = pathOrUrl.replace(/^\/+/, '');
  if (!clean) return '';
  return `${API_URL}/${clean}`;
}

/** Price formatting in BDT (Bangladesh Taka), e.g. "৳1,250". */
export function formatTaka(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `৳${n.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

/** Discount percent between an original and a sale price (0 when none). */
export function discountPercent(original: number | null | undefined, sale: number | null | undefined): number {
  const o = Number(original ?? 0);
  const s = Number(sale ?? 0);
  if (o <= 0 || s <= 0 || s >= o) return 0;
  return Math.round(((o - s) / o) * 100);
}