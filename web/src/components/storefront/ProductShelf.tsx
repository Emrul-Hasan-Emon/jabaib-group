'use client';

import { useLocale } from '@/lib/locale';
import type { ProductSummary } from '@/lib/storefront';
import { ProductCard } from './ProductCard';
import { SectionHeader } from './SectionHeader';

/**
 * Merchandised product shelf: compact title row (bilingual, with "View all")
 * plus a single horizontal swipeable rail of ProductCards at every
 * breakpoint. `viewAllHref` links to the shop.
 */
export function ProductShelf({
  title,
  titleBN,
  products,
  viewAllHref,
}: {
  title: string;
  titleBN?: string | null;
  products: ProductSummary[];
  viewAllHref?: string;
}) {
  const { t } = useLocale();
  if (!products.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
      <SectionHeader title={title} titleBN={titleBN} viewAllHref={viewAllHref} />
      <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:px-0">
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[42vw] shrink-0 snap-start sm:w-56 lg:w-60"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}