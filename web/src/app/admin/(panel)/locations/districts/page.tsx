'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface District {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  countryId: number;
  divisionId: number;
  isActive: boolean;
  division?: { name?: string } | null;
  country?: { name?: string } | null;
}

export default function DistrictsPage() {
  const { api } = useAdminAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<District[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<District | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<District | null>(null);
  const [q, setQ] = useState('');
  const [countryId, setCountryId] = useState(searchParams?.get('countryId') ?? '');
  const [divisionId, setDivisionId] = useState(searchParams?.get('divisionId') ?? '');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (countryId) params.set('countryId', countryId);
    if (divisionId) params.set('divisionId', divisionId);
    const res = await api.get<{ data: District[] }>(`/v1/admin/district?${params}`);
    setRows(res.data);
  }, [api, q, countryId, divisionId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/district/${deleteTarget.id}`);
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
          <h1 className="text-2xl font-bold">Locations — Districts</h1>
          <p className="text-sm text-muted-foreground">Districts belong to a division.</p>
        </div>
        <Link href="/admin/locations/districts/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add district
        </Link>
      </div>
      <nav className="mb-4 flex gap-1 rounded-lg bg-muted p-1 text-sm">
        <Link href="/admin/locations/countries" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-primary">Countries</Link>
        <Link href="/admin/locations/divisions" className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-primary">Divisions</Link>
        <span className="rounded-md bg-card px-3 py-1.5 font-semibold shadow-sm">Districts</span>
      </nav>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Country ID…" className="w-28 rounded-md border border-input px-3 py-2 text-sm" value={countryId} onChange={(e) => setCountryId(e.target.value)} />
        <input placeholder="Division ID…" className="w-28 rounded-md border border-input px-3 py-2 text-sm" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Division</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{d.name}{d.nameBN ? ` · ${d.nameBN}` : ''}</td>
                <td className="px-4 py-2">{d.division?.name ?? `#${d.divisionId}`}</td>
                <td className="px-4 py-2">{d.country?.name ?? `#${d.countryId}`}</td>
                <td className="px-4 py-2 text-muted-foreground">{d.slug}</td>
                <td className="px-4 py-2">{d.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(d)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/locations/districts/${d.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(d)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No districts yet.</td></tr>
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
          { label: 'Division', value: detailsTarget.division?.name ?? `#${detailsTarget.divisionId}` },
          { label: 'Country', value: detailsTarget.country?.name ?? `#${detailsTarget.countryId}` },
          { label: 'Slug', value: detailsTarget.slug },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete district"
        message={`Delete district "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}