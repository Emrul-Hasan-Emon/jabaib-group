'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Zone {
  id: number;
  name: string;
  nameBN: string | null;
  code: string;
  charge: number;
  estimatedDays: number | null;
  isActive: boolean;
}

export default function ShippingZonesPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Zone[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Zone | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Zone | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (code) params.set('code', code);
    const res = await api.get<{ data: Zone[] }>(`/v1/admin/shipping-zone?${params}`);
    setRows(res.data);
  }, [api, code]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/shipping-zone/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shipping Zones</h1>
        <Link href="/admin/shipping-zones/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add zone
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Delivery charges are applied at checkout by delivery type.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={code} onChange={(e) => setCode(e.target.value)}>
          <option value="">All zones</option>
          <option value="inside_dhaka">inside_dhaka</option>
          <option value="outside_dhaka">outside_dhaka</option>
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Charge (BDT)</th>
              <th className="px-4 py-2">Est. days</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((z) => (
              <tr key={z.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{z.name}{z.nameBN ? ` · ${z.nameBN}` : ''}</td>
                <td className="px-4 py-2 font-mono text-xs">{z.code}</td>
                <td className="px-4 py-2">৳{z.charge}</td>
                <td className="px-4 py-2">{z.estimatedDays ?? '—'}</td>
                <td className="px-4 py-2">{z.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(z)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/shipping-zones/${z.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(z)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No shipping zones yet.</td></tr>
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
          { label: 'Code', value: detailsTarget.code },
          { label: 'Charge (BDT)', value: `৳${detailsTarget.charge}` },
          { label: 'Estimated days', value: detailsTarget.estimatedDays ?? '—' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete zone"
        message={`Delete shipping zone "${deleteTarget?.name}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}