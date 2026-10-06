'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Grid3x3, ShoppingBag, User } from 'lucide-react';

/**
 * App-style fixed bottom navigation on mobile (mirrors the reference
 * project's MobileBottomNav). Hidden on md+ where the full header shows.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/#categories', label: 'Categories', icon: Grid3x3 },
    { href: '/user/login', label: 'Orders', icon: ShoppingBag },
    { href: '/user/login', label: 'Account', icon: User },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="mx-auto flex max-w-5xl justify-around">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 text-[11px] font-medium ${
                active ? 'text-primary' : 'text-nav-foreground'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
