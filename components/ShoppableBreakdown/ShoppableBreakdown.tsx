'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableEntry } from '@/lib/shoppable/types';
import { fitContain } from './geometry';
import { Limbs, type LimbLine } from './Limbs';
import { ProductCard } from './ProductCard';

/**
 * The shoppable breakdown: image on the left, product cards on the right,
 * SVG limbs connecting each detected item's anchor to its card. Pure DOM
 * overlay above the WebGL canvas; the universe keeps rendering behind a
 * translucent gallery-toned scrim. Narrow viewports stack image over cards
 * and drop the limbs.
 */
export function ShoppableBreakdown({
  media,
  entry,
  onClose,
}: {
  media: UniverseMedia;
  entry: ShoppableEntry;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imagePaneRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cardRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [lines, setLines] = useState<LimbLine[]>([]);
  const [anchors, setAnchors] = useState<{ x: number; y: number }[]>([]);
  const [boxRects, setBoxRects] = useState<{ x: number; y: number; w: number; h: number }[]>([]);

  // fade the overlay in on mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /**
   * Measure everything in the overlay root's pixel space:
   * anchor = image-pane offset + contain-box offset + normalized anchor × content size;
   * card endpoint = left-edge midpoint of each card.
   */
  const measure = useCallback(() => {
    const root = rootRef.current;
    const pane = imagePaneRef.current;
    const img = imgRef.current;
    if (!root || !pane || !img || !img.naturalWidth) return;
    const rootRect = root.getBoundingClientRect();
    const paneRect = pane.getBoundingClientRect();
    const content = fitContain(
      paneRect.width,
      paneRect.height,
      img.naturalWidth,
      img.naturalHeight,
    );
    const originX = paneRect.left - rootRect.left + content.x;
    const originY = paneRect.top - rootRect.top + content.y;

    setAnchors(
      entry.items.map((item) => ({
        x: content.x + item.anchor.x * content.w,
        y: content.y + item.anchor.y * content.h,
      })),
    );
    setBoxRects(
      entry.items.map((item) => ({
        x: content.x + item.box.x * content.w,
        y: content.y + item.box.y * content.h,
        w: item.box.w * content.w,
        h: item.box.h * content.h,
      })),
    );
    setLines(
      entry.items.map((item, i) => {
        const card = cardRefs.current[i];
        const cardRect = card?.getBoundingClientRect();
        return {
          x1: originX + item.anchor.x * content.w,
          y1: originY + item.anchor.y * content.h,
          x2: cardRect ? cardRect.left - rootRect.left : rootRect.width,
          y2: cardRect ? cardRect.top - rootRect.top + cardRect.height / 2 : rootRect.height / 2,
        };
      }),
    );
  }, [entry]);

  useEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 z-50 overflow-y-auto transition-opacity duration-300 md:overflow-hidden"
      style={{ opacity: visible ? 1 : 0, background: 'rgba(244, 242, 238, 0.88)' }}
      role="dialog"
      aria-label={`Shop the look: ${media.filename}`}
    >
      {/* backdrop click closes; inner panes stop propagation */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-6 md:h-full md:flex-row md:items-center md:gap-10 md:p-10">
        {/* left: the image with anchor dots + hover box trace */}
        <div
          ref={imagePaneRef}
          className="relative h-[45svh] w-full shrink-0 md:h-[80svh] md:w-[42%]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={media.src}
            alt=""
            onLoad={measure}
            className="h-full w-full object-contain"
            draggable={false}
          />
          {anchors.map((a, i) => (
            <span
              key={entry.items[i].boundId}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-neutral-900"
              style={{ left: a.x, top: a.y, opacity: hovered === null || hovered === i ? 1 : 0.3 }}
            />
          ))}
          {hovered !== null && boxRects[hovered] && (
            <span
              className="pointer-events-none absolute rounded-md border border-neutral-900/70"
              style={{
                left: boxRects[hovered].x,
                top: boxRects[hovered].y,
                width: boxRects[hovered].w,
                height: boxRects[hovered].h,
              }}
            />
          )}
        </div>

        {/* right: product cards */}
        <div
          className="relative z-10 flex w-full flex-1 flex-col items-start justify-center gap-4 pb-10 md:pb-0"
          onClick={(e) => e.stopPropagation()}
        >
          {entry.items.map((item, i) => (
            <ProductCard
              key={item.boundId}
              item={item}
              cardRef={(el) => {
                cardRefs.current[i] = el;
              }}
              onHoverChange={(hovering) => setHovered(hovering ? i : null)}
            />
          ))}
        </div>
      </div>

      <Limbs lines={lines} active={hovered} />

      {/* header: close + attribution */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
          Powered by AESTHETIC
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close breakdown"
          className="pointer-events-auto rounded-full border border-neutral-300 bg-white/80 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neutral-700 shadow-sm backdrop-blur transition-colors hover:border-neutral-900 hover:text-neutral-900"
        >
          ✕ CLOSE
        </button>
      </div>
    </div>
  );
}
