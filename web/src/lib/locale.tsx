'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Locale = 'en' | 'bn';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Pick the Bangla text when it exists and BN is active, else English. */
  t: (en: string | null | undefined, bn?: string | null | undefined) => string;
}

const KEY = 'jabaibLocale';
const Ctx = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === 'bn') setLocaleState('bn');
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(KEY, l);
  }, []);

  const t = useCallback(
    (en: string | null | undefined, bn?: string | null | undefined) => {
      return locale === 'bn' && bn ? bn : (en ?? '');
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}