'use client';

import { useRef, useState } from 'react';
import { ImageIcon, RefreshCw, UploadCloud, X } from 'lucide-react';
import { uploadImage, type UploadFeature } from '@/lib/admin-upload';

interface ImageUploadFieldProps {
  /** Field title shown above the control. */
  label: string;
  /** Feature whose admin controller owns the upload (e.g. 'banner', 'admin'). */
  feature: UploadFeature;
  /** Current image URL (server-served upload path). */
  value?: string;
  onChange: (url: string, path: string) => void;
  required?: boolean;
  /** Helper text under the drop zone, e.g. recommended dimensions. */
  hint?: string;
  /** Circular avatar preview (used for admin profile images). */
  round?: boolean;
}

/**
 * Drag & drop image upload with live preview, replace and remove.
 * Used across Banner and Admin forms for a consistent feel.
 */
export function ImageUploadField({
  label,
  feature,
  value,
  onChange,
  required,
  hint,
  round,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const up = await uploadImage(file, feature);
      onChange(up.url, up.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      {value ? (
        <div className="mt-2 flex items-start gap-4">
          <div
            className={`overflow-hidden rounded-xl border border-border bg-muted ${
              round ? 'h-24 w-24 rounded-full' : 'h-32 w-48'
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt={label}
              className={`h-full w-full object-cover ${round ? 'rounded-full' : ''}`}
            />
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={openPicker}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {uploading ? 'Uploading…' : 'Replace image'}
            </button>
            {!required && (
              <button
                type="button"
                onClick={() => onChange('', '')}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
                Remove image
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          disabled={uploading}
          className={`mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/40 hover:border-primary/50 hover:bg-muted'
          } disabled:opacity-60`}
        >
          {uploading ? (
            <>
              <UploadCloud className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-sm font-medium text-primary">
                Uploading…
              </span>
            </>
          ) : (
            <>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-sm">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </span>
              <span className="text-sm font-medium">
                Click to upload or drag &amp; drop
              </span>
              <span className="text-xs text-muted-foreground">
                PNG, JPG or WEBP
              </span>
            </>
          )}
        </button>
      )}

      {hint && !value && (
        <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      )}
    </div>
  );
}