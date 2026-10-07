'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { uploadImage, uploadManyImages } from '@/lib/admin-upload';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { flattenCategoryTree, type CategoryTree } from '@/lib/category-tree';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
}
interface Option { id: number; name: string }

interface AttributeValue { id: number; name: string; attributeId: number }
interface Attribute { id: number; name: string; values: AttributeValue[] }

interface Media {
  id: number;
  url: string;
  type: string;
  isPrimary: boolean;
}

interface SkuVariant { attributeId: number; attributeValueId: number; attribute?: { name: string }; attributeValue?: { name: string } }
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

const emptyBasic = {
  name: '', nameBN: '', slug: '', description: '', descriptionBN: '',
  categoryId: '', collectionId: '', isFeatured: false, isPublished: true, isActive: true,
};

/** Flat category list → indented tree options. */
function categoryOptions(categories: Category[]): Array<{ id: number; label: string }> {
  const children = new Map<number | null, Category[]>();
  for (const c of categories) {
    const key = c.parentId ?? null;
    if (!children.has(key)) children.set(key, []);
    children.get(key)!.push(c);
  }
  const out: Array<{ id: number; label: string }> = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const c of children.get(parentId) ?? []) {
      out.push({ id: c.id, label: `${'—'.repeat(depth)}${c.name}` });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

let variantKey = 0;
const nextKey = () => `v${++variantKey}-${Date.now()}`;

export function ProductForm({ productId }: { productId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = productId !== undefined;

  const [basic, setBasic] = useState(emptyBasic);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Option[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [id, setId] = useState<number | undefined>(productId);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [confirmDeleteMedia, setConfirmDeleteMedia] = useState<Media | null>(null);

  // SKU create form
  const [skuForm, setSkuForm] = useState({
    sku: '', price: '', discountedPrice: '', startDate: '', endDate: '', quantity: '0', isDefault: false,
  });
  const [variantRows, setVariantRows] = useState<Array<{ key: string; attributeId: string; attributeValueId: string }>>([]);

  // SKU inline edit
  const [editingSkuId, setEditingSkuId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ price: '', discountedPrice: '', isActive: true, isDefault: false });

  const treeOptions = useMemo(() => categoryOptions(categories), [categories]);

  const loadMeta = useCallback(async () => {
    const [cats, cols, attrs] = await Promise.all([
      api
        .get<CategoryTree[]>('/v1/admin/category/tree')
        .then((nodes) => flattenCategoryTree(nodes)),
      api.get<{ data: Option[] }>('/v1/admin/collection?page=0&size=100'),
      api.get<{ data: Attribute[] }>('/v1/admin/attribute?page=0&size=100'),
    ]);
    setCategories(cats);
    setCollections(cols.data);
    setAttributes(attrs.data);
  }, [api]);

  const loadProduct = useCallback(async (pid: number) => {
    const p = await api.get<Record<string, any>>(`/v1/admin/product/${pid}`);
    setBasic({
      name: p.name, nameBN: p.nameBN ?? '', slug: p.slug ?? '',
      description: p.description ?? '', descriptionBN: p.descriptionBN ?? '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      collectionId: p.collectionId ? String(p.collectionId) : '',
      isFeatured: p.isFeatured, isPublished: p.isPublished, isActive: p.isActive,
    });
    setThumbnail(p.thumbnailUrl ?? null);
    setSkus(p.skus ?? []);
    setMedia(p.media ?? []);
  }, [api]);

  useEffect(() => {
    loadMeta().catch(() => {});
    if (productId) loadProduct(productId).catch(() => {});
  }, [loadMeta, loadProduct, productId]);

  const saveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const payload: Record<string, unknown> = {
      name: basic.name,
      nameBN: basic.nameBN || undefined,
      slug: basic.slug || undefined,
      description: basic.description || undefined,
      descriptionBN: basic.descriptionBN || undefined,
      categoryId: Number(basic.categoryId),
      collectionId: basic.collectionId ? Number(basic.collectionId) : undefined,
      isFeatured: basic.isFeatured,
      isPublished: basic.isPublished,
      isActive: basic.isActive,
    };
    try {
      if (id) {
        await api.patch(`/v1/admin/product/${id}`, payload);
        setNotice('Product updated.');
      } else {
        const created = await api.post<{ id: number }>('/v1/admin/product', payload);
        setId(created.id);
        setNotice('Product saved — you can now add SKUs and media below.');
        window.history.replaceState(null, '', `/admin/products/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  // ---- Thumbnail ----
  const onThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!id) {
      setError('Save the product first, then upload the thumbnail.');
      return;
    }
    setError(null);
    try {
      const up = await uploadImage(file, 'product');
      await api.patch(`/v1/admin/product/${id}`, { thumbnailUrl: up.url, thumbnailPath: up.path });
      setThumbnail(up.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  // ---- Media manager ----
  const onMediaFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!id) {
      setError('Save the product first, then upload images/videos.');
      return;
    }
    e.target.value = '';
    setError(null);
    setMediaUploading(true);
    try {
      // One request for ALL selected files (batch upload).
      const ups = await uploadManyImages(files, 'media');
      const existing = media;
      for (const up of ups) {
        const isFirst = existing.length === 0 && media.length === 0 && !thumbnail;
        const created = await api.post<Media>(`/v1/admin/product/${id}/media`, {
          url: up.url,
          path: up.path,
          type: up.mimeType.startsWith('video/') ? 'video' : 'image',
          isPrimary: isFirst ? true : false,
        });
        setMedia((m) => [...m, created]);
        existing.push(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setMediaUploading(false);
    }
  };

  const setPrimaryMedia = async (m: Media) => {
    await api.patch(`/v1/admin/product/${id}/media/${m.id}`, { isPrimary: true });
    if (id) await loadProduct(id);
  };

  const moveMedia = async (index: number, dir: -1 | 1) => {
    if (!id) return;
    const target = index + dir;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    [next[index], next[target]] = [next[target], next[index]];
    setMedia(next);
    try {
      await api.put(`/v1/admin/product/${id}/media/reorder`, {
        order: next.map((m) => m.id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed');
      if (id) await loadProduct(id);
    }
  };

  const removeMedia = async () => {
    if (!confirmDeleteMedia) return;
    await api.del(`/v1/admin/product/${id}/media/${confirmDeleteMedia.id}`);
    setConfirmDeleteMedia(null);
    if (id) await loadProduct(id);
  };

  // ---- SKU create ----
  const addVariantRow = () => setVariantRows((rows) => [...rows, { key: nextKey(), attributeId: '', attributeValueId: '' }]);
  const removeVariantRow = (key: string) => setVariantRows((rows) => rows.filter((r) => r.key !== key));

  const addSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const pairs = variantRows
      .filter((r) => r.attributeId !== '' && r.attributeValueId !== '')
      .map((r) => ({
        attributeId: Number(r.attributeId),
        attributeValueId: Number(r.attributeValueId),
      }));
    if (pairs.length === 0) {
      setError('Add at least one attribute → value pair (e.g. Size → M).');
      return;
    }
    try {
      await api.post(`/v1/admin/product/${id}/skus`, {
        sku: skuForm.sku,
        price: Number(skuForm.price),
        discountedPrice: skuForm.discountedPrice ? Number(skuForm.discountedPrice) : undefined,
        discountedPriceStartDate: skuForm.startDate ? new Date(skuForm.startDate).toISOString() : undefined,
        discountedPriceEndDate: skuForm.endDate ? new Date(skuForm.endDate).toISOString() : undefined,
        quantity: Number(skuForm.quantity),
        isDefault: skuForm.isDefault,
        variants: pairs,
      });
      setSkuForm({ sku: '', price: '', discountedPrice: '', startDate: '', endDate: '', quantity: '0', isDefault: false });
      setVariantRows([]);
      await loadProduct(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  // ---- SKU edit (price / discountedPrice / isActive / isDefault only) ----
  const startEditSku = (s: Sku) => {
    setEditingSkuId(s.id);
    setEditForm({
      price: String(s.price),
      discountedPrice: s.discountedPrice != null ? String(s.discountedPrice) : '',
      isActive: s.isActive,
      isDefault: s.isDefault,
    });
  };

  const saveSku = async (s: Sku) => {
    setError(null);
    try {
      await api.patch(`/v1/admin/sku/${s.id}`, {
        price: Number(editForm.price),
        discountedPrice: editForm.discountedPrice ? Number(editForm.discountedPrice) : undefined,
        isActive: editForm.isActive,
        isDefault: editForm.isDefault,
      });
      setEditingSkuId(null);
      if (id) await loadProduct(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const toggleSkuActive = async (s: Sku) => {
    await api.patch(`/v1/admin/sku/${s.id}`, { isActive: !s.isActive });
    if (id) await loadProduct(id);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit product' : 'Add product'}</h1>
        {id ? (
          <Link href={`/admin/products/${id}`} className="text-sm text-muted-foreground">
            ← Back to details
          </Link>
        ) : (
          <button type="button" onClick={() => router.push('/admin/products')} className="text-sm text-muted-foreground">← Back to list</button>
        )}
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>}

      <form onSubmit={saveBasic} className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-4 font-semibold">Basic information</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={basic.name} onChange={(e) => setBasic({ ...basic, name: e.target.value })} />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.nameBN} onChange={(e) => setBasic({ ...basic, nameBN: e.target.value })} />
          </label>
          <label className="text-sm">Slug (auto from name if blank)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.slug} onChange={(e) => setBasic({ ...basic, slug: e.target.value })} />
          </label>
          <label className="text-sm">Category *
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={basic.categoryId} onChange={(e) => setBasic({ ...basic, categoryId: e.target.value })}>
              <option value="">Select…</option>
              {treeOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Collection
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.collectionId} onChange={(e) => setBasic({ ...basic, collectionId: e.target.value })}>
              <option value="">None</option>
              {collections.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-4 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={basic.isFeatured} onChange={(e) => setBasic({ ...basic, isFeatured: e.target.checked })} /> Featured</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={basic.isPublished} onChange={(e) => setBasic({ ...basic, isPublished: e.target.checked })} /> Published</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={basic.isActive} onChange={(e) => setBasic({ ...basic, isActive: e.target.checked })} /> Active</label>
          </div>
          <label className="text-sm md:col-span-2">Description
            <textarea rows={3} className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.description} onChange={(e) => setBasic({ ...basic, description: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-2">Description (BN)
            <textarea rows={3} className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.descriptionBN} onChange={(e) => setBasic({ ...basic, descriptionBN: e.target.value })} />
          </label>

          <div className="md:col-span-2">
            <span className="text-sm font-medium">Thumbnail</span>
            <div className="mt-2 flex items-start gap-4 rounded-lg border border-dashed border-border p-4">
              {thumbnail ? (
                <>
                  <img src={thumbnail} alt="thumbnail preview" className="h-24 w-24 rounded-lg border border-border object-cover" />
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">{thumbnail}</span>
                    <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium">
                      Change thumbnail
                      <input type="file" accept="image/*" className="hidden" onChange={onThumbnail} />
                    </label>
                  </div>
                </>
              ) : (
                <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-6 text-center text-sm text-muted-foreground">
                  <input type="file" accept="image/*" className="hidden" onChange={onThumbnail} />
                  Choose thumbnail image (JPG / PNG / WEBP)
                </label>
              )}
            </div>
          </div>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {id ? 'Update product' : 'Save product'}
        </button>
      </form>

      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Media gallery</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Upload multiple images and videos — saved to the product media gallery. The primary image is used as the storefront image.
        </p>
        {media.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-3">
            {media.map((m, i) => (
              <div key={m.id} className="w-28">
                <div className="relative overflow-hidden rounded-lg border border-border">
                  {m.type === 'video' ? (
                    <video src={m.url} className="h-28 w-full object-cover" muted />
                  ) : (
                    <img src={m.url} alt={m.url} className="h-28 w-full object-cover" />
                  )}
                  {m.isPrimary && (
                    <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Primary</span>
                  )}
                </div>
                <div className="mt-1 flex justify-center gap-2 text-xs">
                  {!m.isPrimary ? (
                    <button onClick={() => setPrimaryMedia(m)} className="text-primary">Set primary</button>
                  ) : (
                    <span className="text-muted-foreground">Primary</span>
                  )}
                  <button onClick={() => setConfirmDeleteMedia(m)} className="text-red-600">Delete</button>
                </div>
                <div className="mt-0.5 flex justify-center gap-3 text-xs text-muted-foreground">
                  <button onClick={() => moveMedia(i, -1)} disabled={i === 0} className={i === 0 ? 'opacity-30' : 'hover:text-foreground'} title="Move left">←</button>
                  <button onClick={() => moveMedia(i, 1)} disabled={i === media.length - 1} className={i === media.length - 1 ? 'opacity-30' : 'hover:text-foreground'} title="Move right">→</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-2 text-sm text-muted-foreground ${mediaUploading ? 'pointer-events-none opacity-60' : ''}`}>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={onMediaFiles}
            disabled={mediaUploading}
          />
          {mediaUploading ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
              Uploading…
            </>
          ) : (
            <>+ Upload images / videos (batch)</>
          )}
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">SKUs</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Add SKUs one by one. Each SKU pairs one or more attributes with values (e.g. Size → M + Color → Red). Only price, discount, active and default can be changed later; delete is not supported — deactivate instead.
        </p>

        {skus.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">SKU</th><th>Variants</th><th>Price</th><th>Discount</th><th>Valid</th><th>Qty</th><th>State</th><th></th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s) => (
                  <tr key={s.id} className={`border-t border-border ${!s.isActive ? 'opacity-50' : ''}`}>
                    <td className="py-2 font-medium">{s.sku}{s.isDefault ? ' ★' : ''}</td>
                    <td>{s.skuVariants?.map((v) => `${v.attribute?.name}: ${v.attributeValue?.name}`).join(', ')}</td>
                    {editingSkuId === s.id ? (
                      <>
                        <td>
                          <input type="number" min="0" className="w-20 rounded border border-input px-1.5 py-1" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
                        </td>
                        <td>
                          <input type="number" min="0" className="w-20 rounded border border-input px-1.5 py-1" placeholder="—" value={editForm.discountedPrice} onChange={(e) => setEditForm({ ...editForm, discountedPrice: e.target.value })} />
                        </td>
                        <td className="text-xs text-muted-foreground">locked</td>
                        <td>{s.quantity}</td>
                        <td>
                          <label className="mr-2 text-xs"><input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} /> Active</label>
                          <label className="text-xs"><input type="checkbox" checked={editForm.isDefault} onChange={(e) => setEditForm({ ...editForm, isDefault: e.target.checked })} /> Default</label>
                        </td>
                        <td className="text-right">
                          <button onClick={() => saveSku(s)} className="mr-3 text-primary">Save</button>
                          <button onClick={() => setEditingSkuId(null)} className="text-muted-foreground">Cancel</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{s.price}</td>
                        <td>{s.discountedPrice ?? '—'}</td>
                        <td className="text-xs">
                          {s.discountedPriceStartDate ? new Date(s.discountedPriceStartDate).toLocaleDateString() : '—'} → {s.discountedPriceEndDate ? new Date(s.discountedPriceEndDate).toLocaleDateString() : '—'}
                        </td>
                        <td>{s.quantity}</td>
                        <td>
                          <span className={`rounded-full px-2 py-0.5 text-xs ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button onClick={() => startEditSku(s)} className="mr-3 text-primary">Edit</button>
                          <button onClick={() => toggleSkuActive(s)} className={s.isActive ? 'text-red-600' : 'text-emerald-600'}>
                            {s.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!id ? (
          <p className="text-sm text-muted-foreground">Save the product first — then SKUs can be added here.</p>
        ) : (
          <form onSubmit={addSku} className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">Add SKU</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <label className="text-xs">SKU code *
                <input className="mt-1 w-full rounded-md border border-input px-2 py-1.5" required value={skuForm.sku} onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })} placeholder="e.g. TSH-RED-M" />
              </label>
              <label className="text-xs">Price *
                <input type="number" min="0" className="mt-1 w-full rounded-md border border-input px-2 py-1.5" required value={skuForm.price} onChange={(e) => setSkuForm({ ...skuForm, price: e.target.value })} />
              </label>
              <label className="text-xs">Discounted price
                <input type="number" min="0" placeholder="= price" className="mt-1 w-full rounded-md border border-input px-2 py-1.5" value={skuForm.discountedPrice} onChange={(e) => setSkuForm({ ...skuForm, discountedPrice: e.target.value })} />
              </label>
              <label className="text-xs">Quantity
                <input type="number" min="0" className="mt-1 w-full rounded-md border border-input px-2 py-1.5" value={skuForm.quantity} onChange={(e) => setSkuForm({ ...skuForm, quantity: e.target.value })} />
              </label>
              <label className="text-xs">Discount start
                <input type="datetime-local" className="mt-1 w-full rounded-md border border-input px-2 py-1.5" value={skuForm.startDate} onChange={(e) => setSkuForm({ ...skuForm, startDate: e.target.value })} />
              </label>
              <label className="text-xs">Discount end
                <input type="datetime-local" className="mt-1 w-full rounded-md border border-input px-2 py-1.5" value={skuForm.endDate} onChange={(e) => setSkuForm({ ...skuForm, endDate: e.target.value })} />
              </label>
              <label className="flex items-end gap-2 pb-1 text-xs">
                <input type="checkbox" checked={skuForm.isDefault} onChange={(e) => setSkuForm({ ...skuForm, isDefault: e.target.checked })} /> Default SKU
              </label>
            </div>

            <p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Variants — pick one attribute and its value per row (add as many rows as needed)</p>
            <div className="space-y-2">
              {variantRows.map((row) => (
                <div key={row.key} className="flex flex-wrap items-center gap-2">
                  <select
                    className="w-40 rounded-md border border-input px-2 py-1.5 text-xs"
                    value={row.attributeId}
                    onChange={(e) => {
                      setVariantRows((rows) =>
                        rows.map((r) => r.key === row.key ? { ...r, attributeId: e.target.value, attributeValueId: '' } : r),
                      );
                    }}
                  >
                    <option value="">Attribute…</option>
                    {attributes.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-40 rounded-md border border-input px-2 py-1.5 text-xs"
                    value={row.attributeValueId}
                    onChange={(e) =>
                      setVariantRows((rows) =>
                        rows.map((r) => r.key === row.key ? { ...r, attributeValueId: e.target.value } : r),
                      )
                    }
                    disabled={!row.attributeId}
                  >
                    <option value="">Value…</option>
                    {attributes.find((a) => a.id === Number(row.attributeId))?.values?.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeVariantRow(row.key)} className="text-xs text-red-600">Remove</button>
                </div>
              ))}
              {variantRows.length === 0 && <p className="text-xs text-muted-foreground">No variant selected yet — the SKU will still need at least one pair.</p>}
            </div>
            <button type="button" onClick={addVariantRow} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs">+ Add attribute/value row</button>

            <div className="mt-4">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Add SKU
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteMedia !== null}
        title="Delete media"
        message={`Delete this ${confirmDeleteMedia?.type === 'video' ? 'video' : 'image'} from the product gallery?`}
        onCancel={() => setConfirmDeleteMedia(null)}
        onConfirm={removeMedia}
      />
    </div>
  );
}