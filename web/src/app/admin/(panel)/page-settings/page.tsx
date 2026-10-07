'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface PageSetting {
  id: number;
  key: string;
  title: string;
  titleBN: string | null;
  isActive: boolean;
}

export default function PageSettingsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<PageSetting[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<PageSetting | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<PageSetting | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    const res = await api.get<{ data: PageSetting[] }>(`/v1/admin/page-settings?${params}`);
    setRows(res.data);
  }, [api, q]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/page-settings/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Page Settings</h1>
        <Link href="/admin/page-settings/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add page
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Static CMS pages shown on the storefront: about, contact, terms, return policy, etc.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search title or key…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Title (BN)</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{p.key}</td>
                <td className="px-4 py-2 font-medium">{p.title}</td>
                <td className="px-4 py-2">{p.titleBN ?? '—'}</td>
                <td className="px-4 py-2">{p.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(p)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/page-settings/${p.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(p)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No pages yet.</td></tr>
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
          { label: 'Title', value: detailsTarget.title },
          { label: 'Title (BN)', value: detailsTarget.titleBN },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete page"
        message={`Delete page "${deleteTarget?.key}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}