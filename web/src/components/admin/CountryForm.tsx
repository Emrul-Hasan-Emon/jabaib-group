'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

export function CountryForm({ countryId }: { countryId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = countryId !== undefined;

  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [currency, setCurrency] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countryId) {
      api.get<Record<string, any>>(`/v1/admin/country/${countryId}`).then((c) => {
        setName(c.name);
        setNameBN(c.nameBN ?? '');
        setSlug(c.slug ?? '');
        setCode(c.code ?? '');
        setCurrency(c.currency ?? '');
        setIsActive(c.isActive);
      });
    }
  }, [api, countryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      nameBN: nameBN || undefined,
      slug: slug || undefined,
      code: code || undefined,
      currency: currency || undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/country/${countryId}`, payload);
      } else {
        await api.post('/v1/admin/country', payload);
      }
      router.push('/admin/locations/countries');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit country' : 'Add country'}</h1>
        <Link href="/admin/locations/countries" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bangladesh" />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Slug (auto if blank)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="bangladesh" />
          </label>
          <label className="text-sm">Code
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)} placeholder="BD" />
          </label>
          <label className="text-sm">Currency
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="BDT" />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update country' : 'Create country'}
        </button>
      </form>
    </div>
  );
}