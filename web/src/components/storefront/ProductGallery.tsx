'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { useLocale } from '@/lib/locale';
import { mediaUrl } from '@/lib/media-url';

export interface GalleryImage {
  id: number;
  url: string;
  altText?: string | null;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * Mobile-first product gallery. One main image + a compact thumbnail strip
 * (hidden entirely for a single image), prev/next arrows, touch swipe to
 * change images, an image counter, and a tap-to-zoom full-screen viewer with
 * pinch-zoom + pan (double-tap and −/+ buttons also toggle zoom).
 */
export function ProductGallery({
  images,
  name,
  insetBadges,
}: {
  images: GalleryImage[];
  name: string;
  insetBadges?: React.ReactNode;
}) {
  const { t } = useLocale();
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const thumbsRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const count = images.length;
  const safeIndex = count > 0 ? clamp(index, 0, count - 1) : 0;
  const active = images[safeIndex] ?? null;

  const select = (i: number) => {
    if (count === 0) return;
    setIndex(clamp(i, 0, count - 1));
    // keep the newly-active thumbnail visible
    requestAnimationFrame(() => {
      thumbsRef.current
        ?.querySelector<HTMLButtonElement>(`[data-thumb="${clamp(i, 0, count - 1)}"]`)
        ?.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  };

  const markBroken = (url: string) =>
    setBroken((prev) => (prev[url] ? prev : { ...prev, [url]: true }));

  /* tap → open zoom; horizontal swipe → change image; big drag → swallow click */
  const onMainPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    dragStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onMainPointerUp = (e: React.PointerEvent) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || e.pointerType !== 'touch') return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 44 && Math.abs(dx) > 1.25 * Math.abs(dy)) {
      suppressClick.current = true;
      select(safeIndex + (dx < 0 ? 1 : -1));
    } else if (Math.hypot(dx, dy) > 12) {
      suppressClick.current = true;
    }
  };

  const clearDrag = () => {
    dragStart.current = null;
  };

