import Link from 'next/link';
import { Phone, Mail, MapPin } from 'lucide-react';

export function SiteHeader() {
  return (
    <header>
      <div className="bg-topbar text-xs text-topbar-foreground">
        <div className="mx-auto flex h-9 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <a href="tel:+8801000000000" className="flex items-center gap-1.5 hover:opacity-80">
              <Phone size={12} /> +880 1XXX-XXXXXX
            </a>
            <a href="mailto:info@jabaib.com" className="hidden items-center gap-1.5 hover:opacity-80 sm:flex">
              <Mail size={12} /> info@jabaib.com
            </a>
          </div>
          <span className="hidden items-center gap-1.5 md:flex">
            <MapPin size={12} /> Dhaka, Bangladesh
          </span>
        </div>
      </div>

      <div className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-extrabold text-primary">
            Jabaib
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-nav-foreground sm:flex">
            <Link href="/" className="hover:text-primary">Home</Link>
            <Link href="/user/login" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90">
              Account
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
