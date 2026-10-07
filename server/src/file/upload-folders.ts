/**
 * Centralized mapping of every file-enabled feature to its upload folder.
 *
 * Storage layout: <LOCAL_UPLOAD_DIR>/jabaib/<folder>[/…]
 * Nested folders (e.g. product/sku, product/media) are created automatically
 * on demand by FileHandleService before any upload.
 *
 * Feature controllers/services MUST resolve their folder from here — never
 * hard-code a folder name at the call site. Only this config changes when a
 * feature is added or its folder is moved.
 */
export const UPLOAD_FOLDERS = {
  attribute: 'attribute',
  collection: 'collection',
  category: 'category',
  product: 'product',
  /** SKU images live under the product subtree (product/sku). */
  productSku: 'product/sku',
  /** Product media gallery items (product/media). */
  productMedia: 'product/media',
  banner: 'banner',
  homepage: 'homepage',
  adminUser: 'admin',
  customer: 'user',
  orderReturn: 'order-return',
  general: 'general',
} as const;

export type UploadFolderKey = keyof typeof UPLOAD_FOLDERS;
export type UploadFolderPath =
  (typeof UPLOAD_FOLDERS)[keyof typeof UPLOAD_FOLDERS];

/** Resolve the storage folder for a feature (type-safe key). */
export function uploadFolder(key: UploadFolderKey): UploadFolderPath {
  return UPLOAD_FOLDERS[key];
}
