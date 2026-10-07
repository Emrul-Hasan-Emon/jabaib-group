'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/locale';
import { mediaUrl } from '@/lib/media-url';
import type { CategoryItem } from '@/lib/storefront';

/**
 * "Shop by category" rail: compact circle-image cards in one horizontal,
 * swipeable row at every breakpoint. Each deep-links into the shop filtered
 * by that category.
 */
export function CategoryRail({
  categories,
}: {
  categories: CategoryItem[];
}) {
  const { t } = useLocale();
  if (!categories.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:px-0">
      {categories.map((c) => {
        const image = mediaUrl(c.imageUrl);
        return (
          <Link
            key={c.id}
            href={`/shop?categoryId=${c.id}`}
            className="group flex w-[74px] shrink-0 snap-start flex-col items-center gap-1.5 text-center sm:w-20"
          >
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-full border border-border bg-accent text-lg font-extrabold text-accent-foreground transition-transform group-hover:scale-105">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt={c.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                c.name.charAt(0)
              )}
            </span>
            <span className="line-clamp-1 w-full text-[11px] font-medium leading-tight text-foreground sm:text-xs">
              {t(c.name, c.nameBN)}
            </span>
          </Link>
        );
      })}
    </div>
  );
}