  const onImageClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (active && !broken[active.url]) setZoomOpen(true);
  };

  const closeZoom = useCallback(() => setZoomOpen(false), []);

  const mainImage = active ? (
    broken[active.url] ? (
      <ImageFallback name={name} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={mediaUrl(active.url)}
        alt={active.altText || name}
        draggable={false}
        onClick={onImageClick}
        onPointerDown={onMainPointerDown}
        onPointerMove={(e) => {
          // keep pointer capture alive so a fast swipe still ends on this node
          if (dragStart.current && !e.currentTarget.hasPointerCapture?.(e.pointerId)) {
            e.currentTarget.setPointerCapture?.(e.pointerId);
          }
        }}
        onPointerUp={onMainPointerUp}
        onPointerCancel={clearDrag}
        onError={() => markBroken(active.url)}
        className="h-full w-full touch-pan-y select-none object-cover transition-opacity duration-200"
      />
    )
  ) : (
    <ImageFallback name={name} />
  );

  return (
    <div className="flex flex-col lg:flex-row-reverse lg:gap-3">
      {/* main image */}
      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-muted">
          {mainImage}

          {/* overlay badges (discount / collection etc.) */}
          {insetBadges}

          {/* zoom affordance */}
          {active && !broken[active.url] && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomOpen(true);
              }}
              aria-label={t('Tap to zoom')}
              className="absolute bottom-2 right-2 flex h-8 items-center gap-1.5 rounded-full bg-black/55 px-3 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-black/70 active:scale-95"
            >
              <Maximize2 size={13} />
              <span className="hidden sm:inline">{t('Tap to zoom')}</span>
            </button>
          )}

          {/* image counter */}
          {count > 1 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur">
              {safeIndex + 1} / {count}
            </span>
          )}

          {/* prev / next */}
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  select(safeIndex - 1);
                }}
                aria-label={t('Previous image')}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-90"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  select(safeIndex + 1);
                }}
                aria-label={t('Next image')}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-90"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* thumbnails — hidden for a single image */}
      {count > 1 && (
        <div
          ref={thumbsRef}
          className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-0.5 lg:mt-0 lg:w-16 lg:flex-col lg:overflow-y-auto lg:pb-0.5"
        >
          {images.map((m, i) => {
            const isActive = i === safeIndex;
            const isBroken = broken[m.url];
            return (
              <button
                type="button"
                key={m.id}
                data-thumb={i}
                onClick={() => select(i)}
                aria-pressed={isActive}
                aria-label={`${t('Image')} ${i + 1}`}
                className={`relative h-16 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  isActive
                    ? 'border-primary shadow-sm'
                    : 'border-border opacity-80 hover:opacity-100'
                }`}
              >
                {isBroken ? (
                  <span className="flex h-full w-full items-center justify-center bg-muted text-sm font-extrabold text-primary/25">
                    {name.charAt(0)}
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl(m.url)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onError={() => markBroken(m.url)}
                    className="h-full w-full object-cover"
                  />
                )}
                {isActive && (
                  <span className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-inset ring-primary/30" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {zoomOpen && <ZoomViewer image={active} name={name} onClose={closeZoom} />}
    </div>
  );
}

function ImageFallback({ name }: { name: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-primary/15">
      <span className="text-6xl font-extrabold">{name.charAt(0)}</span>
      <span className="text-[11px] font-medium uppercase tracking-widest text-primary/30">
        Image unavailable
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Full-screen zoom viewer: pinch to zoom, drag to pan, double-tap to  */
/* toggle, − / + buttons, backdrop / Esc / ✕ to close.                */
/* ------------------------------------------------------------------ */

interface ViewerTransform {
  x: number;
  y: number;
  s: number;
}

function ZoomViewer({
  image,
  name,
  onClose,
}: {
  image: GalleryImage | null;
  name: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [tr, setTr] = useState<ViewerTransform>({ x: 0, y: 0, s: 1 });
  const [dragging, setDragging] = useState(false);
  const [broken, setBroken] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);
  // Mirror of the transform state, updated on every change so the pointer
  // gesture handlers never read a stale value (kept in sync outside render).
  const trRef = useRef<ViewerTransform>({ x: 0, y: 0, s: 1 });
  const setTrLive = useCallback((next: ViewerTransform) => {
    trRef.current = next;
    setTr(next);
  }, []);
  const gesture = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    dist: 0,
    base: { x: 0, y: 0, s: 1 },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const reset = () => setTrLive({ x: 0, y: 0, s: 1 });

  const panBounds = () => {
    const el = frameRef.current;
    return {
      w: el ? el.clientWidth : window.innerWidth,
      h: el ? el.clientHeight : window.innerHeight,
    };
  };

  const clampPan = (v: number, s: number, size: number) => {
    const max = ((s - 1) * size) / 2;
    return clamp(v, -max, max);
  };

  const zoomAbout = (nextS: number, px?: number, py?: number) => {
    const cur = trRef.current;
    const s = clamp(nextS, 1, 4);
    const bounds = panBounds();
    let x = 0;
    let y = 0;
    if (px != null && py != null && s > 1) {
      const ratio = s / (cur.s || 1);
      x = px - (px - cur.x) * ratio;
      y = py - (py - cur.y) * ratio;
    }
    setTrLive({
      x: clampPan(x, s, bounds.w),
      y: clampPan(y, s, bounds.h),
      s,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    gesture.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.base = trRef.current;
    if (gesture.current.pointers.size === 2) {
      const [a, b] = [...gesture.current.pointers.values()];
      gesture.current.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = gesture.current.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    gesture.current.pointers.set(e.pointerId, cur);
    const ptrs = [...gesture.current.pointers.values()];
    const base = gesture.current.base;
    const bounds = panBounds();

    if (ptrs.length === 2) {
      const d = Math.hypot(ptrs[0].x - ptrs[1].x, ptrs[0].y - ptrs[1].y);
      const s = clamp(base.s * (d / (gesture.current.dist || 1)), 1, 4);
      const mid = {
        x: (ptrs[0].x + ptrs[1].x) / 2,
        y: (ptrs[0].y + ptrs[1].y) / 2,
      };
      const ratio = s / (base.s || 1);
      setTrLive({
        x: clampPan(mid.x - (mid.x - base.x) * ratio, s, bounds.w),
        y: clampPan(mid.y - (mid.y - base.y) * ratio, s, bounds.h),
        s,
      });
    } else if (ptrs.length === 1 && base.s > 1) {
      setTrLive({
        x: clampPan(base.x + (cur.x - prev.x), base.s, bounds.w),
        y: clampPan(base.y + (cur.y - prev.y), base.s, bounds.h),
        s: base.s,
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const hadTwo = gesture.current.pointers.size === 2;
    gesture.current.pointers.delete(e.pointerId);
    const cur = trRef.current;
    // double-tap (touch) toggles zoom about the tap point when not pinching
    if (e.pointerType === 'touch' && gesture.current.pointers.size === 0) {
      const now = Date.now();
      if (now - lastTap.current < 300 && cur.s === 1 && !hadTwo) {
        zoomAbout(2.5, e.clientX, e.clientY);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
    if (gesture.current.pointers.size === 1) {
      gesture.current.base = { x: cur.x, y: cur.y, s: cur.s };
    }
    setDragging(false);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const cur = trRef.current;
    if (cur.s > 1) reset();
    else zoomAbout(2.5, e.clientX, e.clientY);
  };

  if (!image) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* header bar */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4 text-white">
        <span className="truncate pr-3 text-xs font-semibold text-white/70">
          {name} · {t('Zoom')}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('Close zoom')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      {/* zoom stage */}
      <div
        ref={frameRef}
        className="relative mx-2 mb-3 flex-1 touch-none select-none overflow-hidden rounded-xl"
      >
        {broken ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-white/40">
            <span className="text-6xl font-extrabold text-white/15">
              {name.charAt(0)}
            </span>
            <span className="text-[11px] uppercase tracking-widest">
              {t('Image unavailable')}
            </span>
          </div>
        ) : (
          <div
            className="flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={onDoubleClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mediaUrl(image.url)}
              alt={image.altText || name}
              draggable={false}
              onError={() => setBroken(true)}
              onLoad={() => setBroken(false)}
              className="max-h-full max-w-full object-contain"
              style={{
                transform: `translate(${tr.x}px, ${tr.y}px) scale(${tr.s})`,
                transition: dragging ? 'none' : 'transform 150ms ease-out',
                transformOrigin: '0 0',
              }}
            />
          </div>
        )}

        {/* zoom controls */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              zoomAbout(trRef.current.s + 0.6);
            }}
            aria-label={t('Zoom in')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (trRef.current.s > 1) zoomAbout(trRef.current.s - 0.6);
              else onClose();
            }}
            aria-label={t('Zoom out')}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-90"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* hint */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[75%] truncate rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur">
          {tr.s > 1
            ? t('Drag to pan · Pinch or double-tap to zoom')
            : t('Pinch to zoom')}
        </div>
      </div>
    </div>
  );
}