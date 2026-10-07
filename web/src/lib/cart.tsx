'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useUserAuth } from './user-auth';
import type { CustomerApiClient } from './customer-api';
import {
  cartApi,
  emptyCart,
  type CartItem,
  type CartResponse,
} from './commerce-api';

export interface CartLine {
  /** Server cart-item id (null while the cart only lives in the browser). */
  id: number | null;
  /** `${productId}:${skuId ?? 'none'}` — stable across guests and accounts. */
  key: string;
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  skuId: number | null;
  skuLabel: string;
  /** What the customer pays per unit (sale price when one is active). */
  unitPrice: number;
  /** Price before any discount. */
  listPrice: number;
  qty: number;
  /** Remaining stock; 0 means it cannot be bought right now. */
  maxQuantity: number;
}

/** What callers pass to add a line — server-authoritative fields win when authed. */
export interface CartAddInput {
  productId: number;
  name?: string;
  slug?: string;
  image?: string | null;
  skuId?: number | null;
  skuLabel?: string;
  unitPrice?: number;
  qty?: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  /** Payable subtotal (after sale prices). */
  subtotal: number;
  /** Subtotal before discounts — what the strikethrough totals are based on. */
  listTotal: number;
  savings: number;
  /** True while a cart mutation is in flight. */
  busy: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (line: CartAddInput) => Promise<void>;
  setQty: (key: string, qty: number) => Promise<void>;
  remove: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  /** Server error from the last mutation (e.g. out of stock). */
  error: string | null;
  clearError: () => void;
}

const STORAGE_KEY = 'jabaibCart';
const Ctx = createContext<CartContextValue | null>(null);

function keyOf(productId: number, skuId: number | null): string {
  return `${productId}:${skuId ?? 'none'}`;
}

function loadGuest(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function persistGuest(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* storage may be unavailable in private mode */
  }
}

/**
 * Hand the browser-only guest lines to the API on login. The server prices and
 * stock-checks every line, so failures are ignored here: the merge step has
 * already run and the account cart is authoritative either way.
 */
async function uploadGuestLines(
  api: CustomerApiClient,
  lines: CartLine[],
): Promise<void> {
  for (const line of lines) {
    try {
      await cartApi.add(api, {
        productId: line.productId,
        productSKUId: line.skuId ?? undefined,
        quantity: line.qty,
      });
    } catch {
      // A line the server rejects (unpublished, out of stock) is dropped on
      // purpose — checkout would have refused it anyway.
    }
  }
}

/** Map the server cart response onto the shape the UI renders. */
function fromServer(cart: CartResponse): CartLine[] {
  return cart.items.map((item: CartItem) => ({
    id: item.id,
    key: keyOf(item.productId, item.productSKUId),
    productId: item.productId,
    name: item.name,
    slug: item.slug,
    image: item.image,
    skuId: item.productSKUId,
    skuLabel: item.skuLabel,
    unitPrice: item.unitDiscountedPrice,
    listPrice: item.unitPrice,
    qty: item.quantity,
    maxQuantity: item.maxQuantity,
  }));
}

