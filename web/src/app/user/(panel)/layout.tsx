'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserGuard } from '@/components/user/UserGuard';
import { useUserAuth } from '@/lib/user-auth';
import { LangToggle } from '@/components/common/LangToggle';
import { useLocale } from '@/lib/locale';
import { LogOut, User, MapPin, Package, Heart, Star } from 'lucide-react';

// Labels are bilingual like the rest of the panel: [english, bangla].
const TABS = [
  { href: '/user/dashboard', label: 'Profile', labelBN: 'প্রোফাইল', icon: User, exact: true },
  { href: '/user/addresses', label: 'Addresses', labelBN: 'ঠিকানা', icon: MapPin },
  { href: '/user/orders', label: 'Orders', labelBN: 'অর্ডার', icon: Package },
  { href: '/user/wishlist', label: 'Wishlist', labelBN: 'পছন্দের তালিকা', icon: Heart },
  { href: '/user/reviews', label: 'My Reviews', labelBN: 'আমার রিভিউ', icon: Star },
];

export default function UserPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useUserAuth();
  const { t } = useLocale();
  const pathname = usePathname();

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <UserGuard>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-primary">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
              J
            </span>
            Jabaib
          </Link>
          <div className="flex items-center gap-3">
            <LangToggle />
            <span className="hidden text-sm font-semibold text-foreground sm:block">
              {user?.name}
            </span>
            <div className="flex items-center gap-1">
              <Link
                href="/shop"
                className="hidden rounded-full border border-border px-3 py-1.5 text-xs font-medium text-nav-foreground transition hover:bg-muted sm:block"
              >
                {t('Back to shop', 'শপে ফিরুন')}
              </Link>
              <button
                onClick={logout}
                title={t('Logout', 'লগ আউট')}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">{t('Logout', 'লগ আউট')}</span>
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-3 sm:px-6 sm:py-6">
          {/* tabs */}
          <nav className="mb-3 flex gap-1 overflow-x-auto rounded-full border border-border bg-white p-1 sm:mb-6">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                  isActive(tab)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon size={15} />
                {t(tab.label, tab.labelBN)}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </UserGuard>
  );
}