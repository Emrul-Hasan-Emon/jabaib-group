'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3x3, LayoutList, ShoppingBag, User } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { useLocale } from '@/lib/locale';
import { useUserAuth } from '@/lib/user-auth';

/**
 * App-style fixed bottom navigation on mobile. Cart tab shows the live bag
 * count; Account points to the dashboard when signed in.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const { t } = useLocale();
  const { count, openDrawer } = useCart();
  const { status } = useUserAuth();
  const authed = status === 'authed';

  const items = [
    { href: '/', label: t('Home'), icon: Home, exact: true },
    { href: '/categories', label: t('Categories'), icon: LayoutList },
    { href: '/shop', label: t('Shop'), icon: Grid3x3 },
    { href: authed ? '/user/dashboard' : '/user/login', label: t('Account'), icon: User },
  ];

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-5xl justify-around">
        {items.map((item) => {
          const isActive = active(item.href, item.exact);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium ${
                isActive ? 'text-primary' : 'text-nav-foreground'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={openDrawer}
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] font-medium ${
            // the cart lives in the drawer + /checkout (there is no /cart page)
            pathname === '/checkout' ? 'text-primary' : 'text-nav-foreground'
          }`}
        >
          <span className="relative">
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-badge-red px-1 text-[10px] font-bold text-badge-red-foreground">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </span>
          {t('Cart')}
        </button>
      </div>
    </nav>
  );
}