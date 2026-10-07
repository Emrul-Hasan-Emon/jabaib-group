'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export interface CartLine {
  /** `${productId}:${skuId ?? 'none'}` */
  key: string;
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  skuId: number | null;
  skuLabel: string; // e.g. "M / Black"
  unitPrice: number;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (line: Omit<CartLine, 'key' | 'qty'> & { qty?: number }) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const STORAGE_KEY = 'jabaibCart';
const Ctx = createContext<CartContextValue | null>(null);

function load(): CartLine[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setLines(load());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage may be unavailable in private mode */
    }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'key' | 'qty'> & { qty?: number }) => {
    const key = `${line.productId}:${line.skuId ?? 'none'}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) =>
          l.key === key ? { ...l, qty: Math.min(99, l.qty + (line.qty ?? 1)) } : l,
        );
      }
      return [...prev, { ...line, key, qty: line.qty ?? 1 }];
    });
    setDrawerOpen(true);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    if (qty <= 0) {
      setLines((prev) => prev.filter((l) => l.key !== key));
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.min(99, qty) } : l)),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.qty, 0);
    return {
      lines,
      count,
      subtotal,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      add,
      setQty,
      remove,
      clear,
    };
  }, [lines, drawerOpen, add, setQty, remove, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}