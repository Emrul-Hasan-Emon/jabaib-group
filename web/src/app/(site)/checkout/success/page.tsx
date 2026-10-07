'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Package, Truck } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { orderApi, type OrderDetail } from '@/lib/commerce-api';
import { formatTaka } from '@/lib/media-url';

/** Post-checkout confirmation: order number, totals and where to go next. */
export default function CheckoutSuccessPage() {
  const { t } = useLocale();
  const { api, status } = useUserAuth();
  const params = useSearchParams();
  const orderId = Number(params.get('order') ?? 0);
  const [order, setOrder] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (status !== 'authed' || !orderId) return;
    orderApi
      .detail(api, orderId)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [api, status, orderId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 size={52} className="text-emerald-600" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">
          {t('Order placed!')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('Thank you — we will call you to confirm delivery.')}
        </p>
        {order && (
          <p className="mt-3 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            {order.orderNumber}
          </p>
        )}
      </div>

      {order && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-2 text-sm">
            <SummaryRow label={t('Items')} value={String(order.items.reduce((n, i) => n + i.quantity, 0))} />
            <SummaryRow label={t('Subtotal')} value={formatTaka(order.subtotal)} />
            <SummaryRow
              label={t('Delivery')}
              value={
                order.deliveryCharge > 0
                  ? formatTaka(order.deliveryCharge)
                  : t('Free')
              }
            />
            {order.discountAmount > 0 && (
              <SummaryRow
                label={t('Discount')}
                value={`− ${formatTaka(order.discountAmount)}`}
              />
            )}
            <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold text-foreground">{t('Total')}</span>
              <span className="text-lg font-extrabold text-primary">
                {formatTaka(order.total)}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
            <p className="flex items-start gap-2">
              <Truck size={15} className="mt-0.5 shrink-0 text-primary" />
              <span>
                <span className="font-semibold text-foreground">
                  {order.address?.recipientName}
                </span>
                <span className="block text-muted-foreground">
                  {order.address?.phone} · {order.address?.address}
                </span>
              </span>
            </p>
            <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Package size={13} />
              {order.paymentMethod === 'cod'
                ? t('Cash on delivery')
                : `${t('Paid via')} ${order.paymentMethod.toUpperCase()} · ${order.paymentStatus}`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/user/orders"
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {t('View my orders')}
        </Link>
        <Link
          href="/shop"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground"
        >
          {t('Continue shopping')}
        </Link>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}