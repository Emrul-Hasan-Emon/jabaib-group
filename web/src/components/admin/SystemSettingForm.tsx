'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

const GROUPS = ['general', 'contact', 'shipping', 'payment', 'social'];

export function SystemSettingForm({ settingId }: { settingId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = settingId !== undefined;

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBN, setDescriptionBN] = useState('');
  const [group, setGroup] = useState('general');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingId) {
      api.get<Record<string, any>>(`/v1/admin/system-setting/${settingId}`).then((s) => {
        setKey(s.key);
        setValue(s.value ?? '');
        setDescription(s.description ?? '');
        setDescriptionBN(s.descriptionBN ?? '');
        setGroup(s.group ?? 'general');
      });
    }
  }, [api, settingId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      key,
      value,
      description: description || undefined,
      descriptionBN: descriptionBN || undefined,
      group,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/system-setting/${settingId}`, payload);
      } else {
        await api.post('/v1/admin/system-setting', payload);
      }
      router.push('/admin/system-settings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit setting' : 'Add setting'}</h1>
        <Link href="/admin/system-settings" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Key *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={key} onChange={(e) => setKey(e.target.value)} placeholder="site_name" />
          </label>
          <label className="text-sm">Group
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={group} onChange={(e) => setGroup(e.target.value)}>
              {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="text-sm md:col-span-2">Value
            <textarea className="mt-1 w-full rounded-md border border-input px-3 py-2" rows={3} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Jabaib" />
          </label>
          <label className="text-sm">Description
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="text-sm">Description (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={descriptionBN} onChange={(e) => setDescriptionBN(e.target.value)} />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update setting' : 'Create setting'}
        </button>
      </form>
    </div>
  );
}