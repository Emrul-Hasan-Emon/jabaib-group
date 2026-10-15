'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/admin-auth';
import { ImageUploadField } from '@/components/admin/ImageUploadField';

const POSITIONS = ['hero', 'side', 'popup'];

export function BannerForm({ bannerId }: { bannerId?: number }) {
  const { api } = useAdminAuth();
  const router = useRouter();
  const isEdit = bannerId !== undefined;

  const [title, setTitle] = useState('');
  const [titleBN, setTitleBN] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [mobileImagePath, setMobileImagePath] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [position, setPosition] = useState('hero');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bannerId) {
      api.get<Record<string, any>>(`/v1/admin/banner/${bannerId}`).then((b) => {
        setTitle(b.title);
        setTitleBN(b.titleBN ?? '');
        setImageUrl(b.imageUrl ?? '');
        setImagePath(b.imagePath ?? '');
        setMobileImageUrl(b.mobileImageUrl ?? '');
        setMobileImagePath(b.mobileImagePath ?? '');
        setLinkUrl(b.linkUrl ?? '');
        setPosition(b.position ?? 'hero');
        setStartsAt(b.startsAt ? new Date(b.startsAt).toISOString().slice(0, 16) : '');
        setEndsAt(b.endsAt ? new Date(b.endsAt).toISOString().slice(0, 16) : '');
        setSortOrder(String(b.sortOrder ?? 0));
        setIsActive(b.isActive);
      });
    }
  }, [api, bannerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      title,
      titleBN: titleBN || undefined,
      imageUrl,
      imagePath: imagePath || undefined,
      mobileImageUrl: mobileImageUrl || undefined,
      mobileImagePath: mobileImagePath || undefined,
      linkUrl: linkUrl || undefined,
      position,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      sortOrder: Number(sortOrder) || 0,
      isActive,
    };
    try {
      if (isEdit) {
        await api.patch(`/v1/admin/banner/${bannerId}`, payload);
      } else {
        await api.post('/v1/admin/banner', payload);
      }
      router.push('/admin/banners');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit banner' : 'Add banner'}</h1>
        <Link href="/admin/banners" className="text-sm text-muted-foreground">← Back</Link>
      </div>
      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-sm">Title *
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="text-sm">Title (BN)
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={titleBN} onChange={(e) => setTitleBN(e.target.value)} />
          </label>

          <div className="md:col-span-2">
            <ImageUploadField
              label="Desktop image *"
              feature="banner"
              value={imageUrl}
              onChange={(url, path) => {
                setImageUrl(url);
                setImagePath(path);
              }}
              hint="Recommended 1920 × 600 (hero), landscape. Shown on desktop."
            />
          </div>
          <div className="md:col-span-2">
            <ImageUploadField
              label="Mobile image"
              feature="banner"
              value={mobileImageUrl}
              onChange={(url, path) => {
                setMobileImageUrl(url);
                setMobileImagePath(path);
              }}
              hint="Recommended 750 × 600 (portrait-ish). Shown on phones when set."
            />
          </div>

          <label className="text-sm">Link URL
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/collections/sale" />
          </label>
          <label className="text-sm">Position
            <select className="mt-1 w-full rounded-md border border-input px-3 py-2" value={position} onChange={(e) => setPosition(e.target.value)}>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm">Starts at
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="text-sm">Ends at
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </label>
          <label className="text-sm">Sort order
            <input className="mt-1 w-full rounded-md border border-input px-3 py-2" type="number" min="0" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
          </label>
        </div>
        <button disabled={!imageUrl} className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
          {isEdit ? 'Update banner' : 'Create banner'}
        </button>
        {!imageUrl && <p className="mt-2 text-xs text-muted-foreground">Upload a desktop image to save.</p>}
      </form>
    </div>
  );
}