'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';

interface LogRow {
  id: number;
  couponId: number;
  userId: number;
  orderId: number | null;
  couponCode: string;
  discountAmount: number;
  orderTotal: number;
  createdAt: string;
  coupon?: { code?: string } | null;
  user?: { id?: number; name?: string; phone?: string | null } | null;
  order?: { id?: number; orderNumber?: string } | null;
}

export default function CouponHistoryPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (couponCode) params.set('couponCode', couponCode);
    if (customerName) params.set('customerName', customerName);
    if (mobile) params.set('mobile', mobile);
    if (orderNumber) params.set('orderNumber', orderNumber);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const res = await api.get<{ data: LogRow[] }>(`/v1/admin/coupon-history?${params}`);
    setRows(res.data);
  }, [api, couponCode, customerName, mobile, orderNumber, startDate, endDate]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Coupon History</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Audit trail of every coupon application. One row per order where a coupon was used.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Coupon code…" className="rounded-md border border-input px-3 py-2 text-sm" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
        <input placeholder="Customer name…" className="rounded-md border border-input px-3 py-2 text-sm" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input placeholder="Mobile…" className="w-32 rounded-md border border-input px-3 py-2 text-sm" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        <input placeholder="Order no…" className="w-32 rounded-md border border-input px-3 py-2 text-sm" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        <input type="date" title="Used from" aria-label="Used from" className="rounded-md border border-input px-3 py-2 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" title="Used until" aria-label="Used until" className="rounded-md border border-input px-3 py-2 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Coupon</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Discount</th>
              <th className="px-4 py-2">Order total</th>
              <th className="px-4 py-2">Used at</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-semibold">{r.couponCode}</td>
                <td className="px-4 py-2">
                  {r.user ? `${r.user.name ?? `User #${r.user.id}`}${r.user.phone ? ` (${r.user.phone})` : ''}` : `User #${r.userId}`}
                </td>
                <td className="px-4 py-2">{r.order?.orderNumber ?? `#${r.orderId ?? '—'}`}</td>
                <td className="px-4 py-2">৳{Number(r.discountAmount).toLocaleString()}</td>
                <td className="px-4 py-2">৳{Number(r.orderTotal).toLocaleString()}</td>
                <td className="px-4 py-2">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No coupon usage yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}