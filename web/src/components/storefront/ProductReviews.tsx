'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, PencilLine } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { storefront, type ProductReview, type ReviewSummary } from '@/lib/storefront';
import { customerApi, type CustomerApiClient } from '@/lib/customer-api';
import { mediaUrl } from '@/lib/media-url';

const EMPTY_SUMMARY: ReviewSummary = {
  count: 0,
  average: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/25'}
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

/** Percentage bar width for one star bucket (0–100). */
function barWidth(distribution: ReviewSummary['distribution'], bucket: number): string {
  const total = distribution[1] + distribution[2] + distribution[3] + distribution[4] + distribution[5];
  if (!total) return '0%';
  return `${Math.round((distribution[bucket] / total) * 100)}%`;
}

/**
 * Product review section: rating summary + approved review feed + an
 * inline submission form. Submissions sit in moderation (pending) and appear
 * here once an admin approves them — the form says so instead of faking it.
 */
export function ProductReviews({ productId }: { productId: number }) {
  const { t } = useLocale();
  const { status, api } = useUserAuth();
  const [summary, setSummary] = useState<ReviewSummary>(EMPTY_SUMMARY);
  const [items, setItems] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      if (!append) setLoading(true);
      const res = await storefront.productReviews(productId, nextPage, 6);
      setSummary(res.summary);
      setItems((prev) => (append ? [...prev, ...res.data] : res.data));
      setPage(res.pagination.page);
      setHasNext(res.pagination.hasNext);
      setLoading(false);
      setLoadingMore(false);
    },
    [productId],
  );

  useEffect(() => {
    let alive = true;
    storefront
      .productReviews(productId, 0, 6)
      .then((res) => {
        if (!alive) return;
        setSummary(res.summary);
        setItems(res.data);
        setPage(res.pagination.page);
        setHasNext(res.pagination.hasNext);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [productId]);

  const loadMore = () => {
    setLoadingMore(true);
    void load(page + 1, true).catch(() => setLoadingMore(false));
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* summary */}
      <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 text-center lg:items-start lg:text-left">
        <h2 className="text-lg font-extrabold text-foreground">{t('Customer reviews')}</h2>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-5xl font-black text-foreground">{summary.average.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">/ 5</span>
        </div>
        <div className="mt-2">
          <Stars value={Math.round(summary.average)} size={18} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {summary.count === 0 ? 'No reviews yet' : `${summary.count} review${summary.count === 1 ? '' : 's'}`}
        </p>

        <div className="mt-5 w-full space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-6 shrink-0 text-right tabular-nums">{n}</span>
              <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{ width: barWidth(summary.distribution, n) }}
                />
              </div>
              <span className="w-6 shrink-0 tabular-nums">{summary.distribution[n]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* list + form */}
      <div className="min-w-0">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-4">
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-6 py-12 text-center">
            <Star size={26} className="text-muted-foreground/40" />
            <p className="font-semibold text-foreground">{t('Be the first to review')}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tell others about the fit, fabric and quality of this piece.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                    {(r.user.name ?? 'C').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{r.user.name}</span>
                  {r.verified && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      <ShieldCheck size={11} /> {t('Verified')}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                  </span>
                </div>
                {r.comment && (
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/90">{r.comment}</p>
                )}
                {r.images && r.images.length > 0 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                    {r.images.map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={mediaUrl(img)}
                        alt="Review photo"
                        className="h-16 w-16 shrink-0 rounded-lg border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {hasNext && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-4 w-full rounded-full border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {loadingMore ? t('Loading…') : t('Show more reviews')}
          </button>
        )}

        <ReviewForm productId={productId} authed={status === 'authed'} api={api} onSubmit={() => void load(0, false)} />
      </div>
    </section>
  );
}

function ReviewForm({
  productId,
  authed,
  api,
  onSubmit,
}: {
  productId: number;
  authed: boolean;
  api: CustomerApiClient;
  onSubmit: () => void;
}) {
  const { t } = useLocale();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<'idle' | 'done' | 'error' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (state === 'done') {
    return (
      <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        <p className="font-semibold">Thanks for your review! 🌟</p>
        <p className="mt-1">
          It’s now pending approval — once an admin approves it, it will show up
          on this page. You can track its status under <b>My Reviews</b> in your account.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await customerApi.submitReview(api, { productId, rating, comment });
      setState('done');
      onSubmit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not submit your review';
      setState(msg.includes('already') ? 'duplicate' : 'error');
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-5">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <PencilLine size={15} className="text-primary" />
        {t('Write a review')}
      </h3>

      {!authed ? (
        <p className="mt-2 text-sm text-muted-foreground">
          <Link href="/user/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{' '}
          to share your experience with this product.
        </p>
      ) : state === 'duplicate' ? (
        <p className="mt-2 text-sm text-destructive">
          You’ve already reviewed this product. You can manage your reviews under
          {' '}
          <Link href="/user/reviews" className="font-semibold underline">
            My Reviews
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                className="transition-transform active:scale-90"
              >
                <Star
                  size={26}
                  className={
                    n <= (hover || rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/30'
                  }
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="How is the fit, fabric and quality?"
            className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
          />
          {state === 'error' && <p className="text-xs text-destructive">{errorMsg}</p>}
          <button
            type="submit"
            disabled={!rating || submitting}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? t('Submitting…') : t('Submit review')}
          </button>
        </form>
      )}
    </div>
  );
}