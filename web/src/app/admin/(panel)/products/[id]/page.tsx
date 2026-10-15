'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

interface Media { id: number; url: string; type: string; isPrimary: boolean }
interface SkuVariant { attribute?: { name: string }; attributeValue?: { name: string } }
interface Sku {
  id: number;
  sku: string;
  price: number;
  discountedPrice: number | null;
  discountedPriceStartDate: string | null;
  discountedPriceEndDate: string | null;
  quantity: number;
  isDefault: boolean;
  isActive: boolean;
  skuVariants: SkuVariant[];
}

export default function ProductDetailsPage() {
  const { api } = useAdminAuth();
  const params = useParams();
  const id = Number(params.id);
  const [product, setProduct] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const p = await api.get<Record<string, any>>(`/v1/admin/product/${id}`);
    setProduct(p);
  }, [api, id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  if (!product) return <p className="text-sm text-muted-foreground">{error ?? 'Loading…'}</p>;

  return (
    <div className="max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="text-xs text-muted-foreground">
            {product.slug} · {product.category?.name ?? 'No category'}
            {product.collection ? ` · ${product.collection.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href={`/admin/products/${id}/edit`} className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">
            Edit product
          </Link>
          <Link href="/admin/products" className="rounded-md border border-border px-4 py-2">← Back to list</Link>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${product.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {product.isActive ? 'Active' : 'Inactive'}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${product.isPublished ? 'bg-muted' : 'bg-amber-100 text-amber-700'}`}>
          {product.isPublished ? 'Published' : 'Unpublished'}
        </span>
        {product.isFeatured && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Featured</span>}
        <span className="rounded-full bg-muted px-3 py-1 text-xs">{product.skus?.length ?? 0} SKUs</span>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          {product.thumbnailUrl && (
            <img src={product.thumbnailUrl} alt={product.name} className="aspect-square w-full rounded-xl border border-border object-cover" />
          )}
        </div>
        <div className="md:col-span-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-2 font-semibold">Description</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description || 'No description.'}</p>
            {product.descriptionBN && (
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{product.descriptionBN}</p>
            )}
          </div>
        </div>
      </div>

      {product.media?.length > 0 && (
        <div className="mb-5 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Media gallery ({product.media.length})</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {product.media.map((m: Media) => (
              <div key={m.id} className="relative overflow-hidden rounded-lg border border-border">
                {m.type === 'video' ? (
                  <video src={m.url} className="aspect-square w-full object-cover" muted />
                ) : (
                  <img src={m.url} alt={m.url} className="aspect-square w-full object-cover" />
                )}
                {m.isPrimary && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Primary</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">SKUs — variants ({product.skus?.length ?? 0})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">SKU</th><th>Variants</th><th>Price</th><th>Discount</th><th>Valid</th><th>Qty</th><th>State</th>
              </tr>
            </thead>
            <tbody>
              {(product.skus ?? []).map((s: Sku) => (
                <tr key={s.id} className={`border-t border-border ${!s.isActive ? 'opacity-50' : ''}`}>
                  <td className="py-2 font-medium">{s.sku}{s.isDefault ? ' ★' : ''}{!s.isActive ? ' (inactive)' : ''}</td>
                  <td>{s.skuVariants?.map((v) => `${v.attribute?.name}: ${v.attributeValue?.name}`).join(', ') || '—'}</td>
                  <td>৳{s.price}</td>
                  <td>{s.discountedPrice != null ? `৳${s.discountedPrice}` : '—'}</td>
                  <td className="text-xs">
                    {s.discountedPriceStartDate ? new Date(s.discountedPriceStartDate).toLocaleDateString() : '—'} → {s.discountedPriceEndDate ? new Date(s.discountedPriceEndDate).toLocaleDateString() : '—'}
                  </td>
                  <td>{s.quantity}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {(product.skus ?? []).length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No SKUs yet — add them from the edit page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}