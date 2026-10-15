'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';
import { flattenCategoryTree, type CategoryTree, type FlatCategory } from '@/lib/category-tree';

interface Category {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  description: string | null;
  descriptionBN: string | null;
  imageUrl: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  parent?: Category | null;
}

export default function CategoriesPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Category[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Category | null>(null);
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filters = useCallback(async () => {
    const nodes = await api.get<CategoryTree[]>('/v1/admin/category/tree');
    return flattenCategoryTree(nodes);
  }, [api]);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (isActive) params.set('isActive', isActive);
    if (parentId) params.set('parentId', parentId);
    const res = await api.get<{ data: Category[] }>(`/v1/admin/category?${params}`);
    setRows(res.data);
  }, [api, q, isActive, parentId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const [parentOptions, setParentOptions] = useState<FlatCategory[]>([]);
  useEffect(() => {
    filters().then(setParentOptions).catch(() => {});
  }, [filters]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/category/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Link href="/admin/categories/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add category
        </Link>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All active states</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">All parents</option>
          <option value="null">Root only</option>
          {parentOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.parentName ? `${c.parentName} / ` : ''}{c.name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Parent</th>
              <th className="px-4 py-2">Sort</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{c.name}{c.nameBN ? ` · ${c.nameBN}` : ''}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-2">{c.parent?.name ?? '—'}</td>
                <td className="px-4 py-2">{c.sortOrder}</td>
                <td className="px-4 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(c)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/categories/${c.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(c)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.name ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Name', value: detailsTarget.name },
          { label: 'Name (BN)', value: detailsTarget.nameBN },
          { label: 'Slug', value: detailsTarget.slug },
          { label: 'Description', value: detailsTarget.description },
          { label: 'Description (BN)', value: detailsTarget.descriptionBN },
          { label: 'Parent', value: detailsTarget.parent?.name },
          { label: 'Sort order', value: detailsTarget.sortOrder },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
          { label: 'Image', value: detailsTarget.imageUrl },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete category"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
