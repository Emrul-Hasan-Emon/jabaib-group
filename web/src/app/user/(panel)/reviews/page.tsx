'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Trash2, MessageSquare } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { customerApi, type MyReviewItem } from '@/lib/customer-api';
import { mediaUrl } from '@/lib/media-url';

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}
        />
      ))}
    </span>
  );
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * "My Reviews": every review the customer wrote, with moderation status and a
 * delete action. Approved reviews are public on the product page; pending ones
 * stay hidden there until an admin approves them.
 */
export default function MyReviewsPage() {
  const { t } = useLocale();
  const { status, api } = useUserAuth();
  const [items, setItems] = useState<MyReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    customerApi
      .myReviews(api)
      .then((res) => {
        setItems(res.data);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not load your reviews');
        setLoading(false);
      });

  useEffect(() => {
    if (status === 'authed') void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, api]);

  const remove = async (id: number) => {
    setBusyId(id);
    try {
      await customerApi.deleteReview(api, id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  };

  const pending = items.filter((r) => !r.isApproved).length;
  const effectiveLoading = status === 'authed' ? loading : false;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-foreground">My Reviews</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {items.length > 0
            ? `${items.length} review${items.length === 1 ? '' : 's'} · ${pending} pending approval`
            : 'Reviews you write appear here once a product arrives.'}
        </p>
      </div>

      {effectiveLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-white p-4">
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="mt-2 h-3 w-full rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
          {error}
          <button
            onClick={() => { setLoading(true); void refresh(); }}
            className="mt-3 block w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquare size={24} />
          </span>
          <p className="font-semibold text-foreground">No reviews yet</p>
          <p className="text-sm text-muted-foreground">
            Visit a product page and share what you think about it.
          </p>
          <Link href="/shop" className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            {t('Browse products')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => {
            const image = mediaUrl(r.product.thumbnailUrl);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-white p-4">
                <div className="flex items-start gap-3">
                  <Link
                    href={r.product.slug ? `/product/${r.product.slug}` : '/shop'}
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={r.product.name ?? ''} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">🧵</span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={r.product.slug ? `/product/${r.product.slug}` : '/shop'}
                        className="truncate text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {t(r.product.name, r.product.nameBN)}
                      </Link>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          r.isApproved
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                      <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                    </div>
                    {r.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
                    )}
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      {r.isApproved
                        ? 'This review is public on the product page.'
                        : 'Pending moderation — it appears on the product page once approved.'}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    disabled={busyId === r.id}
                    title="Delete review"
                    aria-label="Delete review"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}