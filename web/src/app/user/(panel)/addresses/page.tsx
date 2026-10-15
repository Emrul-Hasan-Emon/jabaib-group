'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, MapPin, Star } from 'lucide-react';
import { useUserAuth } from '@/lib/user-auth';
import { useLocale } from '@/lib/locale';
import { storefront, type LocationCountry } from '@/lib/storefront';

interface Address {
  id: number;
  recipientName: string;
  phone: string;
  address: string;
  divisionId: number | null;
  districtId: number | null;
  zipCode: string | null;
  type: string;
  isDefault: boolean;
  division?: { id: number; name: string; nameBN: string | null } | null;
  district?: { id: number; name: string; nameBN: string | null } | null;
}

const EMPTY_FORM = {
  recipientName: '',
  phone: '',
  address: '',
  divisionId: '',
  districtId: '',
  zipCode: '',
  isDefault: false,
};

export default function UserAddressesPage() {
  const { api } = useUserAuth();
  const { t } = useLocale();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationCountry[]>([]);
  const [editing, setEditing] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.get<Address[]>('/v1/user/address');
      setAddresses(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
    storefront.locationTree().then(setLocations).catch(() => setLocations([]));
  }, [refresh]);

  const divisions = useMemo(() => {
    const country = locations[0]; // BD is the single active country in the seed
    return country?.divisions ?? [];
  }, [locations]);

  const districts = useMemo(() => {
    const div = divisions.find((d) => d.id === Number(form.divisionId));
    return div?.districts ?? [];
  }, [divisions, form.divisionId]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    setForm({
      recipientName: a.recipientName,
      phone: a.phone,
      address: a.address,
      divisionId: a.divisionId ? String(a.divisionId) : '',
      districtId: a.districtId ? String(a.districtId) : '',
      zipCode: a.zipCode ?? '',
      isDefault: a.isDefault,
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      recipientName: form.recipientName,
      phone: form.phone,
      address: form.address,
      divisionId: form.divisionId ? Number(form.divisionId) : undefined,
      districtId: form.districtId ? Number(form.districtId) : undefined,
      zipCode: form.zipCode || undefined,
      isDefault: form.isDefault,
    };
    try {
      if (editing) {
        await api.patch(`/v1/user/address/${editing.id}`, payload);
      } else {
        await api.post('/v1/user/address', payload);
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const setDefault = async (id: number) => {
    try {
      await api.post(`/v1/user/address/${id}/default`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.del(`/v1/user/address/${id}`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-6 sm:gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">{t('My addresses')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Delivery destinations for your orders.')}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus size={15} /> {t('Add address')}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-2.5 sm:gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center sm:py-16">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <MapPin size={22} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">{t('No saved addresses yet')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {t('Add your first delivery address to speed up checkout.')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <article
              key={a.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 font-bold text-foreground">
                  {a.recipientName}
                  {a.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      <Star size={9} /> Default
                    </span>
                  )}
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {t('Edit')}
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    aria-label="Delete"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{a.phone}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {a.address}
                {a.division && <span> · {a.division.name}</span>}
                {a.district && <span>, {a.district.name}</span>}
                {a.zipCode && <span> — {a.zipCode}</span>}
              </p>
              {!a.isDefault && (
                <button
                  onClick={() => setDefault(a.id)}
                  className="mt-4 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-primary transition hover:border-primary"
                >
                  {t('Set as default')}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {/* add / edit form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="mt-6 rounded-2xl border border-border bg-card p-6"
        >
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {editing ? t('Edit address') : t('Add a new address')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-foreground">
              {t('Recipient name')}
              <input
                required
                className="auth-input mt-1"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('Phone')}
              <input
                required
                type="tel"
                className="auth-input mt-1"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-foreground sm:col-span-2">
              {t('Street address')}
              <textarea
                required
                rows={2}
                className="auth-input mt-1 resize-none"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('Division')}
              <select
                className="auth-input mt-1"
                value={form.divisionId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, divisionId: e.target.value, districtId: '' }))
                }
              >
                <option value="">{t('Select division…')}</option>
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t(d.name, d.nameBN)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('District')}
              <select
                className="auth-input mt-1"
                value={form.districtId}
                disabled={!form.divisionId}
                onChange={(e) => setForm((f) => ({ ...f, districtId: e.target.value }))}
              >
                <option value="">
                  {form.divisionId ? t('Select district…') : t('Choose division first')}
                </option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t(d.name, d.nameBN)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('Postcode')}
              <input
                className="auth-input mt-1"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
              />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              {t('Set as default address')}
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? t('Saving…') : editing ? t('Save changes') : t('Add address')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t('Cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}