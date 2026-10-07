'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

interface CountryOption {
  id: number;
  name: string;
}

export function DivisionForm({ divisionId }: { divisionId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = divisionId !== undefined;

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [slug, setSlug] = useState('');
  const [countryId, setCountryId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: CountryOption[] }>('/v1/admin/country?page=0&size=100').then((res) => {
      setCountries(res.data);
    });
    if (divisionId) {
      api.get<Record<string, any>>(`/v1/admin/division/${divisionId}`).then((d) => {
        setName(d.name);
        setNameBN(d.nameBN ?? '');
        setSlug(d.slug ?? '');
        setCountryId(String(d.countryId));
        setIsActive(d.isActive);
      });
    }
  }, [api, divisionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      nameBN: nameBN || undefined,
      slug: slug || undefined,
      countryId: Number(countryId),
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/division/${divisionId}`, payload);
      } else {
        await api.post('/v1/admin/division', payload);
      }
      router.push('/admin/locations/divisions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit division' : 'Add division'}</h1>
        <Link href="/admin/locations/divisions" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Country *
            <select required className="mt-1 w-full rounded-md border border-input px-3 py-2" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
              <option value="">Select country…</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Dhaka" />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Slug (auto if blank)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="dhaka" />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update division' : 'Create division'}
        </button>
      </form>
    </div>
  );
}