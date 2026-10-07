'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/locale';
import { mediaUrl } from '@/lib/media-url';
import type { Banner } from '@/lib/storefront';
import { ArrowRight } from 'lucide-react';

/**
 * Hero carousel driven by admin banners (position 'hero'). Mobile uses the
 * dedicated mobileImageUrl when set; swipeable with snap scroll + dots.
 */
export function BannerHero({ banners }: { banners: Banner[] }) {
  const { t } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [banners.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }, [index, banners.length]);

  if (banners.length === 0) return null;

  return (
    <section className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {banners.map((b) => (
          <BannerSlide key={b.id} banner={b} />
        ))}
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-5 bg-primary' : 'w-1.5 bg-primary/25'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BannerSlide({ banner }: { banner: Banner }) {
  const { t } = useLocale();
  const desktop = mediaUrl(banner.imageUrl);
  const mobile = mediaUrl(banner.mobileImageUrl ?? banner.imageUrl);
  const title = t(banner.title, banner.titleBN);
  const href = normalizeLink(banner.linkUrl);

  const inner = (
    <div className="relative h-[420px] w-full overflow-hidden sm:h-[480px]">
      {/* mobile-first image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mobile}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover sm:hidden"
      />
      {/* desktop image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={desktop}
        alt={title}
        className="absolute inset-0 hidden h-full w-full object-cover sm:block"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 sm:max-w-xl sm:p-10">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
          Jabaib
        </p>
        <h2 className="text-3xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-4xl">
          {title}
        </h2>
        {href && (
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-accent">
            {t('Shop now')} <ArrowRight size={15} />
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full shrink-0 snap-center">
      {href ? (
        <Link href={href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

/** banner linkUrl may be an absolute URL or an internal path like /collections/sale. */
function normalizeLink(link: string | null): string | null {
  if (!link) return null;
  if (/^https?:\/\//i.test(link)) {
    try {
      const url = new URL(link);
      if (url.hostname.endsWith('jabaib.com')) return url.pathname + url.search;
    } catch {
      return null;
    }
    return null;
  }
  return link.startsWith('/') ? link : `/${link}`;
}