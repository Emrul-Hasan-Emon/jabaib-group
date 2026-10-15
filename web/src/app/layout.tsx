import type { Metadata } from 'next';
import { LocaleProvider } from '@/lib/locale';
import { CartProvider } from '@/lib/cart';
import { UserAuthProvider } from '@/lib/user-auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jabaib Clothing Brand',
  description: 'Jabaib ecommerce — shop, manage and grow.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <LocaleProvider>
          {/* UserAuthProvider wraps the cart: signed-in carts live server-side. */}
          <UserAuthProvider>
            <CartProvider>{children}</CartProvider>
          </UserAuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}