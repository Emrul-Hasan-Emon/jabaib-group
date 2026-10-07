'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

export function CouponForm({ couponId }: { couponId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = couponId !== undefined;

  const [code, setCode] = useState('');
  const [type, setType] = useState<'flat' | 'percent'>('percent');
  const [amount, setAmount] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [perUserLimit, setPerUserLimit] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (couponId) {
      api.get<Record<string, any>>(`/v1/admin/coupon/${couponId}`).then((c) => {
        setCode(c.code);
        setType(c.type);
        setAmount(String(c.amount));
        setMinOrderAmount(c.minOrderAmount ? String(c.minOrderAmount) : '');
        setMaxDiscountAmount(c.maxDiscountAmount != null ? String(c.maxDiscountAmount) : '');
        setUsageLimit(c.usageLimit ? String(c.usageLimit) : '');
        setPerUserLimit(c.perUserLimit ? String(c.perUserLimit) : '');
        setStartsAt(c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : '');
        setEndsAt(c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : '');
        setIsActive(c.isActive);
      });
    }
  }, [api, couponId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      code,
      type,
      amount: Number(amount),
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : 0,
      perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/coupon/${couponId}`, payload);
      } else {
        await api.post('/v1/admin/coupon', payload);
      }
      router.push('/admin/coupons');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const num = (v: string) => v.trim() !== '' ? Number(v) : undefined;
  const warnIfInactive = !isActive;

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit coupon' : 'Add coupon'}</h1>
        <Link href="/admin/coupons" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Code *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2 uppercase" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="WELCOME10" />
          </label>
          <label className="text-sm">Type *
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={type} onChange={(e) => setType(e.target.value as 'flat' | 'percent')}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (BDT)</option>
            </select>
          </label>
          <label className="text-sm">{type === 'percent' ? 'Percent off *' : 'Flat amount off (BDT) *'}
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-sm">Min order total (BDT)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" step="0.01" value={minOrderAmount} onChange={(e) => setMinOrderAmount(e.target.value)} placeholder="0" />
          </label>
          {type === 'percent' && (
            <label className="text-sm">Max discount (BDT)
              <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" step="0.01" value={maxDiscountAmount} onChange={(e) => setMaxDiscountAmount(e.target.value)} placeholder="Unlimited" />
            </label>
          )}
          <label className="text-sm">Usage limit (0 = unlimited)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} placeholder="0" />
          </label>
          <label className="text-sm">Per-user limit
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="1" value={perUserLimit} onChange={(e) => setPerUserLimit(e.target.value)} placeholder="1" />
          </label>
          <label className="text-sm">Starts at
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="text-sm">Ends at
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        {warnIfInactive && <p className="mt-3 text-xs text-amber-600">Inactive coupons cannot be applied in checkout.</p>}
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update coupon' : 'Create coupon'}
        </button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Tip: {num(minOrderAmount) ? `Minimum spend ${num(minOrderAmount)} BDT. ` : ''}Coupon codes are case-insensitive and stored uppercase.</p>
    </div>
  );
}