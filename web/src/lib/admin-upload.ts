'use client';

import { API_URL } from './config';

export interface UploadResult {
  url: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** Upload a file via the feature-file API (separate from feature POST/PATCH). */
export async function uploadFile(
  file: File,
  folder: string,
): Promise<UploadResult> {
  const token = localStorage.getItem('adminAccessToken');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    `${API_URL}/v1/file/upload?folder=${encodeURIComponent(folder)}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Upload failed (${res.status})`);
  }
  return res.json();
}
