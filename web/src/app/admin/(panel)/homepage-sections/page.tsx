'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Section {
  id: number;
  key: string;
  title: string;
  titleBN: string | null;
  type: string;
  content: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
}

export default function HomepageSectionsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Section[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Section | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    const res = await api.get<{ data: Section[] }>(`/v1/admin/homepage-section?${params}`);
    setRows(res.data);
  }, [api, q, type]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/homepage-section/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Homepage Sections</h1>
        <Link href="/admin/homepage-sections/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add section
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by title…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="products">products</option>
          <option value="categories">categories</option>
          <option value="banners">banners</option>
          <option value="custom">custom</option>
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Sort</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{s.key}</td>
                <td className="px-4 py-2 font-medium">{s.title}{s.titleBN ? ` · ${s.titleBN}` : ''}</td>
                <td className="px-4 py-2 capitalize">{s.type}</td>
                <td className="px-4 py-2">{s.sortOrder}</td>
                <td className="px-4 py-2">{s.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(s)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/homepage-sections/${s.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(s)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No sections yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.title ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Key', value: detailsTarget.key },
          { label: 'Title (BN)', value: detailsTarget.titleBN },
          { label: 'Type', value: detailsTarget.type },
          { label: 'Sort order', value: detailsTarget.sortOrder },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
          { label: 'Content', value: detailsTarget.content ? <code className="block max-w-[220px] truncate text-xs">{JSON.stringify(detailsTarget.content)}</code> : '—' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete section"
        message={`Delete section "${deleteTarget?.key}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}