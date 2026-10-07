'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLocale } from '@/lib/locale';

/**
 * Compact bilingual section heading used above shelves and rails. Title left,
 * optional "View all" action right — keeps the section header one slim row so
 * more content fits on screen.
 */
export function SectionHeader({
  title,
  titleBN,
  subtitle,
  viewAllHref,
}: {
  title: string;
  titleBN?: string | null;
  subtitle?: string;
  viewAllHref?: string;
}) {
  const { t } = useLocale();
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold leading-tight text-foreground sm:text-xl">
          {t(title, titleBN)}
        </h2>
        {subtitle && (
          <p className="mt-0.5 hidden text-[13px] text-muted-foreground sm:block">
            {subtitle}
          </p>
        )}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="flex shrink-0 items-center gap-1 pb-0.5 text-[13px] font-semibold text-primary transition-all hover:gap-1.5"
        >
          {t('View all')} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

/** Rail of skeleton cards shown while the shelves stream in. */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] rounded-lg bg-muted" />
          <div className="mt-1.5 h-3.5 w-3/4 rounded bg-muted" />
          <div className="mt-1 h-3.5 w-1/2 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}