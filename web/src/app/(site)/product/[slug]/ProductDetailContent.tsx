'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, ShoppingBag, Truck, RotateCcw, ShieldCheck, Minus, Plus, Heart } from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useCart } from '@/lib/cart';
import { useWishlist } from '@/lib/wishlist';
import { formatTaka, discountPercent } from '@/lib/media-url';
import { storefront, type ProductDetail, type ProductSummary, type Sku } from '@/lib/storefront';
import { ProductShelf } from '@/components/storefront/ProductShelf';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { ProductReviews } from '@/components/storefront/ProductReviews';
import { ProductGridSkeleton } from '@/components/storefront/SectionHeader';

interface OptionGroup {
  attributeId: number;
  attributeName: string;
  values: { valueId: number; value: string; valueBN?: string | null }[];
  attributeNameBN?: string | null;
}

/** Effective price for one SKU, mirroring the backend discount-window logic. */
function effectivePrice(sku: Sku): number {
  if (sku.discountedPrice != null) {
    const now = Date.now();
    const start = sku.discountedPriceStartDate ? new Date(sku.discountedPriceStartDate).getTime() : -Infinity;
    const end = sku.discountedPriceEndDate ? new Date(sku.discountedPriceEndDate).getTime() : Infinity;
    if (now >= start && now <= end) return sku.discountedPrice;
  }
  return sku.price ?? 0;
}

