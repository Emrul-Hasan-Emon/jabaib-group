'use client';

/** Compact status pill shared by the orders list and detail pages. */
const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmed', className: 'bg-sky-100 text-sky-800' },
  processing: { label: 'Processing', className: 'bg-sky-100 text-sky-800' },
  shipped: { label: 'Shipped', className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
  returned: { label: 'Returned', className: 'bg-orange-100 text-orange-800' },
};

const RETURN_STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: 'Return requested', className: 'bg-amber-100 text-amber-800' },
  approved: { label: 'Return approved', className: 'bg-sky-100 text-sky-800' },
  rejected: { label: 'Return rejected', className: 'bg-muted text-muted-foreground' },
  picked_up: { label: 'Picked up', className: 'bg-indigo-100 text-indigo-800' },
  refunded: { label: 'Refunded', className: 'bg-emerald-100 text-emerald-800' },
  completed: { label: 'Return completed', className: 'bg-emerald-100 text-emerald-800' },
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'Awaiting payment',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
};

export function OrderStatusBadge({ status }: { status: string }) {
  const meta = ORDER_STATUS[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function ReturnStatusBadge({ status }: { status: string }) {
  const meta = RETURN_STATUS[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function paymentLabel(method: string, status: string): string {
  const methodLabel =
    method === 'cod'
      ? 'Cash on delivery'
      : method.toUpperCase();
  return `${methodLabel} · ${PAYMENT_STATUS[status] ?? status}`;
}