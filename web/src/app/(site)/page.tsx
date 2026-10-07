'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Truck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Mail,
  ArrowRight,
} from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { mediaUrl } from '@/lib/media-url';
import { storefront, type Banner, type HomepageSection, type CategoryNode, type ProductSummary } from '@/lib/storefront';
import { BannerHero } from '@/components/storefront/BannerHero';
import { CategoryRail } from '@/components/storefront/CategoryRail';
import { ProductShelf } from '@/components/storefront/ProductShelf';
import { SectionHeader, ProductGridSkeleton } from '@/components/storefront/SectionHeader';

/**
 * Premium landing page driven by admin content: hero banners, homepage
 * sections (product shelves / categories), promo banner and newsletter.
 */
export default function HomeContent() {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [tree, setTree] = useState<CategoryNode[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [b, s, c] = await Promise.all([
          storefront.banners('hero'),
          storefront.homepageSections(),
          storefront.categoryTree(),
        ]);
        if (!alive) return;
        setBanners(b);
        setSections(s);
        setTree(c);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const heroBanners = banners.filter((b) => !b.position || b.position === 'hero');
  const sideBanner = banners.find((b) => b.position === 'side');
  const categorySection = sections.find((s) => s.type === 'categories');
  const productSections = sections.filter((s) => s.type === 'products');

  return (
    <div className="bg-background">
      {loading ? (
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-2 h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-[420px] animate-pulse rounded-xl bg-muted sm:h-[480px]" />
          <div className="mt-12">
            <ProductGridSkeleton count={4} />
          </div>
        </div>
      ) : (
        <>
          <BannerHero banners={heroBanners} />

          {/* quick category rail (from sections or the tree) */}
          {(categorySection?.items?.length || tree.length > 0) && (
            <section className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
              <SectionHeader
                title={categorySection?.title ?? t('Shop by category')}
                titleBN={categorySection?.titleBN}
                subtitle={t('Everything from everyday basics to statement pieces.')}
                viewAllHref="/categories"
              />
              <CategoryRail
                categories={
                  (categorySection?.items as CategoryNode[])?.length
                    ? ((categorySection?.items ?? []) as CategoryNode[])
                    : tree.slice(0, 10)
                }
              />
            </section>
          )}

          {/* product shelves from DB sections */}
          {productSections.map((section) => (
            <ProductShelf
              key={section.id}
              title={section.title}
              titleBN={section.titleBN}
              products={section.items as ProductSummary[]}
              viewAllHref="/shop"
            />
          ))}

          {/* brochure / perks strip */}
          <section className="mx-auto max-w-6xl px-4 py-4">
            <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-border bg-card p-3 sm:gap-4 sm:p-5">
              <Perk icon={Truck} title={t('Fast delivery')} sub={t('All over Bangladesh')} />
              <Perk icon={RotateCcw} title={t('Easy returns')} sub={t('7-day return window')} />
              <Perk icon={ShieldCheck} title={t('Secure payment')} sub={t('COD & online')} />
            </div>
          </section>

          {/* promo banner */}
          {sideBanner ? (
            <section className="mx-auto max-w-6xl px-4 py-2.5">
              <PromoBanner banner={sideBanner} />
            </section>
          ) : (
            <FeaturedFallback />
          )}

          {/* newsletter */}
          <NewsletterBlock />
        </>
      )}
    </div>
  );
}

function Perk({
  icon: Icon,
  title,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon size={20} className="text-primary" />
      <p className="text-xs font-bold text-foreground sm:text-sm">{title}</p>
      <p className="hidden text-[11px] text-muted-foreground sm:block">{sub}</p>
    </div>
  );
}

function FeaturedFallback() {
  const { t } = useLocale();
  const [featured, setFeatured] = useState<ProductSummary[]>([]);
  useEffect(() => {
    storefront
      .products({ isFeatured: true, size: 8 })
      .then((r) => setFeatured(r.data))
      .catch(() => setFeatured([]));
  }, []);
  if (!featured.length) return null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <ProductShelf
        title={t('Featured for you')}
        products={featured}
        viewAllHref="/shop?isFeatured=true"
      />
    </div>
  );
}

function PromoBanner({ banner }: { banner: Banner }) {
  const { t } = useLocale();
  const image = mediaUrl(banner.mobileImageUrl ?? banner.imageUrl);
  return (
    <Link
      href={banner.linkUrl ?? '/shop'}
      className="relative block overflow-hidden rounded-2xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={banner.title}
        className="aspect-[2/1] w-full object-cover sm:aspect-[4/1]"
      />
      <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/55 to-transparent p-6 sm:p-10">
        <div className="max-w-sm">
          <h3 className="text-xl font-extrabold text-white sm:text-2xl">
            {banner.title}
          </h3>
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary">
            {t('Explore')} <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsletterBlock() {
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-gradient-to-br from-[hsl(var(--hero-gradient-start))] to-[hsl(var(--hero-gradient-end))] px-5 py-8 text-center sm:px-12">
        <Sparkles className="mx-auto mb-2 text-primary" size={24} />
        <h2 className="text-xl font-extrabold text-foreground sm:text-2xl">
          {t('Be first in line')}
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted-foreground sm:text-sm">
          {t(
            'New drops, private sales and style notes — straight to your inbox.',
            'নতুন কালেকশন ও এক্সক্লুসিভ অফার সরাসরি আপনার ইমেইলে।',
          )}
        </p>
        {done ? (
          <p className="mx-auto mt-4 max-w-sm rounded-full bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary">
            {t('You’re on the list — welcome to Jabaib!')}
          </p>
        ) : (
          <form
            onSubmit={submit}
            className="mx-auto mt-4 flex max-w-md overflow-hidden rounded-full border border-border bg-card shadow-sm"
          >
            <div className="relative flex-1">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('Your email address')}
                className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
              />
            </div>
            <button className="shrink-0 bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              {t('Subscribe')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}