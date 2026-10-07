'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import {
  storefront,
  type ProductSummary,
  type ProductQuery,
  type CategoryNode,
  type Collection,
  type ProductSort,
  type AttributeGroup,
  type FacetGroup,
} from '@/lib/storefront';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductGridSkeleton } from '@/components/storefront/SectionHeader';

const SORTS: { value: ProductSort; label: { en: string; bn: string } }[] = [
  { value: 'newest', label: { en: 'Newest', bn: 'নতুন' } },
  { value: 'price-asc', label: { en: 'Price: low to high', bn: 'দাম: কম থেকে বেশি' } },
  { value: 'price-desc', label: { en: 'Price: high to low', bn: 'দাম: বেশি থেকে কম' } },
  { value: 'name-asc', label: { en: 'Name A–Z', bn: 'নাম অনুযায়ী' } },
];

export function ShopContent({
  initialQuery,
  basePath = '/shop',
}: {
  initialQuery: ProductQuery & { isFeatured?: boolean };
  basePath?: string;
}) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [attributes, setAttributes] = useState<AttributeGroup[]>([]);
  const [facets, setFacets] = useState<FacetGroup[]>([]);

  const flatCategories = useMemo(() => {
    const out: CategoryNode[] = [];
    const walk = (nodes: CategoryNode[]) => {
      for (const n of nodes) {
        out.push(n);
        if (n.childrenNodes?.length) walk(n.childrenNodes);
      }
    };
    walk(tree);
    return out;
  }, [tree]);

  useEffect(() => {
    storefront.categoryTree().then(setTree).catch(() => setTree([]));
    storefront.collections().then(setCollections).catch(() => setCollections([]));
    storefront.attributes().then(setAttributes).catch(() => setAttributes([]));
  }, []);

  // Facet counts follow the browse scope (category / collection / query),
  // deliberately ignoring the selected attrValues so counts stay stable.
  useEffect(() => {
    let alive = true;
    storefront
      .facets({
        categoryId: query.categoryId,
        collectionId: query.collectionId,
        q: query.q,
      })
      .then((f) => alive && setFacets(f))
      .catch(() => alive && setFacets([]));
    return () => {
      alive = false;
    };
  }, [query.categoryId, query.collectionId, query.q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setItems([]);
    setPage(0);
    storefront
      .products({ ...query, page: 0, size: 20 })
      .then((r) => {
        if (!alive) return;
        setItems(r.data);
        setTotal(r.pagination.totalItems);
        setHasNext(r.pagination.hasNext);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  const apply = (patch: Partial<typeof query>) => {
    const next = { ...query, ...patch, page: 0 };
    setQuery(next);
    // keep the URL shareable
    const sp = new URLSearchParams();
    if (next.q) sp.set('q', next.q);
    if (next.categoryId) sp.set('categoryId', String(next.categoryId));
    if (next.collectionId) sp.set('collectionId', String(next.collectionId));
    if (next.isFeatured) sp.set('isFeatured', 'true');
    if (next.attrValues) sp.set('attrValues', next.attrValues);
    if (next.sort && next.sort !== 'newest') sp.set('sort', next.sort);
    const qs = sp.toString();
    router.replace(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  /** Selected attribute value ids parsed from query.attrValues. */
  const selectedValues = useMemo(() => {
    const set = new Set<number>();
    for (const part of (query.attrValues ?? '').split(',')) {
      const n = Number(part);
      if (Number.isInteger(n) && n > 0) set.add(n);
    }
    return set;
  }, [query.attrValues]);

  const toggleAttr = (valueId: number) => {
    const next = new Set(selectedValues);
    if (next.has(valueId)) next.delete(valueId);
    else next.add(valueId);
    const joined = [...next].sort((a, b) => a - b).join(',');
    apply({ attrValues: joined || undefined });
  };

  const attrValueName = (id: number): string => {
    for (const g of attributes) {
      const v = g.values.find((x) => x.id === id);
      if (v) return t(v.name, v.nameBN);
    }
    return String(id);
  };

  const facetCount = (valueId: number): number => {
    for (const g of facets) {
      const v = g.values.find((x) => x.valueId === valueId);
      if (v) return v.count;
    }
    return 0;
  };

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const r = await storefront.products({ ...query, page: nextPage, size: 20 });
      setItems((prev) => [...prev, ...r.data]);
      setPage(nextPage);
      setHasNext(r.pagination.hasNext);
    } finally {
      setLoadingMore(false);
    }
  };

  const activeCat = flatCategories.find((c) => c.id === query.categoryId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-3 sm:py-8">
      {/* heading */}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 sm:mb-5 sm:gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            {query.q
              ? `“${query.q}”`
              : activeCat
                ? t(activeCat.name, activeCat.nameBN)
                : t('Shop all')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? t('Loading…') : `${total} ${t('products')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground sm:text-sm lg:hidden"
          >
            <SlidersHorizontal size={15} /> {t('Filters')}
          </button>
          <div className="relative">
            <select
              value={query.sort ?? 'newest'}
              onChange={(e) => apply({ sort: e.target.value as ProductSort })}
              className="appearance-none rounded-full border border-border bg-card py-1.5 pl-3 pr-8 text-[13px] font-medium outline-none focus:border-ring sm:py-2 sm:text-sm"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {locale === 'bn' ? s.label.bn : s.label.en}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              ▾
            </span>
          </div>
        </div>
      </div>

      {/* active filter chips */}
      {(query.categoryId || query.collectionId || query.isFeatured || selectedValues.size > 0) && (
        <div className="mb-2.5 flex flex-wrap gap-1.5 sm:mb-4 sm:gap-2">
          {query.categoryId && activeCat && (
            <Chip onClear={() => apply({ categoryId: undefined })}>
              {t(activeCat.name, activeCat.nameBN)}
            </Chip>
          )}
          {query.collectionId && (
            <Chip onClear={() => apply({ collectionId: undefined })}>
              {collections.find((c) => c.id === query.collectionId)?.name ??
                t('Collection')}
            </Chip>
          )}
          {query.isFeatured && (
            <Chip onClear={() => apply({ isFeatured: false })}>
              {t('Featured')}
            </Chip>
          )}
          {[...selectedValues].sort((a, b) => a - b).map((valueId) => (
            <Chip key={valueId} onClear={() => toggleAttr(valueId)}>
              {attrValueName(valueId)}
            </Chip>
          ))}
        </div>
      )}

      <div className="flex gap-6">
        {/* sidebar filters (desktop) */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-32 space-y-6">
            <FilterGroup title={t('Category')}>
              <button
                onClick={() => apply({ categoryId: undefined })}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-[13px] sm:text-sm ${
                  !query.categoryId
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('All categories')}
              </button>
              {flatCategories.slice(0, 30).map((c) => (
                <button
                  key={c.id}
                  onClick={() => apply({ categoryId: c.id })}
                  className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    query.categoryId === c.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(c.name, c.nameBN)}
                </button>
              ))}
            </FilterGroup>
            {collections.length > 0 && (
              <FilterGroup title={t('Collection')}>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => apply({ collectionId: c.id })}
                    className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${
                      query.collectionId === c.id
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </FilterGroup>
            )}
            {attributes.map((g) => (
              <FilterGroup key={g.id} title={t(g.name, g.nameBN)}>
                <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto pr-1">
                  {g.values.map((v) => {
                    const selected = selectedValues.has(v.id);
                    const count = facetCount(v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggleAttr(v.id)}
                        aria-pressed={selected}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {v.colorCode && (
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-border"
                            style={{ background: v.colorCode }}
                          />
                        )}
                        {t(v.name, v.nameBN)}
                        {count > 0 && (
                          <span className="opacity-70">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>
            ))}
          </div>
        </aside>

        {/* results */}
        <div className="min-w-0 flex-1">
          {error ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              {error}
            </div>
          ) : loading ? (
            <ProductGridSkeleton count={8} />
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-10 text-center sm:py-16">
              <div className="text-4xl">🔍</div>
              <p className="font-semibold text-foreground">{t('No products found')}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t('Try a different search term or clear the filters.')}
              </p>
              <button
                onClick={() => apply({ q: '', categoryId: undefined, collectionId: undefined, isFeatured: false })}
                className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
              >
                {t('Clear filters')}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {hasNext && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-border bg-card px-6 py-2 text-[13px] font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50 sm:px-8 sm:py-3 sm:text-sm"
                  >
                    {loadingMore ? t('Loading…') : t('Load more')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* mobile filter sheet */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-2xl bg-card p-4 pb-8 sm:max-h-[80vh] sm:p-5 sm:pb-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <SlidersHorizontal size={16} /> {t('Filters')}
              </h2>
              <button
                onClick={() => setShowFilters(false)}
                aria-label={t('Close')}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <FilterGroup title={t('Category')}>
              {flatCategories.slice(0, 30).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    apply({ categoryId: c.id });
                    setShowFilters(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] sm:px-3 sm:py-2 sm:text-sm ${
                    query.categoryId === c.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {t(c.name, c.nameBN)}
                </button>
              ))}
            </FilterGroup>
            {collections.length > 0 && (
              <FilterGroup title={t('Collection')}>
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      apply({ collectionId: c.id });
                      setShowFilters(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                      query.collectionId === c.id
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-foreground'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </FilterGroup>
            )}
            {attributes.map((g) => (
              <FilterGroup key={g.id} title={t(g.name, g.nameBN)}>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((v) => {
                    const selected = selectedValues.has(v.id);
                    const count = facetCount(v.id);
                    return (
                      <button
                        key={v.id}
                        onClick={() => {
                          toggleAttr(v.id);
                          setShowFilters(false);
                        }}
                        aria-pressed={selected}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition sm:py-2 sm:text-sm ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-foreground'
                        }`}
                      >
                        {v.colorCode && (
                          <span
                            className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
                            style={{ background: v.colorCode }}
                          />
                        )}
                        {t(v.name, v.nameBN)}
                        {count > 0 && (
                          <span className="opacity-70">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </FilterGroup>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-primary">
      {children}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-primary/20" aria-label="Clear">
        <X size={12} />
      </button>
    </span>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}