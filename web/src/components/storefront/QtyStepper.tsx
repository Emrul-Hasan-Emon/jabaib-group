'use client';

import { useLocale } from '@/lib/locale';

/** Touch-friendly quantity stepper used in the cart drawer. */
export function QtyStepper({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
}) {
  const { t } = useLocale();
  return (
    <div className="flex h-8 items-center rounded-full border border-border bg-background">
      <button
        type="button"
        aria-label={t('Decrease quantity')}
        onClick={() => onChange(value - 1)}
        className="flex h-full w-8 items-center justify-center rounded-l-full text-lg font-semibold text-muted-foreground transition active:scale-90 disabled:opacity-30"
        disabled={value <= 1}
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={t('Increase quantity')}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="flex h-full w-8 items-center justify-center rounded-r-full text-lg font-semibold text-muted-foreground transition active:scale-90 disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}