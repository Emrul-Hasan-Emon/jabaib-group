'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Coupon {
  id: number;
  code: string;
  type: 'flat' | 'percent';
  amount: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

export default function CouponsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Coupon[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Coupon | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [isActive, setIsActive] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (code) params.set('code', code);
    if (type) params.set('type', type);
    if (isActive) params.set('isActive', isActive);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await api.get<{ data: Coupon[] }>(`/v1/admin/coupon?${params}`);
    setRows(res.data);
  }, [api, code, type, isActive, startDate, endDate]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/coupon/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <Link href="/admin/coupons/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add coupon
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search by code…" className="rounded-md border border-input px-3 py-2 text-sm" value={code} onChange={(e) => setCode(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="flat">Flat</option>
          <option value="percent">Percent</option>
        </select>
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <input type="date" title="Eligible from" aria-label="Eligible from" className="rounded-md border border-input px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" title="Eligible until" aria-label="Eligible until" className="rounded-md border border-input px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <p className="-mt-2 mb-4 text-xs text-muted-foreground">
        The date-range filter returns coupons active within the selected window (their validity overlaps it), not coupons created in that period.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Min order</th>
              <th className="px-4 py-2">Used</th>
              <th className="px-4 py-2">Limit/user</th>
              <th className="px-4 py-2">Valid until</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-semibold">{c.code}</td>
                <td className="px-4 py-2 capitalize">{c.type}</td>
                <td className="px-4 py-2">{c.type === 'percent' ? `${c.amount}%` : `৳${c.amount}`}</td>
                <td className="px-4 py-2">{c.minOrderAmount ? `৳${c.minOrderAmount}` : '—'}</td>
                <td className="px-4 py-2">{c.usageLimit ? `${c.usedCount}/${c.usageLimit}` : c.usedCount}</td>
                <td className="px-4 py-2">{c.perUserLimit > 0 ? c.perUserLimit : '∞'}</td>
                <td className="px-4 py-2">{c.endsAt ? new Date(c.endsAt).toLocaleDateString() : 'Never'}</td>
                <td className="px-4 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(c)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/coupons/${c.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(c)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">No coupons yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.code ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Type', value: detailsTarget.type },
          { label: 'Value', value: detailsTarget.type === 'percent' ? `${detailsTarget.amount}%` : `৳${detailsTarget.amount}` },
          { label: 'Min order total', value: detailsTarget.minOrderAmount ? `৳${detailsTarget.minOrderAmount}` : '—' },
          { label: 'Max discount', value: detailsTarget.maxDiscountAmount ? `৳${detailsTarget.maxDiscountAmount}` : '—' },
          { label: 'Usage', value: detailsTarget.usageLimit ? `${detailsTarget.usedCount} / ${detailsTarget.usageLimit}` : `${detailsTarget.usedCount} used` },
          { label: 'Per-user limit', value: detailsTarget.perUserLimit },
          { label: 'Starts', value: detailsTarget.startsAt ? new Date(detailsTarget.startsAt).toLocaleString() : '—' },
          { label: 'Ends', value: detailsTarget.endsAt ? new Date(detailsTarget.endsAt).toLocaleString() : '—' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete coupon"
        message={`Delete coupon "${deleteTarget?.code}"?`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}