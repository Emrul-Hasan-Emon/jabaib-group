'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Banner {
  id: number;
  title: string;
  titleBN: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  position: string | null;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export default function BannersPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Banner[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Banner | null>(null);
  const [q, setQ] = useState('');
  const [position, setPosition] = useState('');
  const [isActive, setIsActive] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (position) params.set('position', position);
    if (isActive) params.set('isActive', isActive);
    const res = await api.get<{ data: Banner[] }>(`/v1/admin/banner?${params}`);
    setRows(res.data);
  }, [api, q, position, isActive]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/banner/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banners</h1>
        <Link href="/admin/banners/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add banner
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by title…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All positions</option>
          <option value="hero">hero</option>
          <option value="side">side</option>
          <option value="popup">popup</option>
        </select>
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
              <th className="px-4 py-2">Image</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Position</th>
              <th className="px-4 py-2">Link</th>
              <th className="px-4 py-2">Sort</th>
              <th className="px-4 py-2">Schedule</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="px-4 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="h-10 w-20 rounded-md border border-border object-cover" />
                </td>
                <td className="px-4 py-2 font-medium">{b.title}{b.titleBN ? ` · ${b.titleBN}` : ''}</td>
                <td className="px-4 py-2 capitalize">{b.position ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{b.linkUrl ?? '—'}</td>
                <td className="px-4 py-2">{b.sortOrder}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {b.startsAt ? new Date(b.startsAt).toLocaleDateString() : '—'} → {b.endsAt ? new Date(b.endsAt).toLocaleDateString() : '∞'}
                </td>
                <td className="px-4 py-2">{b.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(b)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/banners/${b.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(b)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No banners yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.title ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Title (BN)', value: detailsTarget.titleBN },
          { label: 'Position', value: detailsTarget.position },
          { label: 'Link URL', value: detailsTarget.linkUrl },
          { label: 'Sort order', value: detailsTarget.sortOrder },
          { label: 'Desktop image', value: detailsTarget.imageUrl },
          { label: 'Mobile image', value: detailsTarget.mobileImageUrl },
          { label: 'Starts', value: detailsTarget.startsAt ? new Date(detailsTarget.startsAt).toLocaleString() : '—' },
          { label: 'Ends', value: detailsTarget.endsAt ? new Date(detailsTarget.endsAt).toLocaleString() : '—' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete banner"
        message={`Delete banner "${deleteTarget?.title}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}