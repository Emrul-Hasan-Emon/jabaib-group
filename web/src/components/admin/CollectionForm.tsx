'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

export function CollectionForm({ collectionId }: { collectionId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = collectionId !== undefined;

  const [name, setName] = useState('');
  const [nameBN, setNameBN] = useState('');
  const [colorCode, setColorCode] = useState('#111111');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (collectionId) {
      api.get<Record<string, any>>(`/v1/admin/collection/${collectionId}`).then((l) => {
        setName(l.name);
        setNameBN(l.nameBN ?? '');
        setColorCode(l.colorCode ?? '#111111');
        setIsActive(l.isActive);
      });
    }
  }, [api, collectionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = { name, nameBN: nameBN || undefined, colorCode, isActive };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/collection/${collectionId}`, payload);
      } else {
        await api.post('/v1/admin/collection', payload);
      }
      router.push('/admin/collections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit collection' : 'Add collection'}</h1>
        <Link href="/admin/collections" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Name *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">Name (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={nameBN} onChange={(e) => setNameBN(e.target.value)} />
          </label>
          <label className="text-sm">Color
            <div className="mt-1 flex items-center gap-2">
              <input type="color" className="h-10 w-16 rounded-md border border-input" value={colorCode} onChange={(e) => setColorCode(e.target.value)} />
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium" style={{ color: '#fff', background: colorCode }}>
                {name || 'Preview'}
              </span>
            </div>
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update collection' : 'Create collection'}
        </button>
      </form>
    </div>
  );
}