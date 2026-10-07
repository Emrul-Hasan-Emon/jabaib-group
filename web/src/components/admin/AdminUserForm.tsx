'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

const ROLES = ['super_admin', 'admin', 'editor'];

export function AdminUserForm({ adminUserId }: { adminUserId?: number }) {
  const { api, admin: me } = useAdminAuth();
  const router = useRouter();
  const isEdit = adminUserId !== undefined;
  const isSelf = isEdit && me?.id === adminUserId;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('editor');
  const [isActive, setIsActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminUserId) {
      api.get<Record<string, any>>(`/v1/admin/admin-user/${adminUserId}`).then((a) => {
        setName(a.name);
        setEmail(a.email);
        setRole(a.role);
        setIsActive(a.isActive);
        setImageUrl(a.imageUrl ?? '');
        setImagePath(a.imagePath ?? '');
      });
    }
  }, [api, adminUserId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload: Record<string, unknown> = { name, role, isActive };
    if (imageUrl) {
      payload.imageUrl = imageUrl;
      payload.imagePath = imagePath || undefined;
    }
    if (isEdit) {
      if (password) payload.password = password;
      try {
        await api.patch(`/v1/admin/admin-user/${adminUserId}`, payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
        return;
      }
    } else {
      payload.email = email;
      payload.password = password;
      try {
        await api.post('/v1/admin/admin-user', payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
        return;
      }
    }
    router.push('/admin/admin-users');
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit admin user' : 'Add admin user'}</h1>
        <Link href="/admin/admin-users" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4">
          <ImageUploadField
            label="Profile image"
            feature="admin"
            value={imageUrl}
            onChange={(url, path) => {
              setImageUrl(url);
              setImagePath(path);
            }}
            round
            hint="Square image works best. Visible in the admin user list."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">Role *
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf && me?.role !== 'super_admin'}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="text-sm">Email *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="email" required disabled={isEdit} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="text-sm">{isEdit ? 'New password (leave blank to keep)' : 'Password *'}
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="password" required={!isEdit} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? '••••••••' : 'Min 8 characters'} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update admin' : 'Create admin'}
        </button>
      </form>
    </div>
  );
}