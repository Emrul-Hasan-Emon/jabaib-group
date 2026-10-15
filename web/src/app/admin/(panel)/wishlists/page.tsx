'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface WishlistEntry {
  id: number;
  createdAt: string;
  user?: { name: string; phone: string | null } | null;
  product?: { name: string; slug: string } | null;
}

export default function WishlistsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<WishlistEntry[]>([]);
  const [detailsTarget, setDetailsTarget] = useState<WishlistEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ data: WishlistEntry[] }>('/v1/admin/wishlist?page=0&size=100');
    setRows(res.data);
  }, [api]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Wishlists</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Added</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{w.user?.name ?? '—'}</td>
                <td className="px-4 py-2">{w.product?.name ?? '—'}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(w)} className="text-muted-foreground">Details</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No wishlist entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <DetailsModal
        open={detailsTarget !== null}
        title={`Wishlist #${detailsTarget?.id}`}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Customer', value: detailsTarget.user?.name },
          { label: 'Phone', value: detailsTarget.user?.phone },
          { label: 'Product', value: detailsTarget.product?.name },
          { label: 'Added', value: new Date(detailsTarget.createdAt).toLocaleString() },
        ] : []}
      />
    </div>
  );
}
