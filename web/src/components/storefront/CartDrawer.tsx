'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';
import { mediaUrl, formatTaka } from '@/lib/media-url';
import { QtyStepper } from './QtyStepper';

/**
 * Slide-over mini cart shown from the header / bottom-nav cart button.
 * Totals come from the server once signed in (guests see their local cart),
 * and checkout hands over to /checkout.
 */
export function CartDrawer() {
  const {
    lines,
    drawerOpen,
    closeDrawer,
    setQty,
    remove,
    subtotal,
    savings,
    count,
    busy,
    error,
    clearError,
  } = useCart();
  const { t } = useLocale();
  const { status } = useUserAuth();
  const pathname = usePathname();
  const authed = status === 'authed';

  return (
    <>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm transform flex-col bg-card shadow-xl transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label={t('Shopping cart')}
      >
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <ShoppingBag size={18} className="text-primary" />
            {t('Your bag')}
            {count > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </h2>
          <button
            onClick={closeDrawer}
            aria-label={t('Close cart')}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle size={14} className="mt-px shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} aria-label="Dismiss">
                <X size={12} />
              </button>
            </div>
          )}

          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl">
                🛍️
              </div>
              <p className="font-medium text-foreground">
                {t('Your bag is empty')}
              </p>
              <p className="max-w-[240px] text-sm text-muted-foreground">
                {t('Browse the collection and add something you love.')}
              </p>
              <Link
                href="/shop"
                onClick={closeDrawer}
                className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t('Start shopping')}
              </Link>
            </div>
          ) : (
            <ul className={`space-y-4 ${busy ? 'opacity-60' : ''}`}>
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="flex gap-3 rounded-lg border border-border p-2"
                >
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={closeDrawer}
                    className="block h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(line.image)}
                        alt={line.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-primary/20">
                        {line.name.charAt(0)}
                      </div>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/product/${line.slug}`}
                        onClick={closeDrawer}
                        className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                      >
                        {line.name}
                      </Link>
                      <button
                        onClick={() => remove(line.key)}
                        aria-label={t('Remove item')}
                        className="shrink-0 rounded p-1 text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {line.skuLabel && (
                      <span className="text-xs text-muted-foreground">
                        {line.skuLabel}
                      </span>
                    )}
                    {line.maxQuantity === 0 && (
                      <span className="mt-0.5 text-xs font-semibold text-destructive">
                        {t('Out of stock')}
                      </span>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QtyStepper
                        value={line.qty}
                        max={Math.max(1, line.maxQuantity || 99)}
                        onChange={(q) => setQty(line.key, q)}
                      />
                      <span className="text-right">
                        {savings > 0 && line.listPrice > line.unitPrice && (
                          <span className="mr-1.5 text-xs text-muted-foreground line-through">
                            {formatTaka(line.listPrice * line.qty)}
                          </span>
                        )}
                        <span className="text-sm font-bold text-primary">
                          {formatTaka(line.unitPrice * line.qty)}
                        </span>
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <footer className="border-t border-border px-4 py-4">
            {savings > 0 && (
              <div className="mb-1.5 flex items-center justify-between text-xs text-badge-red-foreground">
                <span>{t('You save')}</span>
                <span className="font-bold">{formatTaka(savings)}</span>
              </div>
            )}
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('Subtotal')} ({count} {t('items')})
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatTaka(subtotal)}
              </span>
            </div>
            {pathname !== '/checkout' && (
              <Link
                href={authed ? '/checkout' : '/user/login?next=/checkout'}
                onClick={closeDrawer}
                className="block w-full rounded-full bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {authed ? t('Proceed to checkout') : t('Sign in to checkout')}
              </Link>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t('Shipping calculated at checkout.')}
            </p>
          </footer>
        )}
      </aside>
    </>
  );
}