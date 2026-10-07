'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

interface CountryOption {
  id: number;
  name: string;
}
interface DivisionOption {
  id: number;
  name: string;
}

export function DistrictForm({ districtId }: { districtId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = districtId !== undefined;

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [slug, setSlug] = useState('');
  const [countryId, setCountryId] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: CountryOption[] }>('/v1/admin/country?page=0&size=100').then((res) => {
      setCountries(res.data);
    });
    if (districtId) {
      api.get<Record<string, any>>(`/v1/admin/district/${districtId}`).then((d) => {
        setName(d.name);
        setNameBN(d.nameBN ?? '');
        setSlug(d.slug ?? '');
        setCountryId(String(d.countryId));
        setDivisionId(String(d.divisionId));
        return api
          .get<{ data: DivisionOption[] }>(
            `/v1/admin/division?page=0&size=100&countryId=${d.countryId}`,
          )
          .then((res) => setDivisions(res.data));
      });
    }
  }, [api, districtId]);

  const loadDivisions = async (cid: string) => {
    setCountryId(cid);
    setDivisionId('');
    if (cid) {
      const res = await api.get<{ data: DivisionOption[] }>(
        `/v1/admin/division?page=0&size=100&countryId=${cid}`,
      );
      setDivisions(res.data);
    } else {
      setDivisions([]);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      nameBN: nameBN || undefined,
      slug: slug || undefined,
      countryId: Number(countryId),
      divisionId: Number(divisionId),
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/district/${districtId}`, payload);
      } else {
        await api.post('/v1/admin/district', payload);
      }
      router.push('/admin/locations/districts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit district' : 'Add district'}</h1>
        <Link href="/admin/locations/districts" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Country *
            <select required className="mt-1 w-full rounded-md border border-input px-3 py-2" value={countryId} onChange={(e) => loadDivisions(e.target.value)}>
              <option value="">Select country…</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Division *
            <select required className="mt-1 w-full rounded-md border border-input px-3 py-2" value={divisionId} onChange={(e) => setDivisionId(e.target.value)} disabled={!countryId}>
              <option value="">Select division…</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Gulshan" />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Slug (auto if blank)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="gulshan" />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update district' : 'Create district'}
        </button>
      </form>
    </div>
  );
}