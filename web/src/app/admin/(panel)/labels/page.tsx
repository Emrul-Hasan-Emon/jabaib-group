'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Label {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  colorCode: string | null;
  isActive: boolean;
}

export default function LabelsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Label[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Label | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ data: Label[] }>('/v1/admin/product-label?page=0&size=100');
    setRows(res.data);
  }, [api]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/product-label/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Labels</h1>
        <Link href="/admin/labels/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add label
        </Link>
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
                  <Link href={`/admin/labels/${l.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(l)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No labels yet.</td></tr>
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
        title="Delete label"
        message={`Delete "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
