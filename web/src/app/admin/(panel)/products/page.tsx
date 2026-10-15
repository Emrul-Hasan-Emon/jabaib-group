'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';
import { flattenCategoryTree, type CategoryTree } from '@/lib/category-tree';

interface Product {
  id: number;
  name: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  isActive: boolean;
  thumbnailUrl: string | null;
  category?: { id: number; name: string } | null;
  collection?: { id: number; name: string } | null;
}

interface Category { id: number; name: string; parentId: number | null }
interface Option { id: number; name: string }

export default function ProductsPage() {
  const { api } = useAdminAuth();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Product | null>(null);
  const [rows, setRows] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<Option[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [isFeatured, setIsFeatured] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const size = 10;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) params.set('q', q);
    if (categoryId) params.set('categoryId', categoryId);
    if (collectionId) params.set('collectionId', collectionId);
    if (isFeatured) params.set('isFeatured', isFeatured);
    if (isActive) params.set('isActive', isActive);
    const res = await api.get<{ data: Product[]; pagination: { totalItems: number; hasNext: boolean } }>(`/v1/admin/product?${params}`);
    setRows(res.data);
    setTotalPages(Math.ceil(res.pagination.totalItems / size));
  }, [api, page, q, categoryId, collectionId, isFeatured, isActive]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    api
      .get<CategoryTree[]>('/v1/admin/category/tree')
      .then((nodes) => setCategories(flattenCategoryTree(nodes)))
      .catch(() => {});
    api
      .get<{ data: Option[] }>('/v1/admin/collection?page=0&size=100')
      .then((r) => setCollections(r.data))
      .catch(() => {});
  }, [api]);

  const catName = (id: number) => {
    const c = categories.find((x) => x.id === id);
    if (!c) return '';
    return c.parentId ? `${categories.find((p) => p.id === c.parentId)?.name ?? ''} / ${c.name}` : c.name;
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add product
        </Link>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search by name…"
          className="rounded-md border border-input px-3 py-2 text-sm"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
        />
        <select
          className="rounded-md border border-input px-3 py-2 text-sm"
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(0); }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{catName(c.id) || c.name}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-input px-3 py-2 text-sm"
          value={collectionId}
          onChange={(e) => { setCollectionId(e.target.value); setPage(0); }}
        >
          <option value="">All collections</option>
          {collections.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isFeatured} onChange={(e) => { setIsFeatured(e.target.value); setPage(0); }}>
          <option value="">All featured</option>
          <option value="true">Featured</option>
          <option value="false">Not featured</option>
        </select>
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => { setIsActive(e.target.value); setPage(0); }}>
          <option value="">All active</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Collection</th>
              <th className="px-4 py-2">Featured</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" className="h-10 w-10 rounded-md border border-border object-cover" />}
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-2">{p.collection?.name ?? '—'}</td>
                <td className="px-4 py-2">{p.isFeatured ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">{p.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(p)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-primary">View</Link>
                  <Link href={`/admin/products/${p.id}/edit`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(p)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No products found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Prev</button>
        <span>Page {page + 1}{totalPages ? ` / ${totalPages}` : ''}</span>
        <button onClick={() => setPage(page + 1)} className="rounded-md border border-border px-3 py-1">Next</button>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.name ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Name', value: detailsTarget.name },
          { label: 'Slug', value: detailsTarget.slug },
          { label: 'Category', value: detailsTarget.category?.name },
          { label: 'Collection', value: detailsTarget.collection?.name },
          { label: 'Featured', value: detailsTarget.isFeatured ? 'Yes' : 'No' },
          { label: 'Published', value: detailsTarget.isPublished ? 'Yes' : 'No' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
          { label: 'Thumbnail', value: detailsTarget.thumbnailUrl },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete product"
        message={`Delete "${deleteTarget?.name}"? Its SKUs and media will also be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await api.del(`/v1/admin/product/${deleteTarget.id}`);
          setDeleteTarget(null);
          await load();
        }}
      />
    </div>
  );
}