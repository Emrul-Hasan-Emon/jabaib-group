'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, X, ShoppingBag } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { useCart } from '@/lib/cart';
import { customerApi, type WishlistItem } from '@/lib/customer-api';
import { mediaUrl, formatTaka } from '@/lib/media-url';
import { notifyWishlistChanged } from '@/lib/wishlist';

/**
 * Account wishlist: product summaries with remove + "move to cart". Moving to
 * cart reuses the existing cart.add() (cart lives in localStorage until
 * checkout — the drawer opens right away), then clears the wishlist row so
 * nothing duplicates later.
 */
export default function WishlistPage() {
  const { t } = useLocale();
  const { status, api } = useUserAuth();
  const { add } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    customerApi
      .wishlist(api)
      .then((rows) => {
        setItems(rows);
        setError(null);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not load your wishlist');
        setLoading(false);
      });

  useEffect(() => {
    if (status === 'authed') void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, api]);

  const remove = async (row: WishlistItem) => {
    setBusyId(row.id);
    try {
      await customerApi.wishlistRemove(api, row.product.id);
      setItems((prev) => prev.filter((r) => r.id !== row.id));
      notifyWishlistChanged();
    } finally {
      setBusyId(null);
    }
  };

  const moveToCart = async (row: WishlistItem) => {
    setBusyId(row.id);
    try {
      const p = row.product;
      add({
        productId: p.id,
        name: t(p.name, p.nameBN),
        slug: p.slug,
        image: p.thumbnailUrl,
        skuId: null,
        skuLabel: '',
        unitPrice: p.priceFrom,
      });
      await customerApi.wishlistRemove(api, p.id);
      setItems((prev) => prev.filter((r) => r.id !== row.id));
      notifyWishlistChanged();
    } finally {
      setBusyId(null);
    }
  };

  const effectiveLoading = status === 'authed' ? loading : false;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-foreground">My Wishlist</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {items.length > 0 ? `${items.length} ${t('saved item', 'সংরক্ষিত আইটেম')}` : 'Save products to shop them later.'}
        </p>
      </div>

      {effectiveLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-white p-3">
              <div className="aspect-square w-full rounded-lg bg-muted" />
              <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
              <div className="mt-1.5 h-3 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
          {error}
          <button onClick={() => { setLoading(true); refresh(); }} className="mt-3 block w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Heart size={24} />
          </span>
          <p className="font-semibold text-foreground">Your wishlist is empty</p>
          <p className="text-sm text-muted-foreground">
            Tap the heart on any product to save it here.
          </p>
          <Link href="/shop" className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
            {t('Browse products', 'প্রোডাক্ট দেখুন')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((row) => {
            const image = mediaUrl(row.product.thumbnailUrl);
            return (
              <div key={row.id} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white">
                <Link href={`/product/${row.product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={row.product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-3xl">🧵</span>
                  )}
                  <button
                    onClick={() => remove(row)}
                    disabled={busyId === row.id}
                    title="Remove"
                    aria-label="Remove from wishlist"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white/95 text-muted-foreground shadow-sm transition hover:text-red-600 disabled:opacity-60"
                  >
                    <X size={14} />
                  </button>
                </Link>
                <div className="flex flex-1 flex-col p-3">
                  <Link href={`/product/${row.product.slug}`} className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground hover:text-primary">
                    {t(row.product.name, row.product.nameBN)}
                  </Link>
                  <p className="mt-1 text-sm font-extrabold text-primary">{formatTaka(row.product.priceFrom)}</p>
                  <button
                    onClick={() => moveToCart(row)}
                    disabled={busyId === row.id}
                    className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
                  >
                    <ShoppingBag size={13} />
                    {t('Move to cart', 'ব্যাগে যোগ করুন')}
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