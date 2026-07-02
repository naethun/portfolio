'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableEntry } from '@/lib/shoppable/types';
import { fitContain, rayExitDistance, type LimbEdge, type Rect } from './geometry';
import { Limbs, type LimbLine } from './Limbs';
import { MaskGlow } from './MaskGlow';
import { ProductCard } from './ProductCard';

/**
 * The shoppable breakdown: the image centered in the viewport, each detected
 * item's card pushed radially outward along the ray from the image center
 * through its anchor (an item top-left of center branches out top-left, etc.),
 * with SVG limbs connecting anchor → card edge. Bound regions carry
 * AESTHETIC's mask-glow shine (see MaskGlow). Pure DOM overlay above the
 * WebGL canvas; the universe keeps rendering behind a translucent
 * gallery-toned scrim. Narrow viewports stack image over cards and drop the
 * limbs.
 */

const CARD_W = 300;
const LIMB_GAP = 110; // how far past the image edge a card sits
const EDGE_PAD = 16;
const HEADER_PAD = 64;
const FALLBACK_CARD_H = 120;

interface CardPos {
  left: number;
  top: number;
}

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
  const lastLayoutRef = useRef('');
  const measureRef = useRef<(() => void) | null>(null);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [lines, setLines] = useState<LimbLine[]>([]);
  const [anchors, setAnchors] = useState<{ x: number; y: number }[]>([]);
  const [contentBox, setContentBox] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<CardPos[]>([]);

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

  // stacked layout below md — cards flow in a column, no limbs
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  /**
   * Measure in the overlay root's pixel space. Anchors and the mask-glow
   * content box are image-pane-relative (their elements live in the pane);
   * card positions and limb endpoints are root-relative.
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
    const contentRoot: Rect = { x: originX, y: originY, w: content.w, h: content.h };

    const nextAnchors = entry.items.map((item) => ({
      x: content.x + item.anchor.x * content.w,
      y: content.y + item.anchor.y * content.h,
    }));

    let nextPos: CardPos[] = [];
    let nextLines: LimbLine[] = [];

    if (window.matchMedia('(min-width: 768px)').matches) {
      const cx = originX + content.w / 2;
      const cy = originY + content.h / 2;
      const placements = entry.items.map((item, i) => {
        const ax = originX + item.anchor.x * content.w;
        const ay = originY + item.anchor.y * content.h;
        let dx = ax - cx;
        let dy = ay - cy;
        const len = Math.hypot(dx, dy);
        if (len < 1e-3) {
          dx = 1;
          dy = 0;
        } else {
          dx /= len;
          dy /= len;
        }
        const cardH = cardRefs.current[i]?.getBoundingClientRect().height || FALLBACK_CARD_H;
        const exit = rayExitDistance(ax, ay, dx, dy, contentRoot);
        const px = ax + dx * (exit + LIMB_GAP);
        const py = ay + dy * (exit + LIMB_GAP);

        let edge: LimbEdge;
        let left: number;
        let top: number;
        if (Math.abs(dx) >= Math.abs(dy)) {
          edge = dx > 0 ? 'left' : 'right';
          left = dx > 0 ? px : px - CARD_W;
          top = py - cardH / 2;
        } else {
          edge = dy > 0 ? 'top' : 'bottom';
          top = dy > 0 ? py : py - cardH;
          left = px - CARD_W / 2;
        }
        left = Math.min(Math.max(left, EDGE_PAD), rootRect.width - CARD_W - EDGE_PAD);
        top = Math.min(Math.max(top, HEADER_PAD), rootRect.height - cardH - EDGE_PAD);

        // If clamping parked the card on top of the image, slide it off
        // horizontally toward its item's side of the frame.
        const intersectsImage =
          left < contentRoot.x + contentRoot.w &&
          contentRoot.x < left + CARD_W &&
          top < contentRoot.y + contentRoot.h &&
          contentRoot.y < top + cardH;
        if (intersectsImage) {
          const goLeft = dx < 0 || (dx === 0 && ax < cx);
          left = goLeft
            ? Math.max(EDGE_PAD, contentRoot.x - CARD_W - 24)
            : Math.min(rootRect.width - CARD_W - EDGE_PAD, contentRoot.x + contentRoot.w + 24);
          edge = goLeft ? 'right' : 'left';
        }
        return { ax, ay, edge, left, top, cardH };
      });

      // de-overlap: push a card down when it intersects an earlier one
      const order = placements
        .map((p, i) => ({ p, i }))
        .sort((a, b) => a.p.top - b.p.top);
      for (let k = 1; k < order.length; k++) {
        for (let j = 0; j < k; j++) {
          const a = order[j].p;
          const b = order[k].p;
          const overlapX = a.left < b.left + CARD_W && b.left < a.left + CARD_W;
          const overlapY = a.top < b.top + a.cardH && b.top < a.top + b.cardH;
          if (overlapX && overlapY) {
            b.top = Math.min(a.top + a.cardH + 12, rootRect.height - b.cardH - EDGE_PAD);
          }
        }
      }

      nextPos = placements.map((p) => ({ left: p.left, top: p.top }));
      nextLines = placements.map((p) => {
        let x2: number;
        let y2: number;
        if (p.edge === 'left') {
          x2 = p.left;
          y2 = p.top + p.cardH / 2;
        } else if (p.edge === 'right') {
          x2 = p.left + CARD_W;
          y2 = p.top + p.cardH / 2;
        } else if (p.edge === 'top') {
          x2 = p.left + CARD_W / 2;
          y2 = p.top;
        } else {
          x2 = p.left + CARD_W / 2;
          y2 = p.top + p.cardH;
        }
        return { x1: p.ax, y1: p.ay, x2, y2, edge: p.edge };
      });
    }

    // Skip state churn (and re-measure loops) when nothing moved.
    const signature = JSON.stringify([content, nextAnchors, nextPos, nextLines]);
    if (signature === lastLayoutRef.current) return;
    lastLayoutRef.current = signature;

    setContentBox(content);
    setAnchors(nextAnchors);
    setCardPos(nextPos);
    setLines(nextLines);
    // card heights may only be measurable after this layout commits
    requestAnimationFrame(() => measureRef.current?.());
  }, [entry]);

  useEffect(() => {
    measureRef.current = measure;
  }, [measure]);

  useEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [measure, isDesktop]);

  const cards = entry.items.map((item, i) => (
    <div
      key={item.boundId}
      onClick={(e) => e.stopPropagation()}
      style={
        isDesktop
          ? {
              position: 'absolute',
              left: cardPos[i]?.left ?? 0,
              top: cardPos[i]?.top ?? 0,
              width: CARD_W,
              visibility: cardPos[i] ? 'visible' : 'hidden',
            }
          : undefined
      }
      className={isDesktop ? 'pointer-events-auto' : 'w-full'}
    >
      <ProductCard
        item={item}
        cardRef={(el) => {
          cardRefs.current[i] = el;
        }}
        onHoverChange={(hovering) => setHovered(hovering ? i : null)}
      />
    </div>
  ));

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

      {/* centered image (desktop) / stacked column (mobile) */}
      <div className="relative z-10 mx-auto flex min-h-full w-full flex-col items-center gap-6 p-6 md:h-full md:justify-center md:p-0">
        <div
          ref={imagePaneRef}
          className="relative h-[45svh] w-full shrink-0 md:h-[68svh] md:w-[44vw] md:max-w-[680px]"
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
          {contentBox && (
            <MaskGlow items={entry.items} contentBox={contentBox} hovered={hovered} />
          )}
          {anchors.map((a, i) => (
            <span
              key={entry.items[i].boundId}
              className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-neutral-900"
              style={{ left: a.x, top: a.y, opacity: hovered === null || hovered === i ? 1 : 0.3 }}
            />
          ))}
        </div>

        {/* mobile: cards flow below the image */}
        {!isDesktop && (
          <div className="relative z-10 flex w-full flex-col items-center gap-4 pb-10">
            {cards}
          </div>
        )}
      </div>

      <Limbs lines={lines} active={hovered} />

      {/* desktop: cards radiate around the image */}
      {isDesktop && <div className="pointer-events-none absolute inset-0 z-10">{cards}</div>}

      {/* header: close + attribution */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between p-5">
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
