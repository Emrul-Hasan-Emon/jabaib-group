import { SiteHeader } from '@/components/common/SiteHeader';
import { SiteFooter } from '@/components/common/SiteFooter';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { WishlistProvider } from '@/lib/wishlist';

export default function CommonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WishlistProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <SiteFooter />
        <MobileBottomNav />
        <CartDrawer />
      </div>
    </WishlistProvider>
  );
}