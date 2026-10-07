'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

export function LanguageForm({ languageId }: { languageId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = languageId !== undefined;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (languageId) {
      api.get<Record<string, any>>(`/v1/admin/language/${languageId}`).then((l) => {
        setName(l.name);
        setCode(l.code);
        setIsDefault(l.isDefault);
        setIsActive(l.isActive);
      });
    }
  }, [api, languageId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { name, code, isDefault, isActive };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/language/${languageId}`, payload);
      } else {
        await api.post('/v1/admin/language', payload);
      }
      router.push('/admin/languages');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit language' : 'Add language'}</h1>
        <Link href="/admin/languages" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} placeholder="English" />
          </label>
          <label className="text-sm">Code *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="en" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Default language
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        {isDefault && <p className="mt-2 text-xs text-amber-600">Setting this as default will unset the current default.</p>}
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update language' : 'Create language'}
        </button>
      </form>
    </div>
  );
}