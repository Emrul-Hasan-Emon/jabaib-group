'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Setting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  group: string | null;
}

export default function SystemSettingsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Setting[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Setting | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Setting | null>(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (group) params.set('group', group);
    const res = await api.get<{ data: Setting[] }>(`/v1/admin/system-setting?${params}`);
    setRows(res.data);
  }, [api, q, group]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/system-setting/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Settings</h1>
        <Link href="/admin/system-settings/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add setting
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Key-value store for site-wide config: name, contact, social links, delivery and payment toggles.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by key…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">All groups</option>
          {['general', 'contact', 'shipping', 'payment', 'social'].map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-xs">{s.key}</td>
                <td className="max-w-xs truncate px-4 py-2">{s.value ?? '—'}</td>
                <td className="px-4 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{s.group ?? 'general'}</span></td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(s)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/system-settings/${s.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(s)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No settings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.key ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Key', value: detailsTarget.key },
          { label: 'Value', value: detailsTarget.value },
          { label: 'Group', value: detailsTarget.group ?? 'general' },
          { label: 'Description', value: detailsTarget.description },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete setting"
        message={`Delete setting "${deleteTarget?.key}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}