'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

interface OrderRow {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
  createdAt: string;
  user?: { name: string; phone: string | null } | null;
}

interface Division { id: number; name: string; districts: { id: number; name: string }[] }

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
const PAYMENT_METHODS = ['cod', 'bkash', 'nagad', 'card'];

export default function OrdersPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '50' });
    if (customerName) params.set('customerName', customerName);
    if (mobile) params.set('mobile', mobile);
    if (divisionId) params.set('divisionId', divisionId);
    if (districtId) params.set('districtId', districtId);
    if (method) params.set('paymentMethod', method);
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (startDate) params.set('startDate', new Date(startDate).toISOString());
    if (endDate) params.set('endDate', new Date(endDate).toISOString());
    const res = await api.get<{ data: OrderRow[] }>(`/v1/admin/order?${params}`);
    setRows(res.data);
  }, [api, customerName, mobile, divisionId, districtId, method, status, paymentStatus, startDate, endDate]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    api
      .get<Division[]>('/v1/admin/order/meta/locations')
      .then(setDivisions)
      .catch(() => {});
  }, [api]);

  const changeStatus = async (o: OrderRow, next: string) => {
    setBusyId(o.id);
    setError(null);
    try {
      await api.patch(`/v1/admin/order/${o.id}/status`, { status: next });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status change failed');
    } finally {
      setBusyId(null);
    }
  };

  const selectedDivision = divisions.find((d) => String(d.id) === divisionId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</div>
        <div className="flex flex-wrap gap-2">
          <input placeholder="Customer name" className="w-48 rounded-md border border-input px-3 py-2 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input placeholder="Mobile" className="w-40 rounded-md border border-input px-3 py-2 text-sm" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={divisionId} onChange={(e) => { setDivisionId(e.target.value); setDistrictId(''); }}>
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={districtId} onChange={(e) => setDistrictId(e.target.value)} disabled={!divisionId}>
            <option value="">All districts</option>
            {selectedDivision?.districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All payment methods</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All order statuses</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded-md border border-input px-3 py-2 text-sm" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="">All payment statuses</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
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
              <th className="px-4 py-2">Order #</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Payment method</th>
              <th className="px-4 py-2">Payment status</th>
              <th className="px-4 py-2">Order status</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{o.orderNumber}</td>
                <td className="px-4 py-2">
                  {o.user?.name ?? '—'}
                  {o.user?.phone && <div className="text-xs text-muted-foreground">{o.user.phone}</div>}
                </td>
                <td className="px-4 py-2">৳{o.total}</td>
                <td className="px-4 py-2">{o.paymentMethod}</td>
                <td className="px-4 py-2">{o.paymentStatus}</td>
                <td className="px-4 py-2">
                  <select
                    className="rounded-md border border-input px-2 py-1 text-xs capitalize"
                    value={o.status}
                    disabled={busyId === o.id}
                    onChange={(e) => changeStatus(o, e.target.value)}
                  >
                    <option value={o.status}>{o.status}</option>
                    {ORDER_STATUSES.filter((s) => s !== o.status).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-primary">Details</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No orders match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}