'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserAuth } from '@/lib/user-auth';
import { AuthShell, SocialLoginButtons } from '@/components/user/AuthShell';

export default function UserRegisterPage() {
  const { register } = useUserAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
      });
      router.replace('/user/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join Jabaib for faster checkout and order tracking."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/user/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <form onSubmit={submit} className="space-y-3.5">
        <Field label="Full name">
          <input className="auth-input" required value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Phone">
            <input
              className="auth-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={form.phone}
              onChange={set('phone')}
            />
          </Field>
          <Field label="Email (optional)">
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
            />
          </Field>
        </div>
        <Field label="Password">
          <input
            className="auth-input"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
          />
        </Field>
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to Jabaib&apos;s terms and privacy policy.
        </p>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or sign up with
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