/**
 * Cart state for the storefront.
 *
 * Guests keep their cart in localStorage, identified by a stable session id
 * that the API uses to store the same cart server-side. As soon as the visitor
 * signs in, the guest cart is merged into their account cart and every later
 * mutation goes through the API so prices and stock are always server-side.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status, api } = useUserAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards the localStorage write: the guest snapshot must not be overwritten
  // with an empty cart before it has been read back.
  const [hydrated, setHydrated] = useState(false);
  const authed = status === 'authed';

  // Guests: local cart. Signed-in: hand the browser's guest lines to the API
  // (merging any server-side guest cart first), so nothing is lost at login.
  useEffect(() => {
    let alive = true;
    if (status !== 'authed') {
      // Reading storage is a sync side effect of the provider booting.
      queueMicrotask(() => {
        if (!alive || status !== 'guest') return;
        setLines(loadGuest());
        setHydrated(true);
      });
      return () => {
        alive = false;
      };
    }

    const guestLines = loadGuest();
    cartApi
      .merge(api)
      .catch(() => emptyCart)
      .then(() => (guestLines.length ? uploadGuestLines(api, guestLines) : undefined))
      .then(() => cartApi.get(api))
      .then((cart) => {
        if (!alive) return;
        setLines(fromServer(cart));
        // the browser snapshot has been handed over
        persistGuest([]);
        setHydrated(true);
      })
      .catch(() => {
        // A failed hand-over must not hide the account cart.
        cartApi
          .get(api)
          .then((cart) => alive && setLines(fromServer(cart)))
          .catch(() => undefined);
      });
    return () => {
      alive = false;
    };
  }, [status, api]);

  // Keep the guest snapshot fresh while signed out (only after it was read).
  useEffect(() => {
    if (status === 'guest' && hydrated) persistGuest(lines);
  }, [lines, status, hydrated]);

  const add = useCallback(
    async (input: CartAddInput) => {
      setError(null);
      setBusy(true);
      try {
        if (authed) {
          const cart = await cartApi.add(api, {
            productId: input.productId,
            productSKUId: input.skuId ?? undefined,
            quantity: input.qty ?? 1,
          });
          setLines(fromServer(cart));
        } else {
          setLines((prev) => {
            const key = keyOf(input.productId, input.skuId ?? null);
            const existing = prev.find((l) => l.key === key);
            if (existing) {
              return prev.map((l) =>
                l.key === key
                  ? {
                      ...l,
                      qty: Math.min(l.maxQuantity || 99, l.qty + (input.qty ?? 1)),
                    }
                  : l,
              );
            }
            return [
              ...prev,
              {
                id: null,
                key,
                productId: input.productId,
                name: input.name ?? '',
                slug: input.slug ?? '',
                image: input.image ?? null,
                skuId: input.skuId ?? null,
                skuLabel: input.skuLabel ?? '',
                unitPrice: input.unitPrice ?? 0,
                listPrice: input.unitPrice ?? 0,
                qty: input.qty ?? 1,
                maxQuantity: 99,
              },
            ];
          });
        }
        setDrawerOpen(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not add to your bag');
      } finally {
        setBusy(false);
      }
    },
    [api, authed],
  );

  const remove = useCallback(
    async (key: string) => {
      setError(null);
      const target = lines.find((l) => l.key === key);
      setLines((prev) => prev.filter((l) => l.key !== key));
      if (!authed || target?.id == null) return;
      setBusy(true);
      try {
        const cart = await cartApi.remove(api, target.id);
        setLines(fromServer(cart));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not remove the item');
        setLines((prev) => {
          if (target) return [...prev, target];
          return prev;
        });
      } finally {
        setBusy(false);
      }
    },
    [api, authed, lines],
  );

  const setQty = useCallback(
    async (key: string, qty: number) => {
      setError(null);
      const target = lines.find((l) => l.key === key);
      if (!target) return;
      if (qty <= 0) {
        await remove(key);
        return;
      }
      setBusy(true);
      try {
        if (authed && target.id != null) {
          const cart = await cartApi.setQuantity(api, target.id, qty);
          setLines(fromServer(cart));
        } else {
          setLines((prev) =>
            prev.map((l) =>
              l.key === key
                ? { ...l, qty: Math.min(l.maxQuantity || 99, qty) }
                : l,
            ),
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not update the quantity');
      } finally {
        setBusy(false);
      }
    },
    [api, authed, lines, remove],
  );

  const clear = useCallback(async () => {
    setError(null);
    setLines([]);
    if (!authed) return;
    setBusy(true);
    try {
      const cart = await cartApi.clear(api);
      setLines(fromServer(cart));
    } finally {
      setBusy(false);
    }
  }, [api, authed]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
    const listTotal = lines.reduce((n, l) => n + l.listPrice * l.qty, 0);
    return {
      lines,
      count,
      subtotal,
      listTotal,
      savings: Math.max(0, listTotal - subtotal),
      busy,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add,
      setQty,
      remove,
      clear,
      error,
      clearError: () => setError(null),
    };
  }, [lines, busy, drawerOpen, add, setQty, remove, clear, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

export { emptyCart };