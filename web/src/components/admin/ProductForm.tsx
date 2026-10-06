'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { uploadFile } from '@/lib/admin-upload';

interface Option { id: number; name: string }
interface CategoryOption extends Option { parent?: Option | null }

interface AttributeValue { id: number; name: string; attributeId: number }
interface Attribute { id: number; name: string; values: AttributeValue[] }

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
  categoryId: '', productLabelId: '', isFeatured: false, isPublished: true, isActive: true,
  seoTitle: '', seoTitleBN: '', seoDescription: '', seoDescriptionBN: '',
};

export function ProductForm({ productId }: { productId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = productId !== undefined;

  const [basic, setBasic] = useState(emptyBasic);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [labels, setLabels] = useState<Option[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [skus, setSkus] = useState<Sku[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [id, setId] = useState<number | undefined>(productId);
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  // SKU form state
  const [skuForm, setSkuForm] = useState({
    sku: '', price: '', discountedPrice: '', startDate: '', endDate: '', quantity: '0', isDefault: false,
  });
  // attributeId -> attributeValueId ('' = none)
  const [pairSelection, setPairSelection] = useState<Record<number, string>>({});

  const loadMeta = useCallback(async () => {
    const [cats, lbls, attrs] = await Promise.all([
      api.get<{ data: CategoryOption[] }>('/v1/admin/category?page=0&size=100'),
      api.get<{ data: Option[] }>('/v1/admin/product-label?page=0&size=100'),
      api.get<{ data: Attribute[] }>('/v1/admin/attribute?page=0&size=100'),
    ]);
    setCategories(cats.data);
    setLabels(lbls.data);
    setAttributes(attrs.data);
  }, [api]);

  const loadProduct = useCallback(async (pid: number) => {
    const p = await api.get<Record<string, any>>(`/v1/admin/product/${pid}`);
    setBasic({
      name: p.name, nameBN: p.nameBN ?? '', slug: p.slug ?? '',
      description: p.description ?? '', descriptionBN: p.descriptionBN ?? '',
      categoryId: String(p.categoryId), productLabelId: p.productLabelId ? String(p.productLabelId) : '',
      isFeatured: p.isFeatured, isPublished: p.isPublished, isActive: p.isActive,
      seoTitle: p.seoTitle ?? '', seoTitleBN: p.seoTitleBN ?? '',
      seoDescription: p.seoDescription ?? '', seoDescriptionBN: p.seoDescriptionBN ?? '',
    });
    setThumbnail(p.thumbnailUrl ?? null);
    setSkus(p.skus ?? []);
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
      productLabelId: basic.productLabelId ? Number(basic.productLabelId) : undefined,
      isFeatured: basic.isFeatured,
      isPublished: basic.isPublished,
      isActive: basic.isActive,
      seoTitle: basic.seoTitle || undefined,
      seoTitleBN: basic.seoTitleBN || undefined,
      seoDescription: basic.seoDescription || undefined,
      seoDescriptionBN: basic.seoDescriptionBN || undefined,
    };
    try {
      if (id) {
        await api.patch(`/v1/admin/product/${id}`, payload);
        setNotice('Product updated.');
      } else {
        const created = await api.post<{ id: number }>('/v1/admin/product', payload);
        setId(created.id);
        setNotice('Product saved — you can now add SKUs below.');
        // stay on the form so SKUs can be added
        window.history.replaceState(null, '', `/admin/products/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const onThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) {
      if (!id) setError('Save the product first, then upload the thumbnail.');
      return;
    }
    setError(null);
    try {
      const up = await uploadFile(file, 'product');
      await api.patch(`/v1/admin/product/${id}`, { thumbnailUrl: up.url, thumbnailPath: up.path });
      setThumbnail(up.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const addSku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const pairs = Object.entries(pairSelection)
      .filter(([, v]) => v !== '')
      .map(([attributeId, attributeValueId]) => ({
        attributeId: Number(attributeId),
        attributeValueId: Number(attributeValueId),
      }));
    if (pairs.length === 0) {
      setError('Select at least one attribute value.');
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
      setPairSelection({});
      await loadProduct(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const removeSku = async (skuId: number) => {
    if (!confirm('Delete this SKU?')) return;
    await api.del(`/v1/admin/sku/${skuId}`);
    if (id) await loadProduct(id);
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit product' : 'Add product'}</h1>
        <button type="button" onClick={() => router.push('/admin/products')} className="text-sm text-muted-foreground">← Back to list</button>
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
              {categories.map((c) => <option key={c.id} value={c.id}>{c.parent ? `${c.parent.name} / ` : ''}{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Label
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.productLabelId} onChange={(e) => setBasic({ ...basic, productLabelId: e.target.value })}>
              <option value="">None</option>
              {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
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
          <label className="text-sm">SEO title
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.seoTitle} onChange={(e) => setBasic({ ...basic, seoTitle: e.target.value })} />
          </label>
          <label className="text-sm">SEO title (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={basic.seoTitleBN} onChange={(e) => setBasic({ ...basic, seoTitleBN: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-2">Thumbnail
            <input type="file" accept="image/*" className="mt-1 block text-sm" onChange={onThumbnail} />
            {thumbnail && <span className="mt-1 block truncate text-xs text-muted-foreground">{thumbnail}</span>}
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {id ? 'Update product' : 'Save product'}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">SKUs</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          One SKU = one attribute/value combination (e.g. Size M + Color Red). `discountedPrice` defaults to `price` when blank.
        </p>

        {skus.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1">SKU</th><th>Variants</th><th>Price</th><th>Discount</th><th>Valid</th><th>Qty</th><th></th>
                </tr>
              </thead>
              <tbody>
                {skus.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-medium">{s.sku}{s.isDefault ? ' ★' : ''}</td>
                    <td>{s.skuVariants?.map((v) => `${v.attribute?.name}: ${v.attributeValue?.name}`).join(', ')}</td>
                    <td>{s.price}</td>
                    <td>{s.discountedPrice ?? '—'}</td>
                    <td className="text-xs">{s.discountedPriceStartDate ? new Date(s.discountedPriceStartDate).toLocaleDateString() : '—'} → {s.discountedPriceEndDate ? new Date(s.discountedPriceEndDate).toLocaleDateString() : '—'}</td>
                    <td>{s.quantity}</td>
                    <td className="text-right">
                      <button onClick={() => removeSku(s.id)} className="text-red-600">Delete</button>
                    </td>
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
                <input className="mt-1 w-full rounded-md border border-input px-2 py-1.5" required value={skuForm.sku} onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })} />
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

            <p className="mb-2 mt-4 text-xs font-semibold text-muted-foreground">Variants — pick one value per attribute</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {attributes.map((a) => (
                <label key={a.id} className="text-xs">{a.name}
                  <select className="mt-1 w-full rounded-md border border-input px-2 py-1.5" value={pairSelection[a.id] ?? ''} onChange={(e) => setPairSelection({ ...pairSelection, [a.id]: e.target.value })}>
                    <option value="">—</option>
                    {a.values?.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </label>
              ))}
            </div>

            <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Add SKU
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
