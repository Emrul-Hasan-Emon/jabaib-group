'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { flattenCategoryTree, type CategoryTree, type FlatCategory } from '@/lib/category-tree';
import { mediaUrl } from '@/lib/media-url';
import {
  adminOrderDraft,
  adminProductBrowseApi,
  type AdminCartLine,
  type AdminOrderCustomer,
  type AdminProductDetail,
  type AdminProductRow,
} from '@/lib/admin-order-api';

interface Option { id: number; name: string }

export default function CreateOrderProductsPage() {
  const { api } = useAdminAuth();
  const router = useRouter();

  const [customer, setCustomer] = useState<AdminOrderCustomer | null>(null);
  const [cart, setCart] = useState<AdminCartLine[]>([]);

  const [rows, setRows] = useState<AdminProductRow[]>([]);
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [collections, setCollections] = useState<Option[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<AdminProductDetail | null>(null);
  const [qtyBySku, setQtyBySku] = useState<Record<number, number>>({});
  const size = 12;

  useEffect(() => {
    const c = adminOrderDraft.getCustomer();
    if (!c) {
      router.replace('/admin/orders/new');
      return;
    }
    setCustomer(c);
    setCart(adminOrderDraft.getCart());
  }, [router]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
      isActive: 'true',
      isPublished: 'true',
    });
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (collectionId) params.set('collectionId', collectionId);
    const res = await adminProductBrowseApi.list(api, params);
    setRows(res.data);
    setTotalPages(Math.ceil(res.pagination.totalItems / size));
  }, [api, page, q, categoryId, collectionId]);

  useEffect(() => {
    if (!customer) return;
    load().catch((e) => setError(e.message));
  }, [customer, load]);

  useEffect(() => {
    const flat = flattenCategoryTree;
    api.get<CategoryTree[]>('/v1/admin/category/tree').then((nodes) => setCategories(flat(nodes))).catch(() => {});
    api.get<{ data: Option[] }>('/v1/admin/collection?page=0&size=100').then((r) => setCollections(r.data)).catch(() => {});
  }, [api]);

  const openProduct = async (p: AdminProductRow) => {
    setError(null);
    try {
      const detail = await adminProductBrowseApi.detail(api, p.id);
      setExpanded(detail);
      const initial: Record<number, number> = {};
      detail.skus.forEach((s) => { initial[s.id] = 1; });
      setQtyBySku(initial);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load product');
    }
  };

  const addToCart = (product: AdminProductDetail, sku: AdminProductDetail['skus'][number]) => {
    const qty = Math.max(1, qtyBySku[sku.id] ?? 1);
    const skuLabel = sku.skuVariants.map((v) => `${v.attribute.name}: ${v.attributeValue.name}`).join(', ');
    const price = sku.discountedPrice ?? sku.price;
    const next = [...cart];
    const idx = next.findIndex((l) => l.productSKUId === sku.id);
    if (idx >= 0) {
      next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
    } else {
      next.push({
        productId: product.id,
        productSKUId: sku.id,
        name: product.name,
        skuLabel,
        sku: sku.sku,
        price,
        quantity: qty,
        image: product.thumbnailUrl,
        maxQuantity: sku.quantity,
      });
    }
    setCart(next);
    adminOrderDraft.setCart(next);
  };

  const updateLineQty = (productSKUId: number, quantity: number) => {
    const next = cart
      .map((l) => (l.productSKUId === productSKUId ? { ...l, quantity: Math.max(1, quantity) } : l))
      .filter((l) => l.quantity > 0);
    setCart(next);
    adminOrderDraft.setCart(next);
  };

  const removeLine = (productSKUId: number) => {
    const next = cart.filter((l) => l.productSKUId !== productSKUId);
    setCart(next);
    adminOrderDraft.setCart(next);
  };

  const cartTotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);

  if (!customer) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Create order</h1>
          <p className="text-sm text-muted-foreground">
            For <span className="font-semibold text-foreground">{customer.name}</span>
            {' '}· <Link href="/admin/orders/new" className="text-primary">Change customer</Link>
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/orders/new/checkout')}
          disabled={cart.length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Checkout ({cart.length})
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              placeholder="Search by name…"
              className="rounded-md border border-input px-3 py-2 text-sm"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(0); }}
            />
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}>
              <option value="">All categories</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="rounded-md border border-input px-3 py-2 text-sm" value={collectionId} onChange={(e) => { setCollectionId(e.target.value); setPage(0); }}>
              <option value="">All collections</option>
              {collections.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {rows.map((p) => (
              <button
                key={p.id}
                onClick={() => openProduct(p)}
                className="rounded-xl border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary"
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-muted">
                  {p.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl(p.thumbnailUrl)} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="truncate text-xs text-muted-foreground">{p.category?.name ?? '—'}</div>
              </button>
            ))}
            {rows.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No products match the filters.</p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Prev</button>
            <span>Page {page + 1}{totalPages ? ` / ${totalPages}` : ''}</span>
            <button onClick={() => setPage(page + 1)} className="rounded-md border border-border px-3 py-1">Next</button>
          </div>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-4 shadow-sm lg:sticky lg:top-4">
          <h2 className="mb-3 font-semibold">Cart ({cart.length})</h2>
          {cart.length === 0 && <p className="text-sm text-muted-foreground">No items added yet.</p>}
          <ul className="space-y-2">
            {cart.map((l) => (
              <li key={l.productSKUId} className="rounded-lg border border-border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{l.name}</span>
                  <button onClick={() => removeLine(l.productSKUId)} className="text-xs text-red-600">Remove</button>
                </div>
                {l.skuLabel && <div className="text-xs text-muted-foreground">{l.skuLabel}</div>}
                <div className="mt-1 flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    value={l.quantity}
                    onChange={(e) => updateLineQty(l.productSKUId, Number(e.target.value))}
                    className="w-16 rounded-md border border-input px-2 py-1 text-xs"
                  />
                  <span className="font-semibold">৳{l.price * l.quantity}</span>
                </div>
              </li>
            ))}
          </ul>
          {cart.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>Estimated total</span>
              <span>৳{cartTotal}</span>
            </div>
          )}
        </aside>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setExpanded(null)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{expanded.name}</h3>
              <button onClick={() => setExpanded(null)} className="text-sm text-muted-foreground">Close</button>
            </div>
            <ul className="space-y-2">
              {expanded.skus.filter((s) => s.isActive).map((s) => {
                const label = s.skuVariants.map((v) => `${v.attribute.name}: ${v.attributeValue.name}`).join(', ') || s.sku;
                const price = s.discountedPrice ?? s.price;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">৳{price} · {s.quantity} in stock</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={s.quantity || undefined}
                        value={qtyBySku[s.id] ?? 1}
                        onChange={(e) => setQtyBySku((prev) => ({ ...prev, [s.id]: Number(e.target.value) }))}
                        className="w-16 rounded-md border border-input px-2 py-1 text-xs"
                      />
                      <button
                        onClick={() => addToCart(expanded, s)}
                        disabled={s.quantity <= 0}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
