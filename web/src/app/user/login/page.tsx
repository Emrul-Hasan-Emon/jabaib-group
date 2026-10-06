'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/user-auth';

export default function UserLoginPage() {
  const { status, login } = useUserAuth();
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authed') router.replace('/user/dashboard');
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(emailOrPhone, password);
      router.replace('/user/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen">
      <div className="hidden flex-1 flex-col justify-between bg-topbar p-12 text-topbar-foreground md:flex">
        <h1 className="text-2xl font-extrabold">Jabaib</h1>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Your style,
            <br /> your account.
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70">
            Track orders, save wishlists and manage your delivery addresses.
          </p>
        </div>
        <p className="text-xs text-white/50">© Jabaib Clothing Brand</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-8">
        <form
          onSubmit={submit}
          className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm"
        >
          <h1 className="mb-1 text-xl font-bold text-foreground">
            Sign in to your account
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Welcome back — we missed you.
          </p>
          {error && (
            <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <label className="mb-4 block text-sm font-medium">
            Email or phone
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
            />
          </label>
          <label className="mb-6 block text-sm font-medium">
            Password
            <input
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            disabled={busy}
            className="w-full rounded-md bg-primary py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
