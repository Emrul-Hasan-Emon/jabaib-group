'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { uploadFile } from '@/lib/admin-upload';

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

export function CategoryForm({ categoryId }: { categoryId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = categoryId !== undefined;

  const [form, setForm] = useState(empty);
  const [rows, setRows] = useState<Category[]>([]);
  const [image, setImage] = useState<{ imageUrl: string; imagePath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<{ data: Category[] }>('/v1/admin/category?page=0&size=100');
    setRows(res.data);
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
    setBusy(true);
    try {
      const up = await uploadFile(file, 'category');
      setImage({ imageUrl: up.url, imagePath: up.path });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
              <option value="">— Root —</option>
              {rows.filter((r) => r.id !== categoryId).map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">Sort order
            <input type="number" className="mt-1 w-full rounded-md border border-input px-3 py-2" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
          </label>
          <label className="text-sm">Image
            <input type="file" accept="image/*" onChange={onImageChange} className="mt-1 block text-sm" />
            {image && <span className="mt-1 block truncate text-xs text-muted-foreground">{image.imageUrl}</span>}
          </label>
        </div>
        <button disabled={busy} className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {isEdit ? 'Update category' : 'Create category'}
        </button>
      </form>
    </div>
  );
}
