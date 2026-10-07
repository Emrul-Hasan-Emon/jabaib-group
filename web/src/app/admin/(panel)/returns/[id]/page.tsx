'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

const NEXT: Record<string, string[]> = {
  requested: ['approved', 'rejected'],
  approved: ['picked_up'],
  picked_up: ['refunded', 'completed'],
  refunded: ['completed'],
  rejected: [],
  completed: [],
};

export default function ReturnDetailPage() {
  const { api } = useAdminAuth();
  const params = useParams();
  const id = Number(params.id);
  const [ret, setRet] = useState<any>(null);
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundMethod, setRefundMethod] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<any>(`/v1/admin/order-return/${id}`);
    setRet(res);
  }, [api, id]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  if (!ret) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const transition = async (status: string) => {
    try {
      await api.patch(`/v1/admin/order-return/${id}/status`, {
        status,
        note: note || undefined,
        refundAmount: refundAmount ? Number(refundAmount) : undefined,
        refundMethod: refundMethod || undefined,
      });
      setNote('');
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Return {ret.returnNumber}</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <p className="text-sm"><b>Order:</b> {ret.order?.orderNumber} · <b>Customer:</b> {ret.user?.name}</p>
        <p className="mt-1 text-sm"><b>Status:</b> {ret.status} · <b>Refund:</b> ৳{ret.refundAmount} {ret.refundMethod ? `(${ret.refundMethod})` : ''}</p>
        <p className="mt-1 text-sm"><b>Reason:</b> {ret.reason}</p>
        {ret.media?.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Media: {ret.media.join(', ')}</p>}
      </div>
      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 font-semibold">Items</h2>
        <ul className="text-sm">
          {ret.items?.map((it: any) => (
            <li key={it.id} className="border-t border-border py-2">Qty {it.quantity} — {it.reason ?? ''}</li>
          ))}
        </ul>
      </div>
      <div className="mb-4 rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Advance status</h2>
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input placeholder="Note (optional)" className="rounded-md border border-input px-3 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          <input placeholder="Refund amount" type="number" className="rounded-md border border-input px-3 py-2 text-sm" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
          <input placeholder="Refund method" className="rounded-md border border-input px-3 py-2 text-sm" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {(NEXT[ret.status] ?? []).map((s) => (
            <button key={s} onClick={() => transition(s)} className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground capitalize">Mark {s.replace('_', ' ')}</button>
          ))}
          {(NEXT[ret.status] ?? []).length === 0 && <p className="text-sm text-muted-foreground">No further transitions.</p>}
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2 font-semibold">Status history</h2>
        <ol className="relative border-l border-border pl-4 text-sm">
          {ret.statusHistory?.map((h: any) => (
            <li key={h.id} className="mb-2">
              <span className="font-medium capitalize">{h.status.replace('_', ' ')}</span>
              {h.note && <span className="text-muted-foreground"> — {h.note}</span>}
              <div className="text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
