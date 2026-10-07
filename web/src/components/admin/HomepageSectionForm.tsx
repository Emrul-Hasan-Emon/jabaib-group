'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';

const TYPES = ['products', 'categories', 'banners', 'custom'];
const DEFAULT_CONTENT = '{"limit":8,"sort":"newest"}';

const TYPE_HINTS: Record<string, string> = {
  products: '{"productIds":[1,2,3],"collectionIds":[1],"limit":8,"sort":"newest|featured"}',
  categories: '{"categoryIds":[1,2],"sort":"tree"}',
  banners: '{"limit":3}',
  custom: '{"html":"<div>...</div>"}',
};

export function HomepageSectionForm({ sectionId }: { sectionId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = sectionId !== undefined;

  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [titleBN, setTitleBN] = useState('');
  const [type, setType] = useState('products');
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sectionId) {
      api.get<Record<string, any>>(`/v1/admin/homepage-section/${sectionId}`).then((s) => {
        setKey(s.key);
        setTitle(s.title);
        setTitleBN(s.titleBN ?? '');
        setType(s.type);
        setContent(s.content ? JSON.stringify(s.content, null, 2) : '');
        setSortOrder(String(s.sortOrder ?? 0));
        setIsActive(s.isActive);
      });
    }
  }, [api, sectionId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let parsedContent: Record<string, unknown> | undefined;
    if (content.trim()) {
      try {
        parsedContent = JSON.parse(content);
      } catch {
        setError('Content must be valid JSON.');
        return;
      }
    }
    const payload = {
      key,
      title,
      titleBN: titleBN || undefined,
      type,
      content: parsedContent,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/homepage-section/${sectionId}`, payload);
      } else {
        await api.post('/v1/admin/homepage-section', payload);
      }
      router.push('/admin/homepage-sections');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit homepage section' : 'Add homepage section'}</h1>
        <Link href="/admin/homepage-sections" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Key *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={key} onChange={(e) => setKey(e.target.value)} placeholder="new-arrivals" />
          </label>
          <label className="text-sm">Type *
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="text-sm">Title *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm">Title (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={titleBN} onChange={(e) => setTitleBN(e.target.value)} />
          </label>
          <label className="text-sm">Sort order
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
          <label className="text-sm md:col-span-2">Content (JSON)
            <textarea
              className="mt-1 w-full rounded-md border border-input px-3 py-2 font-mono text-xs"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={TYPE_HINTS[type]}
            />
            <span className="mt-1 block text-xs text-muted-foreground">Example for {type}: {TYPE_HINTS[type]}</span>
          </label>
        </div>
        <button className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
          {isEdit ? 'Update section' : 'Create section'}
        </button>
      </form>
    </div>
  );
}