'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  XCircle,
  RotateCcw,
  Camera,
  AlertCircle,
} from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { orderApi, type OrderDetail } from '@/lib/commerce-api';
import { formatTaka, mediaUrl } from '@/lib/media-url';
import {
  OrderStatusBadge,
  ReturnStatusBadge,
  paymentLabel,
} from '@/components/storefront/order-status';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function skuLabel(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        const row = v as { attribute?: string; value?: string };
        return row?.attribute && row?.value
          ? `${row.attribute}: ${row.value}`
          : String(row?.value ?? '');
      })
      .filter(Boolean)
      .join(' / ');
  }
  return '';
}

/** Order detail: items, totals, address, payment, timeline and actions. */
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const orderId = Number(id);

  const { t } = useLocale();
  const { api, status, user } = useUserAuth();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loadedId, setLoadedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The skeleton waits until this order id has actually been fetched.
  const loading = status === 'authed' && loadedId !== orderId;
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // cancel
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  // return
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnQty, setReturnQty] = useState<Record<number, number>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    if (status !== 'authed') return;
    orderApi
      .detail(api, orderId)
      .then(setOrder)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Order not found'),
      )
      .finally(() => setLoadedId(orderId));
  };

  useEffect(() => {
    if (status !== 'authed') return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, status, orderId]);

  const cancelOrder = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await orderApi.cancel(api, orderId, cancelReason.trim() || undefined);
      setOrder(updated);
      setShowCancel(false);
      setCancelReason('');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not cancel the order');
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('userAccessToken') ?? '';
      const res = await orderApi.uploadReturnPhoto(token, file);
      setPhotos((prev) => [...prev, res.path]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const submitReturn = async () => {
    const items = Object.entries(returnQty)
      .map(([itemId, quantity]) => ({ orderItemId: Number(itemId), quantity }))
      .filter((line) => line.quantity > 0);
    if (!items.length) {
      setActionError(t('Select at least one item to return'));
      return;
    }
    if (!returnReason.trim()) {
      setActionError(t('Tell us why you want to return this order'));
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await orderApi.requestReturn(api, orderId, {
        reason: returnReason.trim(),
        items,
        media: photos.length ? photos : undefined,
      });
      setShowReturn(false);
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not request the return');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-xl border border-border bg-white" />
        <div className="h-40 animate-pulse rounded-xl border border-border bg-white" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border border-border bg-white p-12 text-center">
        <p className="font-semibold text-foreground">{t('Order not found')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Link
          href="/user/orders"
          className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {t('Back to orders')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.push('/user/orders')}
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft size={15} /> {t('My orders')}
      </button>

      {/* header */}
      <div className="rounded-xl border border-border bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-extrabold text-foreground">
            {order.orderNumber}
          </h1>
          <OrderStatusBadge status={order.status} />
          {order.returns.map((r) => (
            <ReturnStatusBadge key={r.id} status={r.status} />
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('Placed')} {formatDate(order.createdAt)} ·{' '}
          {paymentLabel(order.paymentMethod, order.paymentStatus)}
        </p>

        {/* items */}
        <ul className="mt-4 divide-y divide-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <span className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(item.image)}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center">🧵</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                {item.slug ? (
                  <Link
                    href={`/product/${item.slug}`}
                    className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {skuLabel(item.skuData) && `${skuLabel(item.skuData)} · `}
                  {formatTaka(item.unitDiscountedPrice)} × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 text-sm font-bold text-foreground">
                {formatTaka(item.totalDiscountedPrice)}
              </span>
            </li>
          ))}
        </ul>

        {/* totals */}
        <div className="mt-2 space-y-1.5 border-t border-border pt-3 text-sm">
          <Row label={t('Subtotal')} value={formatTaka(order.subtotal)} />
          <Row
            label={t('Delivery')}
            value={
              order.deliveryCharge > 0 ? formatTaka(order.deliveryCharge) : t('Free')
            }
          />
          {order.discountAmount > 0 && (
            <Row
              label={
                order.couponCode
                  ? `${t('Coupon')} ${order.couponCode}`
                  : t('Discount')
              }
              value={`− ${formatTaka(order.discountAmount)}`}
              tone="badge-red"
            />
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-foreground">{t('Total')}</span>
            <span className="text-lg font-extrabold text-primary">
              {formatTaka(order.total)}
            </span>
          </div>
        </div>

        {/* address + payment */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <MapPin size={12} /> {t('Delivery address')}
            </p>
            <p className="mt-1.5 font-semibold text-foreground">
              {order.address?.recipientName ?? user?.name}
            </p>
            <p className="text-muted-foreground">
              {order.address?.phone}
              <br />
              {order.address?.address}
              {order.address?.zipCode ? `, ${order.address.zipCode}` : ''}
            </p>
          </div>
          <div className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <CreditCard size={12} /> {t('Payment')}
            </p>
            {order.payments.map((p, i) => (
              <p key={i} className="mt-1.5 text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {p.method === 'cod' ? t('Cash on delivery') : p.method.toUpperCase()}
                </span>
                {p.transactionId ? ` · ${p.transactionId}` : ''}
                <br />
                {p.status === 'paid'
                  ? `${t('Paid')} ${formatDate(p.paidAt)}`
                  : t('Awaiting verification')}
              </p>
            ))}
            {order.note && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t('Note')}: {order.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* timeline */}
      <div className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Package size={15} className="text-primary" /> {t('Status history')}
        </h2>
        <ol className="mt-3 space-y-3">
          {order.statusHistory.map((h, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
              <span>
                <span className="block text-sm font-semibold capitalize text-foreground">
                  {h.status}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {formatDate(h.at)}
                  {h.note ? ` · ${h.note}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* returns */}
      {order.returns.map((r) => (
        <div key={r.id} className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <RotateCcw size={15} className="text-primary" />
            {r.returnNumber} <ReturnStatusBadge status={r.status} />
          </h2>
          <p className="mt-2 text-sm text-foreground/90">{r.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {r.items.map((i) => `${i.quantity} item${i.quantity === 1 ? '' : 's'}`).join(' · ')}
            {` · ${t('Refund')} ${formatTaka(r.refundAmount)}`}
          </p>
          {r.media.length > 0 && (
            <div className="mt-2 flex gap-2">
              {r.media.map((m) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={m}
                  src={mediaUrl(m)}
                  alt={t('Return photo')}
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {actionError && (
        <p className="mt-4 flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle size={14} className="mt-px shrink-0" />
          {actionError}
        </p>
      )}

      {/* actions */}
      {(order.canCancel || order.canReturn) && !showCancel && !showReturn && (
        <div className="mt-4 flex flex-wrap gap-3">
          {order.canCancel && (
            <button
              onClick={() => setShowCancel(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-destructive/40 hover:text-destructive"
            >
              <XCircle size={15} /> {t('Cancel order')}
            </button>
          )}
          {order.canReturn && (
            <button
              onClick={() => setShowReturn(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
            >
              <RotateCcw size={15} /> {t('Request return')}
            </button>
          )}
        </div>
      )}

      {showCancel && (
        <div className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-foreground">
            {t('Cancel this order?')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('Only pending orders can be cancelled.')}
          </p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            placeholder={t('Reason (optional)')}
            className="mt-3 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={cancelOrder}
              disabled={busy}
              className="rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t('Yes, cancel it')}
            </button>
            <button
              onClick={() => setShowCancel(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
            >
              {t('Keep order')}
            </button>
          </div>
        </div>
      )}

      {showReturn && (
        <div className="mt-4 rounded-xl border border-border bg-white p-4 sm:p-5">
          <h2 className="text-sm font-bold text-foreground">{t('Request a return')}</h2>
          {order.returnWindowEnds && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('Return window closes')} {formatDate(order.returnWindowEnds)}
            </p>
          )}

          <ul className="mt-3 space-y-2">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <span className="min-w-0 text-sm">
                  <span className="block truncate font-medium text-foreground">
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {skuLabel(item.skuData) || formatTaka(item.unitDiscountedPrice)} ·
                    {` ordered ${item.quantity}`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() =>
                      setReturnQty((q) => ({
                        ...q,
                        [item.id]: Math.max(0, (q[item.id] ?? 0) - 1),
                      }))
                    }
                    className="h-7 w-7 rounded-full border border-border text-sm leading-none text-foreground"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-bold tabular-nums">
                    {returnQty[item.id] ?? 0}
                  </span>
                  <button
                    onClick={() =>
                      setReturnQty((q) => ({
                        ...q,
                        [item.id]: Math.min(item.quantity, (q[item.id] ?? 0) + 1),
                      }))
                    }
                    className="h-7 w-7 rounded-full border border-border text-sm leading-none text-foreground"
                  >
                    +
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <textarea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            rows={3}
            placeholder={t('Why are you returning this order?')}
            className="mt-3 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />

          <div className="mt-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground">
              <Camera size={15} />
              {uploading ? t('Uploading…') : t('Add photos')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.target.value = '';
                }}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 flex gap-2">
                {photos.map((p) => (
                  <span key={p} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(p)}
                      alt={t('Return photo')}
                      className="h-14 w-14 rounded-lg border border-border object-cover"
                    />
                    <button
                      onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))}
                      aria-label={t('Remove photo')}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={submitReturn}
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t('Sending…') : t('Submit request')}
            </button>
            <button
              onClick={() => setShowReturn(false)}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-foreground"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'badge-red';
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tone === 'badge-red'
            ? 'font-semibold text-badge-red-foreground'
            : 'text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}