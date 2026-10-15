'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface Language {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
  isActive: boolean;
}

export default function LanguagesPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Language[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Language | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    const res = await api.get<{ data: Language[] }>(`/v1/admin/language?${params}`);
    setRows(res.data);
  }, [api, q]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/language/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Languages</h1>
        <Link href="/admin/languages/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add language
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Default</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{l.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{l.code}</td>
                <td className="px-4 py-2">{l.isDefault ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Default</span> : '—'}</td>
                <td className="px-4 py-2">{l.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/languages/${l.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(l)} className="text-red-600" disabled={l.isDefault}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No languages yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete language"
        message={`Delete language "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}