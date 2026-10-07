'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

const NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};
const ALL_STATUSES = Object.keys(NEXT);

export default function OrderDetailPage() {
  const { api } = useAdminAuth();
  const params = useParams();
  const id = Number(params.id);
  const [order, setOrder] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<any>(`/v1/admin/order/${id}`);
    setOrder(res);
    setNote(res.note ?? '');
  }, [api, id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  if (!order) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const transition = async (status: string) => {
    if (!status) return;
    try {
      await api.patch(`/v1/admin/order/${id}/status`, { status });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const recordPayment = async () => {
    try {
      await api.post(`/v1/admin/order/${id}/payment`, {});
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const saveNote = async () => {
    await api.patch(`/v1/admin/order/${id}/note`, { note });
    await load();
  };

  const nextStatuses = ALL_STATUSES.filter((s) => s !== order.status);

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Order {order.orderNumber}</h1>
        <button onClick={() => window.print()} className="rounded-md border border-border px-3 py-1.5 text-sm">Print</button>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Status</div><div className="font-semibold">{order.status}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Payment</div><div className="font-semibold">{order.paymentMethod} · {order.paymentStatus}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Delivery</div><div className="font-semibold">{order.deliveryType}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Total</div><div className="font-semibold">৳{order.total}</div></div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Change status:</span>
          <select
            className="rounded-md border border-input px-3 py-1.5 text-sm capitalize"
            value=""
            onChange={(e) => transition(e.target.value)}
          >
            <option value="">Select…</option>
            {nextStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        {(NEXT[order.status] ?? []).length > 0 && (
          <span className="text-xs text-muted-foreground">
            From “{order.status}” you can move to: {(NEXT[order.status] ?? []).join(', ')}
          </span>
        )}
        {order.paymentStatus !== 'paid' && (
          <button onClick={recordPayment} className="rounded-md border border-border px-3 py-1.5 text-sm">Record payment received</button>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Items</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-1">Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>
            {order.items?.map((it: any) => (
              <tr key={it.id} className="border-t border-border">
                <td className="py-2">{it.productName}</td>
                <td>{it.skuData}</td>
                <td>{it.quantity}</td>
                <td>৳{it.unitDiscountedPricePrice}</td>
                <td>৳{it.totalDiscountedPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-right text-sm">
          <div>Subtotal: ৳{order.subtotal}</div>
          <div>Delivery: ৳{order.deliveryCharge}</div>
          <div>Discount: -৳{order.discountAmount}</div>
          <div className="font-bold">Total: ৳{order.total}</div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Customer</h2>
          <p className="text-sm">{order.user?.name} · {order.user?.phone}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Delivery address</h2>
          <p className="text-sm">{order.address?.recipientName} · {order.address?.phone}<br />{order.address?.address}<br />{order.address?.division?.name}, {order.address?.district?.name}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 font-semibold">Status history</h2>
        <ol className="relative border-l border-border pl-4 text-sm">
          {order.statusHistory?.map((h: any) => (
            <li key={h.id} className="mb-2">
              <span className="font-medium capitalize">{h.status}</span>
              {h.note && <span className="text-muted-foreground"> — {h.note}</span>}
              <div className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 font-semibold">Admin note</h2>
        <textarea rows={3} className="w-full rounded-md border border-input px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={saveNote} className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save note</button>
      </div>

      {order.payments?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 font-semibold">Payments</h2>
          {order.payments.map((p: any) => (
            <p key={p.id} className="text-sm">{p.method} · ৳{p.amount} · {p.status} · {p.transactionId ?? '—'} · {p.paidAt && new Date(p.paidAt).toLocaleString()}</p>
          ))}
        </div>
      )}
    </div>
  );
}
