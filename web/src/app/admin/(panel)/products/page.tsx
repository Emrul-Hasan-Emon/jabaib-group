'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Product {
  id: number;
  name: string;
  slug: string;
  isPublished: boolean;
  isFeatured: boolean;
  isActive: boolean;
  category?: { name: string } | null;
  productLabel?: { name: string } | null;
}

export default function ProductsPage() {
  const { api } = useAdminAuth();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Product | null>(null);
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [isPublished, setIsPublished] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const size = 10;

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (q) params.set('q', q);
    if (isPublished) params.set('isPublished', isPublished);
    const res = await api.get<{ data: Product[]; pagination: { totalItems: number; hasNext: boolean } }>(`/v1/admin/product?${params}`);
    setRows(res.data);
    setTotalPages(Math.ceil(res.pagination.totalItems / size));
  }, [api, page, q, isPublished]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add product
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          placeholder="Search by name…"
          className="rounded-md border border-input px-3 py-2 text-sm"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
        />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isPublished} onChange={(e) => { setIsPublished(e.target.value); setPage(0); }}>
          <option value="">All</option>
          <option value="true">Published</option>
          <option value="false">Unpublished</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Published</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-2">{p.productLabel?.name ?? '—'}</td>
                <td className="px-4 py-2">{p.isPublished ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2">{p.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(p)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/products/${p.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(p)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No products yet.</td></tr>
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
          { label: 'Label', value: detailsTarget.productLabel?.name },
          { label: 'Published', value: detailsTarget.isPublished ? 'Yes' : 'No' },
          { label: 'Featured', value: detailsTarget.isFeatured ? 'Yes' : 'No' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
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
