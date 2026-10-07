'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/user-auth';
import { AuthShell, SocialLoginButtons } from '@/components/user/AuthShell';

export default function UserLoginPage() {
  const { login } = useUserAuth();
  const router = useRouter();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your email or phone to continue."
      footer={
        <>
          New to Jabaib?{' '}
          <Link href="/user/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email or phone">
          <input
            className="auth-input"
            required
            autoComplete="username"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            className="auth-input"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or continue with
        <span className="h-px flex-1 bg-border" />
      </div>
      <SocialLoginButtons />
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}