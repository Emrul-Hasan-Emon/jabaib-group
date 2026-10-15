'use client';

import { useLocale } from '@/lib/locale';
import { Languages } from 'lucide-react';

/** EN/BN content toggle backed by the shared locale context. */
export function LangToggle({ onDark = false }: { onDark?: boolean }) {
  const { locale, setLocale } = useLocale();
  return (
    <button
      onClick={() => setLocale(locale === 'en' ? 'bn' : 'en')}
      className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase transition ${
        onDark
          ? 'border-white/20 text-white/90 hover:bg-white/10'
          : 'border-border text-nav-foreground hover:bg-muted'
      }`}
      title="Content language"
    >
      <Languages size={12} />
      {locale === 'en' ? 'EN' : 'বাং'}
    </button>
  );
}