'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, LayoutGrid } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { mediaUrl } from '@/lib/media-url';
import { storefront, type CategoryNode } from '@/lib/storefront';

/** Total leaf-ish count across the (flattened) tree. */
function countNodes(nodes: CategoryNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + (n.childrenNodes?.length ? countNodes(n.childrenNodes) : 0), 0);
}

/**
 * Category browse page: the full category tree in one scroll — top-level
 * cards with children, product counts and direct shop links. Deliberately
 * visual and compact so the whole catalog is reachable in a few taps.
 */
export default function CategoriesPage() {
  const { t, locale } = useLocale();
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    storefront
      .categoryTree()
      .then((t) => alive && setTree(t))
      .catch(() => alive && setTree([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const total = useMemo(() => countNodes(tree), [tree]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 sm:py-8">
      <header className="mb-3 flex items-end justify-between gap-3 sm:mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-foreground sm:text-3xl">
            {t('Browse categories')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading
              ? t('Loading…')
              : locale === 'bn'
                ? `${total}টি ক্যাটাগরি`
                : `${total} categories to explore`}
          </p>
        </div>
        <Link
          href="/shop"
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground transition hover:border-primary hover:text-primary"
        >
          <LayoutGrid size={15} /> {t('All products')}
        </Link>
      </header>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-3 sm:p-4">
              <div className="aspect-square rounded-lg bg-muted sm:aspect-[16/9]" />
              <div className="mt-3 h-4 w-1/2 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <div className="text-4xl">🗂️</div>
          <p className="font-semibold text-foreground">{t('No categories yet')}</p>
          <Link href="/shop" className="mt-1 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            {t('Browse all products')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {tree.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ cat }: { cat: CategoryNode }) {
  const { t } = useLocale();
  const image = mediaUrl(cat.imageUrl);
  const children = cat.childrenNodes ?? [];
  const visibleChildren = children.slice(0, 6);

  /** Roll up the whole subtree so top-level cards show their real footprint. */
  const subtreeCount =
    (cat.productCount ?? 0) +
    children.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
      <Link
        href={`/shop?categoryId=${cat.id}`}
        className="group flex flex-col items-start gap-2 p-2.5 text-left sm:flex-row sm:items-center sm:gap-3 sm:p-4"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-accent text-base font-extrabold text-accent-foreground sm:h-16 sm:w-16 sm:text-lg">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={t(cat.name, cat.nameBN)} className="h-full w-full object-cover" />
          ) : (
            t(cat.name, cat.nameBN).charAt(0)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-foreground sm:text-base">
            {t(cat.name, cat.nameBN)}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {subtreeCount} {t('products')}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>

      {visibleChildren.length > 0 && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-border px-2.5 py-2 sm:px-4 sm:py-2.5">
          {visibleChildren.map((child) => (
            <Link
              key={child.id}
              href={`/shop?categoryId=${child.id}`}
              className="shrink-0 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              {t(child.name, child.nameBN)}
            </Link>
          ))}
          {children.length > visibleChildren.length && (
            <Link
              href={`/shop?categoryId=${cat.id}`}
              className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              +{children.length - visibleChildren.length}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}