'use client';

import Image from 'next/image';
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
      {/* Mobile-first density: square images on phones keep each card short so
          more rows fit one screen; the taller 4:5 crop returns at sm+. */}
      <div className="relative aspect-square w-full overflow-hidden bg-muted sm:aspect-[4/5]">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
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
            className={`flex h-7 w-7 items-center justify-center rounded-full border shadow transition-transform active:scale-90 disabled:opacity-60 sm:h-8 sm:w-8 ${
              wished
                ? 'border-badge-red/30 bg-white text-badge-red'
                : 'border-border bg-white/90 text-muted-foreground hover:text-badge-red'
            } ${toggling === product.id ? 'animate-pulse' : ''}`}
          >
            <Heart size={13} fill={wished ? 'currentColor' : 'none'} className="sm:h-[15px] sm:w-[15px]" />
          </button>
        </div>
        {/* Always-visible on phones (a hover-revealed affordance is unreachable on
            touch); from sm up the reveal is restored so the card stays uncluttered. */}
        <button
          onClick={quickAdd}
          aria-label="Quick add to cart"
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition-transform active:scale-90 sm:h-8 sm:w-8 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
        >
          <ShoppingBag size={14} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-1.5 sm:p-2">
        <h3 className="line-clamp-2 min-h-[2.2em] text-[12px] font-medium leading-snug text-foreground sm:min-h-[2.3em] sm:text-[13px]">
          {t(product.name, product.nameBN)}
        </h3>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-[13px] font-bold text-primary sm:text-[13px]">
            {formatTaka(product.priceFrom)}
          </span>
          {onSale && (
            <span className="text-[10px] text-muted-foreground line-through sm:text-[11px]">
              {formatTaka(product.compareAtFrom)}
            </span>
          )}
          {product.priceTo > product.priceFrom && (
            <span className="text-[10px] text-muted-foreground">
              – {formatTaka(product.priceTo)}
            </span>
          )}
        </div>
        {/* Stock state matters only when it is bad; the positive case is noise on
            a dense phone grid, so it shows from sm up. */}
        {product.inStock ? (
          <span className="hidden text-[10px] font-medium text-emerald-700 sm:block">
            In stock
          </span>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground">
            Out of stock
          </span>
        )}
      </div>
    </Link>
  );
}