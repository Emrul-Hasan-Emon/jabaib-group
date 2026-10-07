'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { uploadImage } from '@/lib/admin-upload';
import { flattenCategoryTree, type CategoryTree, type FlatCategory } from '@/lib/category-tree';

interface Category {
  id: number;
  name: string;
  nameBN: string | null;
  description: string | null;
  descriptionBN: string | null;
  imageUrl: string | null;
  imagePath: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
}

const empty = {
  name: '',
  nameBN: '',
  description: '',
  descriptionBN: '',
  parentId: '',
  sortOrder: 0,
  isActive: true,
};

/** Flat category list → indented, depth-aware options for a tree select. */
function useTreeOptions(
  rows: FlatCategory[],
  excludeId?: number,
): Array<{ id: number; label: string }> {
  return useMemo(() => {
    const children = new Map<number | null, FlatCategory[]>();
    for (const c of rows) {
      const key = c.parentId ?? null;
      if (!children.has(key)) children.set(key, []);
      children.get(key)!.push(c);
    }
    const out: Array<{ id: number; label: string }> = [];
    const walk = (parentId: number | null, depth: number) => {
      for (const c of children.get(parentId) ?? []) {
        if (c.id === excludeId) continue;
        out.push({ id: c.id, label: `${'—'.repeat(depth)}${c.name}` });
        walk(c.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [rows, excludeId]);
}

export function CategoryForm({ categoryId }: { categoryId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = categoryId !== undefined;

  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState<FlatCategory[]>([]);
  const [image, setImage] = useState<{ imageUrl: string; imagePath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const treeOptions = useTreeOptions(rows, categoryId);

  const load = useCallback(async () => {
    const nodes = await api.get<CategoryTree[]>('/v1/admin/category/tree');
    setRows(flattenCategoryTree(nodes));
  }, [api]);

  useEffect(() => {
    load().catch(() => {});
    if (categoryId) {
      api.get<Category>(`/v1/admin/category/${categoryId}`).then((c) => {
        setForm({
          name: c.name,
          nameBN: c.nameBN ?? '',
          description: c.description ?? '',
          descriptionBN: c.descriptionBN ?? '',
          parentId: c.parentId ? String(c.parentId) : '',
          sortOrder: c.sortOrder,
          isActive: c.isActive,
        });
        setImage(c.imageUrl ? { imageUrl: c.imageUrl, imagePath: c.imagePath ?? '' } : null);
      });
    }
  }, [api, categoryId, load]);

  const onImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const up = await uploadImage(file, 'category');
      setImage({ imageUrl: up.url, imagePath: up.path });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      nameBN: form.nameBN || undefined,
      description: form.description || undefined,
      descriptionBN: form.descriptionBN || undefined,
      parentId: form.parentId ? Number(form.parentId) : undefined,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive,
      imageUrl: image?.imageUrl,
      imagePath: image?.imagePath,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/category/${categoryId}`, payload);
      } else {
        await api.post('/v1/admin/category', payload);
      }
      router.push('/admin/categories');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit category' : 'Add category'}</h1>
        <Link href="/admin/categories" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={form.nameBN} onChange={(e) => setForm({ ...form, nameBN: e.target.value })} />
          </label>
          <label className="text-sm">Description
            <textarea className="mt-1 w-full rounded-md border border-input px-3 py-2" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label className="text-sm">Description (BN)
            <textarea className="mt-1 w-full rounded-md border border-input px-3 py-2" rows={2} value={form.descriptionBN} onChange={(e) => setForm({ ...form, descriptionBN: e.target.value })} />
          </label>
          <label className="text-sm">Parent category
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
              <option value="">— Root (no parent) —</option>
              {treeOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Sort order
            <input type="number" className="mt-1 w-full rounded-md border border-input px-3 py-2" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
          </label>
        </div>

        <div className="mt-5">
          <span className="text-sm font-medium">Cover image</span>
          <div className="mt-2 flex items-start gap-4 rounded-lg border border-dashed border-border p-4">
            {image ? (
              <>
                <img src={image.imageUrl} alt="preview" className="h-24 w-24 rounded-lg border border-border object-cover" />
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground">{image.imageUrl}</span>
                  <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-center text-xs font-medium">
                    Change image
                    <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                  </label>
                  <button type="button" onClick={() => setImage(null)} className="text-left text-xs text-red-600">Remove image</button>
                </div>
              </>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-1 py-6 text-center text-sm text-muted-foreground">
                <input type="file" accept="image/*" className="hidden" onChange={onImageChange} />
                {uploading ? 'Uploading…' : 'Click to upload a cover image (JPG / PNG / WEBP)'}
              </label>
            )}
          </div>
        </div>

        <button disabled={busy || uploading} className="mt-5 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {isEdit ? 'Update category' : 'Create category'}
        </button>
      </form>
    </div>
  );
}