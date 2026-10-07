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
import { customerApi } from './customer-api';

const CHANGE_EVENT = 'jabaib:wishlist';

/** Tell every WishlistProvider to refetch heart states (e.g. after edits in
 *  the account panel, which lives outside this provider's tree). */
export function notifyWishlistChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface WishlistContextValue {
  /** Product ids currently in the caller's wishlist (empty for guests). */
  ids: Set<number>;
  ready: boolean;
  /** Product id mid-toggle (for spinner/heart pulse feedback). */
  toggling: number | null;
  toggle: (productId: number) => Promise<'added' | 'removed' | 'guest'>;
}

const Ctx = createContext<WishlistContextValue | null>(null);

/** Stable empty set for guests so useMemo/useEffect deps stay equal. */
const GUEST_IDS = new Set<number>();

/**
 * Storefront wishlist state: loads once the customer is authenticated, keeps
 * a Set of product ids for instant heart rendering, and updates optimistically
 * on toggle. Guests always get 'guest' so callers can route to login.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status, api } = useUserAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  const refresh = useCallback(
    () =>
      customerApi
        .wishlistIds(api)
        .then((list) => {
          setIds(new Set(list));
          setReady(true);
        })
        .catch(() => {
          setIds(new Set());
          setReady(true);
        }),
    [api],
  );

  useEffect(() => {
    if (status !== 'authed') return;
    void refresh();
    const onEvent = () => void refresh();
    window.addEventListener(CHANGE_EVENT, onEvent);
    return () => window.removeEventListener(CHANGE_EVENT, onEvent);
  }, [status, refresh]);

  const toggle = useCallback(
    async (productId: number): Promise<'added' | 'removed' | 'guest'> => {
      if (status !== 'authed') return 'guest';
      setToggling(productId);
      try {
        const next = new Set(ids);
        if (next.has(productId)) {
          await customerApi.wishlistRemove(api, productId);
          next.delete(productId);
          setIds(next);
          return 'removed';
        }
        await customerApi.wishlistAdd(api, productId);
        next.add(productId);
        setIds(next);
        return 'added';
      } finally {
        setToggling(null);
      }
    },
    [status, api, ids],
  );

  const value = useMemo(
    () => ({
      ids: status === 'authed' ? ids : GUEST_IDS,
      ready: status === 'authed' ? ready : true,
      toggling,
      toggle,
    }),
    [status, ids, ready, toggling, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWishlist() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}