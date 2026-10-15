'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Customer {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  orderCount: number;
  wishlistCount: number;
  createdAt: string;
}

export default function CustomersPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [detailsTarget, setDetailsTarget] = useState<Customer | null>(null);
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (isActive) params.set('isActive', isActive);
    const res = await api.get<{ data: Customer[] }>(`/v1/admin/customer?${params}`);
    setRows(res.data);
  }, [api, q, isActive]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search name, phone or email…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Orders</th>
              <th className="px-4 py-2">Wishlist</th>
              <th className="px-4 py-2">Verified</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-4 py-2">{c.phone ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{c.email ?? '—'}</td>
                <td className="px-4 py-2">{c.orderCount}</td>
                <td className="px-4 py-2">{c.wishlistCount}</td>
                <td className="px-4 py-2">{c.emailVerified || c.phoneVerified ? `${c.emailVerified ? 'E' : ''}${c.phoneVerified ? 'P' : ''}` : 'No'}</td>
                <td className="px-4 py-2">{c.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(c)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/customers/${c.id}`} className="text-primary">View</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.name ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Phone', value: detailsTarget.phone },
          { label: 'Email', value: detailsTarget.email },
          { label: 'Orders', value: detailsTarget.orderCount },
          { label: 'Wishlist items', value: detailsTarget.wishlistCount },
          { label: 'Email verified', value: detailsTarget.emailVerified ? 'Yes' : 'No' },
          { label: 'Phone verified', value: detailsTarget.phoneVerified ? 'Yes' : 'No' },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
          { label: 'Joined', value: detailsTarget.createdAt ? new Date(detailsTarget.createdAt).toLocaleDateString() : '—' },
        ] : []}
      />
    </div>
  );
}