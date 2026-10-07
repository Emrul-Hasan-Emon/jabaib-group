'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  images: string[] | null;
  createdAt: string;
  user?: { name: string; phone: string | null } | null;
  product?: { name: string } | null;
}

export default function ReviewsPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Review[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ data: Review[] }>('/v1/admin/review?page=0&size=100');
    setRows(res.data);
  }, [api]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const toggleApprove = async (r: Review) => {
    await api.patch(`/v1/admin/review/${r.id}`, { isApproved: !r.isApproved });
    await load();
  };

  const remove = async () => {
    if (!deleteTarget) return;
    await api.del(`/v1/admin/review/${deleteTarget.id}`);
    setDeleteTarget(null);
    await load();
  };

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Reviews</h1>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Reviewer</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Comment</th>
              <th className="px-4 py-2">Approved</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{r.product?.name ?? '—'}</td>
                <td className="px-4 py-2">{r.user?.name ?? '—'}</td>
                <td className="px-4 py-2">{'★'.repeat(r.rating)}{'☆'.repeat(Math.max(0, 5 - r.rating))}</td>
                <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">{r.comment ?? '—'}</td>
                <td className="px-4 py-2">{r.isApproved ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(r)} className="mr-3 text-muted-foreground">Details</button>
                  <button onClick={() => toggleApprove(r)} className="mr-3 text-primary">{r.isApproved ? 'Hide' : 'Approve'}</button>
                  <button onClick={() => setDeleteTarget(r)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No reviews yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={`Review #${detailsTarget?.id}`}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Product', value: detailsTarget.product?.name },
          { label: 'Reviewer', value: detailsTarget.user?.name },
          { label: 'Rating', value: '★'.repeat(detailsTarget.rating) },
          { label: 'Comment', value: detailsTarget.comment },
          { label: 'Approved', value: detailsTarget.isApproved ? 'Yes' : 'No' },
          { label: 'Images', value: detailsTarget.images?.join(', ') },
          { label: 'Date', value: new Date(detailsTarget.createdAt).toLocaleString() },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete review"
        message="Delete this review permanently?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
