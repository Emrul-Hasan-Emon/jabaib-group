'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';

interface AdminRow {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  imageUrl?: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-primary/10 text-primary',
  admin: 'bg-badge-orange/10 text-badge-orange',
  editor: 'bg-muted text-muted-foreground',
};

export default function AdminUsersPage() {
  const { api, admin: me } = useAdminAuth();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ data: AdminRow[] }>('/v1/admin/admin-user?page=0&size=100');
    setRows(res.data);
  }, [api]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  if (me?.role !== 'super_admin') {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">Admin Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only super admins can manage admin accounts.
        </p>
      </div>
    );
  }

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await api.del(`/v1/admin/admin-user/${deleteTarget.id}`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <Link href="/admin/admin-users/new" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          Add admin
        </Link>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Team members who can sign in to the admin panel. Roles: super_admin, admin, editor.
      </p>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-3">
                    {a.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.imageUrl} alt={a.name} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                        {a.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium">
                      {a.name}
                      {a.id === me?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground">{a.email}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[a.role] ?? 'bg-muted'}`}>{a.role}</span>
                </td>
                <td className="px-4 py-2">{a.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/admin-users/${a.id}`} className="mr-3 text-primary">Edit</Link>
                  <button onClick={() => setDeleteTarget(a)} className="text-red-600" disabled={a.id === me?.id}>Delete</button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No admin users yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete admin user"
        message={`Delete admin "${deleteTarget?.name}" (${deleteTarget?.email})? This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={remove}
      />
    </div>
  );
}