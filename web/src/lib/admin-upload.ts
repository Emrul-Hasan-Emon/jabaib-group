"use client";

import { API_URL } from "./config";

export interface UploadResult {
  url: string;
  path: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Every file-enabled feature owns its upload through its own admin
 * controller — there is no shared /file/upload anymore. The endpoint the
 * client calls maps 1:1 to the feature (mirrors server `UPLOAD_FOLDERS`),
 * so the server already knows which folder to store the file in.
 */
export const UPLOAD_ENDPOINTS = {
  category: "/v1/admin/category/upload-image",
  product: "/v1/admin/product/upload-image",
  media: "/v1/admin/product/media/upload-image",
  sku: "/v1/admin/sku/upload-image",
  banner: "/v1/admin/banner/upload-image",
  homepage: "/v1/admin/homepage-section/upload-image",
  admin: "/v1/admin/admin-user/upload-image",
  paymentGateway: "/v1/admin/payment-gateway/upload-icon",
} as const;

export type UploadFeature = keyof typeof UPLOAD_ENDPOINTS;

/**
 * Batch endpoints for features that support several files in one request.
 * Only product media needs this today; extend when a feature gains batching.
 */
export const UPLOAD_MANY_ENDPOINTS = {
  media: "/v1/admin/product/media/upload-many",
} as const;

export type UploadManyFeature = keyof typeof UPLOAD_MANY_ENDPOINTS;

/** Upload a file for the given feature (feature = folder mapping on server). */
export async function uploadImage(
  file: File,
  feature: UploadFeature,
): Promise<UploadResult> {
  const token = localStorage.getItem("adminAccessToken");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}${UPLOAD_ENDPOINTS[feature]}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Upload failed (${res.status})`);
  }
  return res.json();
}

/** Upload several files for a feature in ONE request (batch upload). */
export async function uploadManyImages(
  files: File[],
  feature: UploadManyFeature,
): Promise<UploadResult[]> {
  const token = localStorage.getItem("adminAccessToken");
  const form = new FormData();
  for (const file of files) {
    form.append("files", file);
  }
  const res = await fetch(`${API_URL}${UPLOAD_MANY_ENDPOINTS[feature]}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Upload failed (${res.status})`);
  }
  return res.json();
}
