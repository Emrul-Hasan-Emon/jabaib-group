'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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
        {banners.map((b, i) => (
          <BannerSlide key={b.id} banner={b} priority={i === 0} />
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

function BannerSlide({
  banner,
  priority,
}: {
  banner: Banner;
  priority: boolean;
}) {
  const { t } = useLocale();
  const desktop = mediaUrl(banner.imageUrl);
  const mobile = mediaUrl(banner.mobileImageUrl ?? banner.imageUrl);
  const title = t(banner.title, banner.titleBN);
  const href = normalizeLink(banner.linkUrl);

  const inner = (
    <div className="relative h-[196px] w-full overflow-hidden sm:h-[480px]">
      {/* mobile-first image */}
      <Image
        src={mobile}
        alt={title}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover sm:hidden"
      />
      {/* desktop image */}
      <Image
        src={desktop}
        alt={title}
        fill
        priority={priority}
        sizes="100vw"
        className="hidden object-cover sm:block"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:max-w-xl sm:p-10">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 sm:mb-2 sm:text-[11px]">
          Jabaib
        </p>
        <h2 className="text-xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-4xl">
          {title}
        </h2>
        {href && (
          <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-accent sm:mt-4 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm">
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