'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

export function PageSettingForm({ pageId }: { pageId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = pageId !== undefined;

  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [titleBN, setTitleBN] = useState('');
  const [content, setContent] = useState('');
  const [contentBN, setContentBN] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageId) {
      api.get<Record<string, any>>(`/v1/admin/page-settings/${pageId}`).then((p) => {
        setKey(p.key);
        setTitle(p.title);
        setTitleBN(p.titleBN ?? '');
        setContent(p.content ?? '');
        setContentBN(p.contentBN ?? '');
        setIsActive(p.isActive);
      });
    }
  }, [api, pageId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      key,
      title,
      titleBN: titleBN || undefined,
      content,
      contentBN: contentBN || undefined,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/page-settings/${pageId}`, payload);
      } else {
        await api.post('/v1/admin/page-settings', payload);
      }
      router.push('/admin/page-settings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit page' : 'Add page'}</h1>
        <Link href="/admin/page-settings" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Key *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={key} onChange={(e) => setKey(e.target.value)} placeholder="about_us" />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
          <label className="text-sm">Title *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm">Title (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={titleBN} onChange={(e) => setTitleBN(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">Content *
            <textarea className="mt-1 w-full rounded-md border border-input px-3 py-2" rows={8} required value={content} onChange={(e) => setContent(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">Content (BN)
            <textarea className="mt-1 w-full rounded-md border border-input px-3 py-2" rows={8} value={contentBN} onChange={(e) => setContentBN(e.target.value)} />
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update page' : 'Create page'}
        </button>
      </form>
    </div>
  );
}