'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale';
import { useCart } from '@/lib/cart';
import { useWishlist } from '@/lib/wishlist';
import { mediaUrl, formatTaka, discountPercent } from '@/lib/media-url';
import type { ProductSummary } from '@/lib/storefront';
import { ShoppingBag, Heart } from 'lucide-react';

/**
 * Storefront product card: image-first, discount badge, bilingual name,
 * price range with strikethrough, quick-add cart button (mobile-friendly).
 * Deliberately compact so rails and grids show more products per screen.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductSummary;
  priority?: boolean;
}) {
  const { t } = useLocale();
  const { add } = useCart();
  const { ids, toggling, toggle } = useWishlist();
  const router = useRouter();
  const image = mediaUrl(product.thumbnailUrl);
  const onSale = product.hasDiscount && product.compareAtFrom != null;
  const wished = ids.has(product.id);

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      productId: product.id,
      name: t(product.name, product.nameBN),
      slug: product.slug,
      image: product.thumbnailUrl,
      skuId: null,
      skuLabel: '',
      unitPrice: product.priceFrom,
    });
  };

  const onWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = await toggle(product.id);
    if (result === 'guest') router.push('/user/login');
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group flex snap-start flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={product.name}
            loading={priority ? 'eager' : 'lazy'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-primary/20">
            {product.name.charAt(0)}
          </div>
        )}
        {onSale && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-badge-red px-1.5 py-px text-[10px] font-bold text-badge-red-foreground">
            -{discountPercent(product.compareAtFrom, product.priceFrom)}%
          </span>
        )}
        {product.collection && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-primary/85 px-1.5 py-px text-[10px] font-semibold text-primary-foreground">
            {product.collection.name}
          </span>
        )}
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1.5">
          <button
            onClick={onWishlist}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            aria-pressed={wished}
            disabled={toggling === product.id}
            className={`flex h-8 w-8 items-center justify-center rounded-full border shadow transition-transform active:scale-90 disabled:opacity-60 ${
              wished
                ? 'border-badge-red/30 bg-white text-badge-red'
                : 'border-border bg-white/90 text-muted-foreground hover:text-badge-red'
            } ${toggling === product.id ? 'animate-pulse' : ''}`}
          >
            <Heart size={15} fill={wished ? 'currentColor' : 'none'} />
          </button>
        </div>
        <button
          onClick={quickAdd}
          aria-label="Quick add to cart"
          className="absolute bottom-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform active:scale-90 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <ShoppingBag size={15} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <h3 className="line-clamp-2 min-h-[2.3em] text-[13px] font-medium leading-snug text-foreground">
          {t(product.name, product.nameBN)}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-bold text-primary">
            {formatTaka(product.priceFrom)}
          </span>
          {onSale && (
            <span className="text-[11px] text-muted-foreground line-through">
              {formatTaka(product.compareAtFrom)}
            </span>
          )}
          {product.priceTo > product.priceFrom && (
            <span className="text-[10px] text-muted-foreground">
              – {formatTaka(product.priceTo)}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] font-medium ${
            product.inStock ? 'text-emerald-700' : 'text-muted-foreground'
          }`}
        >
          {product.inStock ? 'In stock' : 'Out of stock'}
        </span>
      </div>
    </Link>
  );
}