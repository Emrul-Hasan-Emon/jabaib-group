'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAdminAuth } from '@/lib/admin-auth';

interface CustomerDetail {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  orderCount: number;
  wishlistCount: number;
  reviewCount: number;
  totalSpent: number;
  createdAt: string;
  addresses: Array<{ id: number; label: string | null; phone: string | null; division?: { name: string } | null; district?: { name: string } | null; city: string | null; addressLine: string | null }>;
  authProviders: Array<{ provider: string }>;
  orders: Array<{ id: number; orderNumber: string; status: string; paymentStatus: string; paidAmount: number; total: number; createdAt: string }>;
  wishlist: Array<{ id: number; product: { id: number; name: string; slug: string; thumbnailUrl: string | null } | null }>;
}

export default function CustomerDetailPage() {
  const { api } = useAdminAuth();
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<CustomerDetail>(`/v1/admin/customer/${id}`).then(setCustomer).catch((e) => setError(e.message));
  }, [api, id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!customer) return <p className="text-sm text-muted-foreground">Loading customer…</p>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{customer.name}</h1>
        <Link href="/admin/customers" className="text-sm text-muted-foreground">← Back to customers</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Orders" value={customer.orderCount} />
        <Stat label="Wishlist" value={customer.wishlistCount} />
        <Stat label="Reviews" value={customer.reviewCount} />
        <Stat label="Total spent (paid)" value={`৳ ${customer.totalSpent.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Profile</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Phone" value={customer.phone ?? '—'} />
            <Row label="Email" value={customer.email ?? '—'} />
            <Row label="Email verified" value={customer.emailVerified ? 'Yes' : 'No'} />
            <Row label="Phone verified" value={customer.phoneVerified ? 'Yes' : 'No'} />
            <Row label="Active" value={customer.isActive ? 'Yes' : 'No'} />
            <Row label="Joined" value={customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'} />
            <Row label="Providers" value={customer.authProviders.map((p) => p.provider).join(', ') || 'Email/password'} />
          </dl>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Addresses ({customer.addresses.length})</h2>
          {customer.addresses.length === 0 && <p className="text-sm text-muted-foreground">No saved addresses.</p>}
          <ul className="space-y-2 text-sm">
            {customer.addresses.map((a) => (
              <li key={a.id} className="rounded-md bg-muted px-3 py-2">
                <div className="font-medium">{a.label || 'Address'}{a.phone ? ` — ${a.phone}` : ''}</div>
                <div className="text-muted-foreground">{[a.addressLine, a.city, a.district?.name, a.division?.name].filter(Boolean).join(', ')}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Wishlist ({customer.wishlist.length})</h2>
          {customer.wishlist.length === 0 && <p className="text-sm text-muted-foreground">Wishlist is empty.</p>}
          <ul className="space-y-2 text-sm">
            {customer.wishlist.map((w) => (
              <li key={w.id}>
                {w.product ? (
                  <Link href={`/admin/products/${w.product.id}`} className="text-primary">
                    {w.product.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Removed product</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 font-semibold">Recent orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Paid (BDT)</th>
                <th className="px-3 py-2">Total (BDT)</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary">{o.orderNumber}</Link>
                  </td>
                  <td className="px-3 py-2 capitalize">{o.status.replace('_', ' ')}</td>
                  <td className="px-3 py-2 capitalize">{o.paymentStatus}</td>
                  <td className="px-3 py-2">{Number(o.paidAmount ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{Number(o.total ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {customer.orders.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value ?? '—'}</dd>
    </div>
  );
}