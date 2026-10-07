'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ChevronRight } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { orderApi, type OrderSummary } from '@/lib/commerce-api';
import { formatTaka, mediaUrl } from '@/lib/media-url';
import {
  OrderStatusBadge,
  ReturnStatusBadge,
  paymentLabel,
} from '@/components/storefront/order-status';

function formatDate(iso: string) {
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

/** My orders: newest first, with live status, totals and a return badge. */
export default function UserOrdersPage() {
  const { t } = useLocale();
  const { api, status } = useUserAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Guests never have orders to load, so the skeleton only waits on authed users.
  const loading = status === 'authed' && !loaded;

  useEffect(() => {
    if (status !== 'authed') return;
    orderApi
      .list(api, 0, 20)
      .then((res) => {
        setOrders(res.data);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load your orders'),
      )
      .finally(() => setLoaded(true));
  }, [api, status]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="mt-3 h-3 w-1/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
        {error}
        <button
          onClick={() => {
            setLoaded(false);
            orderApi
              .list(api, 0, 20)
              .then((res) => setOrders(res.data))
              .catch(() => undefined)
              .finally(() => setLoaded(true));
          }}
          className="mt-3 block w-full rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-foreground">My Orders</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {orders.length === 0
            ? 'Your placed orders will appear here with live status.'
            : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Package size={24} className="text-muted-foreground" />
          </span>
          <p className="font-semibold text-foreground">No orders yet</p>
          <p className="text-sm text-muted-foreground">
            {t('Once you place an order it will show up here with live tracking.')}
          </p>
          <Link
            href="/shop"
            className="mt-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            {t('Start shopping')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/user/orders/${order.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition hover:border-primary/40"
              >
                <span className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {order.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl(order.thumbnailUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-lg">
                      🧵
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status} />
                    {order.returnStatus && (
                      <ReturnStatusBadge status={order.returnStatus} />
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} · {order.itemCount}{' '}
                    {t('items')} · {paymentLabel(order.paymentMethod, order.paymentStatus)}
                  </span>
                  <span className="mt-1 block text-sm font-extrabold text-primary">
                    {formatTaka(order.total)}
                    {order.discountAmount > 0 && (
                      <span className="ml-2 text-xs font-semibold text-badge-red-foreground">
                        {t('saved')} {formatTaka(order.discountAmount)}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}