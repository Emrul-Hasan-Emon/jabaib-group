'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/locale';

/* lucide dropped brand glyphs — tiny inline SVGs keep the footer crisp. */
function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function YoutubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
    </svg>
  );
}

export function SiteFooter() {
  const { t } = useLocale();
  return (
    <footer className="mt-10 bg-topbar text-topbar-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h3 className="mb-3 text-lg font-extrabold text-white">Jabaib</h3>
          <p className="text-sm leading-relaxed text-white/60">
            {t(
              'Clothing brand crafted in Bangladesh — quality everyday wear with an editorial point of view.',
              'বাংলাদেশে তৈরি পোশাক ব্র্যান্ড — প্রতিদিনের জন্য মানসম্মত, প্রিমিয়াম পোশাক।',
            )}
          </p>
          <div className="mt-4 flex gap-3 text-white/70">
            <a href="#" aria-label="Facebook" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <FacebookIcon />
            </a>
            <a href="#" aria-label="Instagram" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <InstagramIcon />
            </a>
            <a href="#" aria-label="YouTube" className="rounded-full bg-white/10 p-2 hover:bg-white/20">
              <YoutubeIcon />
            </a>
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">{t('Shop')}</h4>
          <ul className="space-y-2 text-white/60">
            <li><Link href="/shop" className="hover:text-white">{t('All products')}</Link></li>
            <li><Link href="/shop?sort=newest" className="hover:text-white">{t('New arrivals')}</Link></li>
            <li><Link href="/shop?sort=price-desc" className="hover:text-white">{t('Premium picks')}</Link></li>
            <li><Link href="/shop" className="hover:text-white">{t('Sale')}</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">{t('Support')}</h4>
          <ul className="space-y-2 text-white/60">
            <li><a href="mailto:info@jabaib.com" className="hover:text-white">info@jabaib.com</a></li>
            <li><a href="tel:+8801000000000" className="hover:text-white">+880 1XXX-XXXXXX</a></li>
            <li><span className="cursor-default">{t('Dhaka, Bangladesh')}</span></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold text-white">{t('Account')}</h4>
          <ul className="space-y-2 text-white/60">
            <li><Link href="/user/login" className="hover:text-white">{t('Sign in')}</Link></li>
            <li><Link href="/user/register" className="hover:text-white">{t('Create account')}</Link></li>
            <li><Link href="/user/dashboard" className="hover:text-white">{t('My account')}</Link></li>
            <li><Link href="/user/dashboard?tab=orders" className="hover:text-white">{t('My orders')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-white/50">
          © {new Date().getFullYear()} Jabaib Clothing Brand. {t('All rights reserved.')}
        </p>
      </div>
    </footer>
  );
}