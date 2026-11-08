'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';
import { adminCustomerApi, adminOrderDraft, type AdminCustomerSearchRow } from '@/lib/admin-order-api';

export default function CreateOrderFindCustomerPage() {
  const { api } = useAdminAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<AdminCustomerSearchRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const value = q.trim();
    if (!value) return;
    setSearching(true);
    setError(null);
    try {
      const res = await adminCustomerApi.search(api, value);
      setResults(res.data);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const selectCustomer = (c: AdminCustomerSearchRow) => {
    adminOrderDraft.clear();
    adminOrderDraft.setCustomer({ id: c.id, name: c.name, phone: c.phone, email: c.email });
    router.push('/admin/orders/new/products');
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create order</h1>
        <Link href="/admin/orders" className="text-sm text-muted-foreground">← Back to orders</Link>
      </div>

      <div className="max-w-xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 font-semibold">Find the customer</h2>
        <p className="mb-3 text-sm text-muted-foreground">Search by email or phone number.</p>
        <div className="flex gap-2">
          <input
            placeholder="Email or phone…"
            className="flex-1 rounded-md border border-input px-3 py-2 text-sm"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button
            onClick={search}
            disabled={searching || !q.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {searched && results.length === 0 && !error && (
          <p className="mt-4 text-sm text-muted-foreground">No customer found for &ldquo;{q}&rdquo;.</p>
        )}

        {results.length > 0 && (
          <ul className="mt-4 space-y-2">
            {results.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="text-sm">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
                  <div className="text-xs text-muted-foreground">{c.orderCount} orders</div>
                </div>
                <button
                  onClick={() => selectCustomer(c)}
                  className="rounded-md border border-primary px-3 py-1.5 text-sm font-semibold text-primary"
                >
                  Continue
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
