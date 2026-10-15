'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

interface ReturnRow {
  id: number;
  returnNumber: string;
  status: string;
  refundAmount: number;
  refundMethod: string | null;
  createdAt: string;
  user?: { name: string } | null;
  order?: { orderNumber: string } | null;
}

const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'picked_up', 'refunded', 'completed'];

export default function ReturnsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '50' });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    if (orderNumber) params.set('orderNumber', orderNumber);
    if (customerName) params.set('customerName', customerName);
    if (refundMethod) params.set('refundMethod', refundMethod);
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    const res = await api.get<{ data: ReturnRow[] }>(`/v1/admin/order-return?${params}`);
    setRows(res.data);
  }, [api, status, q, orderNumber, customerName, refundMethod, startDate, endDate]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Returns</h1>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</div>
        <div className="flex flex-wrap gap-2">
          <input placeholder="Return #" className="w-40 rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
          <input placeholder="Order #" className="w-40 rounded-md border border-input px-3 py-2 text-sm" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
          <input placeholder="Customer name" className="w-44 rounded-md border border-input px-3 py-2 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {RETURN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
            <option value="">All refund methods</option>
            {['bkash', 'nagad', 'bank', 'card', 'cod'].map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" title="Start date" className="rounded-md border border-input px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <input type="date" title="End date" className="rounded-md border border-input px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Return #</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Refund</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{r.returnNumber}</td>
                <td className="px-4 py-2">{r.order?.orderNumber ?? '—'}</td>
                <td className="px-4 py-2">{r.user?.name ?? '—'}</td>
                <td className="px-4 py-2">
                  ৳{r.refundAmount}
                  {r.refundMethod && <div className="text-xs text-muted-foreground">{r.refundMethod}</div>}
                </td>
                <td className="px-4 py-2"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{r.status}</span></td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/returns/${r.id}`} className="text-primary">Details</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No returns match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}