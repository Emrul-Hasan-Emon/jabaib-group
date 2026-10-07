'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Country {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  code: string | null;
  currency: string | null;
  divisionCount: number;
  isActive: boolean;
}

export default function CountriesPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Country[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Country | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Country | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    const res = await api.get<{ data: Country[] }>(`/v1/admin/country?${params}`);
    setRows(res.data);
  }, [api, q]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/country/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Locations — Countries</h1>
          <p className="text-sm text-muted-foreground">Manage countries, divisions and districts.</p>
        </div>
        <Link href="/admin/locations/countries/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add country
        </Link>
      </div>
      <nav className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm">
        <span className="rounded-md bg-card px-3 py-1.5 font-semibold shadow-sm">Countries</span>
        <Link href="/admin/locations/divisions" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-primary">Divisions</Link>
        <Link href="/admin/locations/districts" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-primary">Districts</Link>
      </nav>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Currency</th>
              <th className="px-4 py-2">Divisions</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{c.name}{c.nameBN ? ` · ${c.nameBN}` : ''}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.slug}</td>
                <td className="px-4 py-2">{c.code ?? '—'}</td>
                <td className="px-4 py-2">{c.currency ?? '—'}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/locations/divisions?countryId=${c.id}`} className="text-primary">{c.divisionCount}</Link>
                </td>
                <td className="px-4 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(c)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/locations/countries/${c.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(c)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No countries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.name ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Name (BN)', value: detailsTarget.nameBN },
          { label: 'Slug', value: detailsTarget.slug },
          { label: 'Code', value: detailsTarget.code },
          { label: 'Currency', value: detailsTarget.currency },
          { label: 'Divisions', value: detailsTarget.divisionCount },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete country"
        message={`Delete country "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}