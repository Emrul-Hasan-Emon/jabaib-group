'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/user-auth';
import { nextPath } from '@/lib/next-path';
import { LangToggle } from '@/components/common/LangToggle';

/**
 * Two-column auth layout (dark brand panel + form card) shared by login and
 * register. Redirects already-authed customers to the dashboard.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const { status } = useUserAuth();
  const router = useRouter();

  useEffect(() => {
    // Safety net for an already-signed-in visitor hitting /login or /register.
    // It must honour ?next= so it doesn't race the page's own post-submit
    // redirect (which would drop the visitor on the dashboard mid-checkout).
    if (status === 'authed') router.replace(nextPath());
  }, [status, router]);

  return (
    <main className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden bg-topbar p-12 text-topbar-foreground lg:flex">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground">
                J
              </span>
              Jabaib
            </Link>
            <LangToggle onDark />
          </div>
          <div className="max-w-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">
              Clothing brand
            </p>
            <h2 className="text-4xl font-bold leading-tight">
              Premium everyday wear,
              <br />
              <span className="text-accent">made in Bangladesh.</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/60">
              One account for orders, delivery addresses, wishlists and
              exclusive drops.
            </p>
          </div>
          <div className="flex gap-6 text-xs text-white/40">
            <span>Cash on delivery</span>
            <span>7-day returns</span>
            <span>Nationwide delivery</span>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-sm">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link href="/" className="text-xl font-extrabold text-primary">
                Jabaib
              </Link>
              <LangToggle />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">{title}</h1>
            <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
            {children}
            <div className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Social login buttons — OAuth providers land in the auth phase. */
export function SocialLoginButtons() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => alert('Google sign-in arrives with the OAuth phase.')}
        className="flex items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        <GoogleIcon />
        Google
      </button>
      <button
        type="button"
        onClick={() => alert('Facebook sign-in arrives with the OAuth phase.')}
        className="flex items-center justify-center gap-2 rounded-full border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        <FacebookIcon />
        Facebook
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  );
}