export function ProductDetailContent({ slug }: { slug: string }) {
  const { t, locale } = useLocale();
  const { add } = useCart();
  const { ids, toggling, toggle } = useWishlist();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [related, setRelated] = useState<ProductSummary[]>([]);

  useEffect(() => {
    let alive = true;
    storefront
      .productBySlug(slug)
      .then((p) => {
        if (!alive) return;
        setProduct(p);
        // prefer an active SKU as the default selection
        const active = p.skus.filter((s) => s.isActive);
        if (active.length > 0) {
          const def = active.find((s) => s.isDefault) ?? active[0];
          const sel: Record<number, number> = {};
          for (const v of def.skuVariants ?? []) {
            sel[v.attribute.id] = v.attributeValue.id;
          }
          setSelection(sel);
        }
        if (p.category) {
          storefront
            .products({ categoryId: p.category.id, size: 5 })
            .then((r) => alive && setRelated(r.data.filter((x) => x.id !== p.id)))
            .catch(() => {});
        }
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Product not found'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const images = useMemo(() => {
    const media = (product?.media ?? []).filter((m) => m.type !== 'video');
    const thumbs = media.length ? media : product?.thumbnailUrl ? [{ id: 0, url: product.thumbnailUrl, type: 'image', altText: null, isPrimary: true, sortOrder: 0 }] : [];
    return thumbs;
  }, [product]);

  const optionGroups = useMemo<OptionGroup[]>(() => {
    const map = new Map<number, OptionGroup>();
    for (const sku of product?.skus ?? []) {
      for (const v of sku.skuVariants ?? []) {
        const g = map.get(v.attribute.id) ?? {
          attributeId: v.attribute.id,
          attributeName: v.attribute.name,
          attributeNameBN: v.attribute.nameBN,
          values: [],
        };
        if (!g.values.some((x) => x.valueId === v.attributeValue.id)) {
          g.values.push({
            valueId: v.attributeValue.id,
            value: v.attributeValue.name,
            valueBN: v.attributeValue.nameBN,
          });
        }
        map.set(v.attribute.id, g);
      }
    }
    return [...map.values()];
  }, [product]);

  /** SKUs matching the current variant selection (partial matches allowed). */
  const matchingSkus = useMemo(() => {
    const selIds = Object.entries(selection).map(([k, v]) => ({ attr: Number(k), val: v }));
    if (!selIds.length) return product?.skus.filter((s) => s.isActive) ?? [];
    return (product?.skus ?? []).filter(
      (s) =>
        s.isActive &&
        selIds.every(({ attr, val }) =>
          (s.skuVariants ?? []).some((v) => v.attribute.id === attr && v.attributeValue.id === val),
        ),
    );
  }, [product, selection]);

  const selectedSku = useMemo(
    () => matchingSkus.find((s) => optionGroups.every((g) => selection[g.attributeId] != null && (s.skuVariants ?? []).some((v) => v.attribute.id === g.attributeId && v.attributeValue.id === selection[g.attributeId]))) ?? matchingSkus[0] ?? null,
    [matchingSkus, selection, optionGroups],
  );

  const price = selectedSku ? effectivePrice(selectedSku) : product?.pricing.priceFrom ?? 0;
  const original = selectedSku?.discountedPrice != null && selectedSku.discountedPrice < selectedSku.price ? selectedSku.price : product?.pricing.compareAtFrom ?? null;
  const onSale = original != null && original > price;
  const inStock = selectedSku ? selectedSku.quantity > 0 : (product?.pricing.inStock ?? false);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <ProductGridSkeleton count={2} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="text-5xl">🧵</div>
        <h1 className="mt-4 text-xl font-bold">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This piece may have sold out or the link is incorrect.
        </p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          {t('Back to shop')}
        </Link>
      </div>
    );
  }

  const wished = ids.has(product.id);

  const onWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await toggle(product.id);
    if (result === 'guest') router.push('/user/login');
  };

  const pick = (attrId: number, valueId: number) => {
    setSelection((prev) => ({ ...prev, [attrId]: valueId }));
  };

  const addToBag = () => {
    if (!inStock) return;
    add({
      productId: product.id,
      name: t(product.name, product.nameBN),
      slug: product.slug,
      image: product.thumbnailUrl ?? images[0]?.url ?? null,
      skuId: selectedSku?.id ?? null,
      skuLabel: selectedSku
        ? (selectedSku.skuVariants ?? []).map((v) => v.attributeValue.name).join(' / ')
        : '',
      unitPrice: price,
      qty,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:py-8 md:pb-12">
      {/* breadcrumb */}
      <nav className="mb-3 flex items-center gap-1 text-[11px] text-muted-foreground sm:mb-4 sm:text-xs">
        <Link href="/" className="hover:text-primary">{t('Home')}</Link>
        <ChevronRight size={12} />
        <Link href="/shop" className="hover:text-primary">{t('Shop')}</Link>
        {product.category && (
          <>
            <ChevronRight size={12} />
            <Link href={`/shop?categoryId=${product.category.id}`} className="hover:text-primary">
              {t(product.category.name, product.category.nameBN)}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        {/* gallery */}
        <div>
          <ProductGallery
            key={product.id}
            images={images.map((m) => ({ id: m.id, url: m.url, altText: m.altText }))}
            name={t(product.name, product.nameBN)}
            insetBadges={
              <>
                {onSale && (
                  <span className="absolute left-3 top-3 rounded-full bg-badge-red px-2.5 py-1 text-xs font-bold text-badge-red-foreground">
                    -{discountPercent(original, price)}%
                  </span>
                )}
                {product.collection && (
                  <span className="absolute right-3 top-3 rounded-full bg-primary/85 px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                    {product.collection.name}
                  </span>
                )}
              </>
            }
          />
        </div>

        {/* info */}
        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {product.category && (
              <span>{t(product.category.name, product.category.nameBN)}</span>
            )}
            {product.collection && (
              <>
                <span>·</span>
                <span className="text-primary">{product.collection.name}</span>
              </>
            )}
          </div>

          <h1 className="mt-1.5 text-xl font-extrabold leading-tight text-foreground sm:mt-2 sm:text-3xl">
            {t(product.name, product.nameBN)}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-baseline gap-3 sm:mt-4">
            <span className="text-3xl font-extrabold text-primary">{formatTaka(price)}</span>
            {onSale && original != null && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatTaka(original)}
                </span>
                <span className="rounded-full bg-badge-red/10 px-2.5 py-1 text-xs font-bold text-badge-red-foreground">
                  Save {formatTaka(original - price)}
                </span>
              </>
            )}
          </div>

          {/* stock */}
          <p className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${inStock ? 'text-emerald-700' : 'text-destructive'}`}>
            <span className={`inline-block h-2 w-2 rounded-full ${inStock ? 'bg-emerald-600' : 'bg-destructive'}`} />
            {inStock
              ? selectedSku
                ? t('In stock — ready to ship')
                : t('In stock')
              : t('Out of stock')}
          </p>

          {/* variant picker */}
          {optionGroups.length > 0 && (
            <div className="mt-4 space-y-4 sm:mt-6 sm:space-y-5">
              {optionGroups.map((group) => (
                <div key={group.attributeId}>
                  <p className="mb-2 text-sm font-semibold text-foreground">
                    {locale === 'bn' && group.attributeNameBN ? group.attributeNameBN : group.attributeName}
                    {selection[group.attributeId] != null && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {(() => {
                          const picked = group.values.find((v) => v.valueId === selection[group.attributeId]);
                          if (!picked) return null;
                          return locale === 'bn' && picked.valueBN ? picked.valueBN : picked.value;
                        })()}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((v) => {
                      const active = selection[group.attributeId] === v.valueId;
                      const available = (product.skus ?? []).some(
                        (s) =>
                          s.isActive &&
                          s.quantity > 0 &&
                          (s.skuVariants ?? []).some(
                            (sv) => sv.attribute.id === group.attributeId && sv.attributeValue.id === v.valueId,
                          ),
                      );
                      return (
                        <button
                          key={v.valueId}
                          onClick={() => pick(group.attributeId, v.valueId)}
                          disabled={!available}
                          className={`min-w-11 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                            active
                              ? 'border-primary bg-primary text-primary-foreground'
                              : available
                                ? 'border-border bg-card text-foreground hover:border-primary'
                                : 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through'
                          }`}
                        >
                          {locale === 'bn' && v.valueBN ? v.valueBN : v.value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* qty + add to bag */}
          <div className="mt-5 flex gap-2.5 sm:mt-7 sm:gap-3">
            <div className="flex h-12 items-center rounded-full border border-border bg-card">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                aria-label="Decrease"
                className="flex h-full w-11 items-center justify-center text-muted-foreground active:scale-90"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((n) => Math.min(99, n + 1))}
                aria-label="Increase"
                className="flex h-full w-11 items-center justify-center text-muted-foreground active:scale-90"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              onClick={addToBag}
              disabled={!inStock}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag size={17} />
              {inStock ? t('Add to bag') : t('Sold out')}
            </button>
            <button
              onClick={onWishlist}
              aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wished}
              disabled={toggling === product.id}
              title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition active:scale-90 disabled:opacity-60 ${
                wished
                  ? 'border-badge-red/30 bg-badge-red/10 text-badge-red'
                  : 'border-border bg-card text-muted-foreground hover:border-badge-red/40 hover:text-badge-red'
              } ${toggling === product.id ? 'animate-pulse' : ''}`}
            >
              <Heart size={19} fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* service notes */}
          <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-card p-2.5 text-center text-[10px] text-muted-foreground sm:mt-6 sm:gap-2 sm:p-4 sm:text-[11px]">
            <div className="flex flex-col items-center gap-1">
              <Truck size={16} className="text-primary" />
              {t('Fast delivery')}
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw size={16} className="text-primary" />
              {t('7-day returns')}
            </div>
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={16} className="text-primary" />
              {t('Secure checkout')}
            </div>
          </div>

          {/* description */}
          <div className="mt-8">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {t('Description')}
            </h2>
            <div className="prose-sm max-w-none space-y-3 text-sm leading-relaxed text-foreground/90">
              {locale === 'bn' && product.descriptionBN
                ? product.descriptionBN.split('\n').map((p, i) => <p key={i}>{p}</p>)
                : (product.description ?? t('No description yet.')).split('\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </div>

      {/* reviews */}
      <div className="mt-14">
        <ProductReviews productId={product.id} />
      </div>

      {/* related */}
      {related.length > 0 && (
        <div className="mt-14">
          <ProductShelf title={t('You may also like')} products={related} viewAllHref={product.category ? `/shop?categoryId=${product.category.id}` : '/shop'} />
        </div>
      )}

      {/* mobile sticky add bar */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.6rem)] z-30 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {t(product.name, product.nameBN)}
            </p>
            <p className="text-base font-extrabold text-primary">{formatTaka(price)}</p>
          </div>
          <button
            onClick={addToBag}
            disabled={!inStock}
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground active:scale-95 disabled:opacity-40"
          >
            <ShoppingBag size={16} />
            {inStock ? t('Add to bag') : t('Sold out')}
          </button>
        </div>
      </div>
    </div>
  );
}