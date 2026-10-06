'use client';

import { useEffect, useState } from 'react';

const KEY = 'jabaibLocale';

/** EN/BN content toggle for admin-entered bilingual fields. */
export function LangToggle() {
  const [locale, setLocale] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved === 'bn') setLocale('bn');
  }, []);

  const toggle = () => {
    const next = locale === 'en' ? 'bn' : 'en';
    setLocale(next);
    localStorage.setItem(KEY, next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border px-2 py-1 text-xs font-semibold uppercase"
      title="Content language"
    >
      {locale === 'en' ? 'EN' : 'বাং'}
    </button>
  );
}
