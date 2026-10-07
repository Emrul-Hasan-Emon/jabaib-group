'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DetailsModal } from '@/components/admin/DetailsModal';

interface AttributeValue {
  id: number;
  name: string;
  nameBN: string | null;
  colorCode: string | null;
}

interface Attribute {
  id: number;
  name: string;
  nameBN: string | null;
  slug: string;
  description: string | null;
  descriptionBN: string | null;
  isActive: boolean;
  values: AttributeValue[];
}

export default function AttributesPage() {
  const { api } = useAdminAuth();
  const [rows, setRows] = useState<Attribute[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<Attribute | null>(null);
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [valueName, setValueName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: '0', size: '100' });
    if (q) params.set('q', q);
    if (isActive) params.set('isActive', isActive);
    if (valueName) params.set('valueName', valueName);
    const res = await api.get<{ data: Attribute[] }>(`/v1/admin/attribute?${params}`);
    setRows(res.data);
  }, [api, q, isActive, valueName]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/attribute/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attributes</h1>
        <Link href="/admin/attributes/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add attribute
        </Link>
      </div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <input placeholder="Search attribute name…" className="rounded-md border border-input px-3 py-2 text-sm" value={q} onChange={(e) => setQ(e.target.value)} />
        <input placeholder="Search value name…" className="rounded-md border border-input px-3 py-2 text-sm" value={valueName} onChange={(e) => setValueName(e.target.value)} />
        <select className="rounded-md border border-input px-3 py-2 text-sm" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
          <option value="">All active states</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Slug</th>
              <th className="px-4 py-2">Values</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{a.name}{a.nameBN ? ` · ${a.nameBN}` : ''}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.slug}</td>
                <td className="px-4 py-2">{a.values?.map((v) => v.name).join(', ') || '—'}</td>
                <td className="px-4 py-2">{a.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setDetailsTarget(a)} className="mr-3 text-muted-foreground">Details</button>
                  <Link href={`/admin/attributes/${a.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(a)} className="text-red-600">Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No attributes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal
        open={detailsTarget !== null}
        title={detailsTarget?.name ?? ''}
        onClose={() => setDetailsTarget(null)}
        rows={detailsTarget ? [
          { label: 'Name', value: detailsTarget.name },
          { label: 'Name (BN)', value: detailsTarget.nameBN },
          { label: 'Slug', value: detailsTarget.slug },
          { label: 'Description', value: detailsTarget.description },
          { label: 'Values', value: detailsTarget.values?.map((v) => v.name).join(', ') },
          { label: 'Active', value: detailsTarget.isActive ? 'Yes' : 'No' },
        ] : []}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete attribute"
        message={`Delete "${deleteTarget?.name}"? Its values will also be removed.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}
