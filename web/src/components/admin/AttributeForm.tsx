'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

interface AttributeValue {
  id: number;
  name: string;
  nameBN: string | null;
  colorCode: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function AttributeForm({ attributeId }: { attributeId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = attributeId !== undefined;

  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionBN, setDescriptionBN] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [values, setValues] = useState<AttributeValue[]>([]);
  const [newValue, setNewValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadValues = useCallback(async () => {
    if (!attributeId) return;
    const vals = await api.get<AttributeValue[]>(`/v1/admin/attribute/${attributeId}/values`);
    setValues(vals);
  }, [api, attributeId]);

  useEffect(() => {
    if (attributeId) {
      api.get<Record<string, any>>(`/v1/admin/attribute/${attributeId}`).then((a) => {
        setName(a.name);
        setNameBN(a.nameBN ?? '');
        setDescription(a.description ?? '');
        setDescriptionBN(a.descriptionBN ?? '');
        setIsActive(a.isActive);
        setValues(a.values ?? []);
      });
    }
  }, [api, attributeId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      nameBN: nameBN || undefined,
      description: description || undefined,
      descriptionBN: descriptionBN || undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/attribute/${attributeId}`, payload);
        router.push('/admin/attributes');
      } else {
        await api.post('/v1/admin/attribute', payload);
        router.push('/admin/attributes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const addValue = async () => {
    if (!attributeId || !newValue.trim()) return;
    try {
      await api.post(`/v1/admin/attribute/${attributeId}/values`, { name: newValue.trim() });
      setNewValue('');
      await loadValues();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const removeValue = async (id: number) => {
    await api.del(`/v1/admin/attribute-value/${id}`);
    await loadValues();
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit attribute' : 'Add attribute'}</h1>
        <Link href="/admin/attributes" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={submit} className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Description
            <textarea rows={2} className="mt-1 w-full rounded-md border border-input px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="text-sm">Description (BN)
            <textarea rows={2} className="mt-1 w-full rounded-md border border-input px-3 py-2" value={descriptionBN} onChange={(e) => setDescriptionBN(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update attribute' : 'Create attribute'}
        </button>
      </form>

      {isEdit && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Values</h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {values.map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                {v.colorCode && <span className="h-2.5 w-2.5 rounded-full" style={{ background: v.colorCode }} />}
                {v.name}
                <button onClick={() => removeValue(v.id)} className="ml-1 text-red-500">×</button>
              </span>
            ))}
            {values.length === 0 && <span className="text-sm text-muted-foreground">No values yet.</span>}
          </div>
          <div className="flex gap-2">
            <input placeholder="New value, e.g. XL" className="rounded-md border border-input px-3 py-2 text-sm" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            <button onClick={addValue} className="rounded-md border border-border px-3 py-2 text-sm">Add value</button>
          </div>
        </div>
      )}
    </div>
  );
}
