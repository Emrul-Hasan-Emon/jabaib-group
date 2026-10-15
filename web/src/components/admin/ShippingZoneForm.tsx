'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

const CODES = ['inside_dhaka', 'outside_dhaka'];

export function ShippingZoneForm({ zoneId }: { zoneId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = zoneId !== undefined;

  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [code, setCode] = useState('inside_dhaka');
  const [charge, setCharge] = useState('');
  const [estimatedDays, setEstimatedDays] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (zoneId) {
      api.get<Record<string, any>>(`/v1/admin/shipping-zone/${zoneId}`).then((z) => {
        setName(z.name);
        setNameBN(z.nameBN ?? '');
        setCode(z.code);
        setCharge(String(z.charge));
        setEstimatedDays(z.estimatedDays != null ? String(z.estimatedDays) : '');
        setIsActive(z.isActive);
      });
    }
  }, [api, zoneId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      nameBN: nameBN || undefined,
      code,
      charge: Number(charge) || 0,
      estimatedDays: estimatedDays ? Number(estimatedDays) : undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/shipping-zone/${zoneId}`, payload);
      } else {
        await api.post('/v1/admin/shipping-zone', payload);
      }
      router.push('/admin/shipping-zones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit shipping zone' : 'Add shipping zone'}</h1>
        <Link href="/admin/shipping-zones" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Inside Dhaka" />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Code *
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={code} onChange={(e) => setCode(e.target.value)}>
              {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm">Charge (BDT) *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" required value={charge} onChange={(e) => setCharge(e.target.value)} />
          </label>
          <label className="text-sm">Estimated days
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" value={estimatedDays} onChange={(e) => setEstimatedDays(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update zone' : 'Create zone'}
        </button>
      </form>
    </div>
  );
}