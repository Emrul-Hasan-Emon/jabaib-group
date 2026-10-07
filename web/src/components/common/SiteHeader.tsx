'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Phone,
  Mail,
  Search,
  ShoppingBag,
  ChevronDown,
  Menu,
  User,
} from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { useCart } from '@/lib/cart';
import { useUserAuth } from '@/lib/user-auth';
import { storefront, type CategoryNode } from '@/lib/storefront';
import { LangToggle } from './LangToggle';

/**
 * Storefront header: top utility bar, search, category dropdown, account +
 * cart actions. Switches to an app-style compact bar on mobile.
 */
export function SiteHeader() {
  const { t } = useLocale();
  const { count, openDrawer } = useCart();
  const { status } = useUserAuth();
  const authed = status === 'authed';
  const router = useRouter();
  const [q, setQ] = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);
  const [tree, setTree] = useState<CategoryNode[] | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const catTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!catOpen && !tree) {
      storefront
        .categoryTree()
        .then(setTree)
        .catch(() => setTree([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
    setMobileSearch(false);
    setQ('');
  };

  const enterCat = () => {
    if (catTimer.current) clearTimeout(catTimer.current);
    setCatOpen(true);
  };
  const leaveCat = () => {
    if (catTimer.current) clearTimeout(catTimer.current);
    catTimer.current = setTimeout(() => setCatOpen(false), 150);
  };

  return (
    <header className="sticky top-0 z-40">
      {/* top utility bar */}
      <div className="bg-topbar text-[11px] text-topbar-foreground">
        <div className="mx-auto hidden h-9 max-w-6xl items-center justify-between gap-3 px-4 sm:flex">
          <div className="flex min-w-0 items-center gap-4">
            <a
              href="tel:+8801000000000"
              className="flex shrink-0 items-center gap-1.5 hover:opacity-80"
            >
              <Phone size={11} /> +880 1XXX-XXXXXX
            </a>
            <a
              href="mailto:info@jabaib.com"
              className="hidden items-center gap-1.5 hover:opacity-80 sm:flex"
            >
              <Mail size={11} /> info@jabaib.com
            </a>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-white/60 md:inline">
              {t('Free delivery on orders over ৳2,000')}
            </span>
            <LangToggle onDark />
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:h-16">
          <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-primary">
            Jabaib
          </Link>

          {/* desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 text-sm font-medium text-nav-foreground lg:flex">
            <Link href="/" className="rounded-md px-3 py-2 hover:text-primary">
              {t('Home')}
            </Link>
            <Link href="/shop" className="rounded-md px-3 py-2 hover:text-primary">
              {t('Shop')}
            </Link>
            <div
              className="relative"
              onMouseEnter={enterCat}
              onMouseLeave={leaveCat}
            >
              <button
                className="flex items-center gap-1 rounded-md px-3 py-2 hover:text-primary"
                onClick={() => setCatOpen((v) => !v)}
              >
                {t('Categories')} <ChevronDown size={14} />
              </button>
              {catOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-card p-2 shadow-xl"
                  onMouseEnter={enterCat}
                  onMouseLeave={leaveCat}
                >
                  {tree?.length ? (
                    <ul className="max-h-96 overflow-y-auto">
                      <li className="border-b border-border pb-1">
                        <Link
                          href="/categories"
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-bold text-primary hover:bg-muted"
                          onClick={() => setCatOpen(false)}
                        >
                          {t('All categories')}
                          <ChevronDown size={12} className="rotate-[-90deg]" />
                        </Link>
                      </li>
                      {tree.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/shop?categoryId=${c.id}`}
                            className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                            onClick={() => setCatOpen(false)}
                          >
                            <span>{t(c.name, c.nameBN)}</span>
                            {c.childrenNodes && c.childrenNodes.length > 0 && (
                              <ChevronDown size={12} className="rotate-[-90deg] text-muted-foreground" />
                            )}
                          </Link>
                          {c.childrenNodes && c.childrenNodes.length > 0 && (
                            <ul className="ml-3 border-l border-border pl-2">
                              {c.childrenNodes.map((child) => (
                                <li key={child.id}>
                                  <Link
                                    href={`/shop?categoryId=${child.id}`}
                                    className="block rounded-md px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
                                    onClick={() => setCatOpen(false)}
                                  >
                                    {t(child.name, child.nameBN)}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {t('Loading categories…')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </nav>

          {/* desktop search */}
          <form
            onSubmit={submitSearch}
            className="ml-auto hidden max-w-md flex-1 lg:block"
          >
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Search products…')}
                className="w-full rounded-full border border-input bg-muted/40 py-1.5 pl-8 pr-3 text-[13px] outline-none transition focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/40 sm:py-2 sm:pl-9 sm:pr-4 sm:text-sm"
              />
            </div>
          </form>

          {/* actions */}
          <div className="ml-auto flex items-center gap-1 lg:ml-3">
            <button
              onClick={() => setMobileSearch((v) => !v)}
              aria-label={t('Search')}
              className="rounded-full p-2.5 text-nav-foreground transition hover:bg-muted lg:hidden"
            >
              <Search size={20} />
            </button>
            <Link
              href={authed ? '/user/dashboard' : '/user/login'}
              aria-label={t('Account')}
              className="hidden rounded-full p-2.5 text-nav-foreground transition hover:bg-muted sm:flex"
            >
              <User size={20} />
            </Link>
            <button
              onClick={openDrawer}
              aria-label={t('Cart')}
              className="relative rounded-full p-2.5 text-nav-foreground transition hover:bg-muted"
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-badge-red px-1 text-[10px] font-bold text-badge-red-foreground">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
            <span className="hidden h-8 w-px bg-border md:block" />
            <Link
              href={authed ? '/user/dashboard' : '/user/login'}
              className="hidden rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 md:block"
            >
              {authed ? t('Account') : t('Sign in')}
            </Link>
            <button
              aria-label={t('Menu')}
              className="rounded-full p-2.5 text-nav-foreground hover:bg-muted lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* mobile search row */}
        {mobileSearch && (
          <form onSubmit={submitSearch} className="border-t border-border bg-card px-4 py-3 lg:hidden">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Search products…')}
                className="w-full rounded-full border border-input bg-muted/40 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-ring"
              />
            </div>
          </form>
        )}
      </div>
    </header>
  );
}