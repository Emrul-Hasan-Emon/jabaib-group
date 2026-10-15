'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Collection {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  colorCode: string | null;
  isActive: boolean;
}

export default function CollectionsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Collection[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Collection | null>(null);
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (isActive) params.set('isActive', isActive);
    const res = await api.get<{ data: Collection[] }>(`/v1/admin/collection?${params}`);
    setRows(res.data);
  }, [api, q, isActive]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/collection/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collections</h1>
        <Link href="/admin/collections/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add collection
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Color</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{l.name}{l.nameBN ? ` · ${l.nameBN}` : ''}</td>
                <td className="px-4 py-2 text-muted-foreground">{l.slug}</td>
                <td className="px-4 py-2"><span className="inline-block h-4 w-8 rounded" style={{ background: l.colorCode ?? '#ddd' }} /></td>
                <td className="px-4 py-2">{l.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(l)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/collections/${l.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(l)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No collections yet.</td></tr>
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
          { label: 'Color', value: detailsTarget.colorCode },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete collection"
        message={`Delete "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}