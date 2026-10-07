'use client';

import { useState } from 'react';
import { useUserAuth } from '@/lib/user-auth';
import { useLocale } from '@/lib/locale';

export default function UserDashboardPage() {
  const { user, api } = useUserAuth();
  const { t } = useLocale();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      await api.patch('/v1/user/auth/profile', { name, phone });
      setProfileMsg({ ok: true, text: 'Profile updated' });
    } catch (err) {
      setProfileMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Update failed',
      });
    } finally {
      setProfileBusy(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match' });
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    try {
      await api.post('/v1/user/auth/change-password', {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: 'Password changed successfully' });
    } catch (err) {
      setPwMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Change failed',
      });
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold text-foreground">
        {t('My profile')}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {t('Keep your details up to date for smooth deliveries.')}
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {/* profile info */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-bold text-foreground">{t('Profile details')}</h2>
          <div className="mb-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
              Email: {user?.email ?? '—'}
            </span>
            <span className="rounded-full bg-muted px-3 py-1 font-medium text-muted-foreground">
              {t('Member since')}:{' '}
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </span>
          </div>
          <form onSubmit={saveProfile} className="space-y-3.5">
            <label className="block text-sm font-medium text-foreground">
              {t('Full name')}
              <input
                required
                className="auth-input mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('Phone')}
              <input
                className="auth-input mt-1"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {profileMsg && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  profileMsg.ok
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {profileMsg.text}
              </p>
            )}
            <button
              disabled={profileBusy}
              className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {profileBusy ? t('Saving…') : t('Save changes')}
            </button>
          </form>
        </section>

        {/* change password */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 font-bold text-foreground">{t('Change password')}</h2>
          <form onSubmit={changePassword} className="space-y-3.5">
            <label className="block text-sm font-medium text-foreground">
              {t('Current password')}
              <input
                className="auth-input mt-1"
                type="password"
                required
                autoComplete="current-password"
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('New password')}
              <input
                className="auth-input mt-1"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={pw.next}
                onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('Confirm new password')}
              <input
                className="auth-input mt-1"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={pw.confirm}
                onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              />
            </label>
            {pwMsg && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  pwMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {pwMsg.text}
              </p>
            )}
            <button
              disabled={pwBusy}
              className="w-full rounded-full border border-primary bg-white py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              {pwBusy ? t('Updating…') : t('Update password')}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}