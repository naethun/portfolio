'use client';

import { useEffect, useRef } from 'react';
import type { ShoppableItem } from '@/lib/shoppable/types';
import type { Rect } from './geometry';

/**
 * AESTHETIC's "shine/gloss" bound highlight, ported from the creators
 * MaskGlowCanvas (scan variant, metallic gradient): a canvas over the image
 * content box paints each SAM mask cutout with a soft ellipse that sweeps
 * top→bottom, additively blended (`mix-blend-mode: plus-lighter`). Idle masks
 * sweep for 3s of a 7s cycle (phase-staggered per item) then rest; while a
 * product card is hovered, only that item's mask glows, uniformly.
 *
 * Deviations from the source: masks are local same-origin PNGs (no CORS
 * proxy needed), and the small-item idle exclusion (Eyewear etc.) is dropped —
 * with a two-item demo every region should shimmer.
 */

const GLOW_TOP: [number, number, number] = [186, 182, 174];
const GLOW_MID: [number, number, number] = [224, 220, 212];
const GLOW_BOT: [number, number, number] = [240, 236, 228];

const IDLE_CYCLE_S = 7.0;
const IDLE_SWEEP_S = 3.0;
const HOVER_ALPHA = 0.3;
const SWEEP_ALPHA = 0.35;
const MIN_MASK_VAL = 40;

interface LoadedMask {
  gray: Uint8Array;
  sparse: { x: number; y: number; idx: number; val: number }[];
  minY: number;
  maxY: number;
  cx: number;
  w: number;
}

async function loadMask(src: string, width: number, height: number): Promise<LoadedMask | null> {
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const scratch = document.createElement('canvas');
  scratch.width = width;
  scratch.height = height;
  const ctx = scratch.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;

  const gray = new Uint8Array(width * height);
  const sparse: LoadedMask['sparse'] = [];
  let minY = height;
  let maxY = 0;
  let minX = width;
  let maxX = 0;
  for (let i = 0; i < gray.length; i++) {
    const val = data[i * 4 + 3]; // alpha channel — masks are cutouts
    gray[i] = val;
    if (val >= MIN_MASK_VAL) {
      const x = i % width;
      const y = (i / width) | 0;
      sparse.push({ x, y, idx: i, val });
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  if (sparse.length === 0) return null;
  return { gray, sparse, minY, maxY, cx: (minX + maxX) / 2, w: maxX - minX || 1 };
}

export function MaskGlow({
  items,
  contentBox,
  hovered,
}: {
  items: ShoppableItem[];
  /** Rendered image content box (letterbox-excluded), in image-pane coordinates. */
  contentBox: Rect;
  hovered: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hoveredRef = useRef<number | null>(hovered);
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  const w = Math.round(contentBox.w);
  const h = Math.round(contentBox.h);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || w < 2 || h < 2) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    canvas.width = cw;
    canvas.height = ch;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let disposed = false;
    const masks: (LoadedMask | null)[] = items.map(() => null);

    Promise.all(
      items.map(async (item, i) => {
        const src = item.localMask ?? item.maskUrl;
        if (!src) return;
        masks[i] = await loadMask(src, cw, ch);
      }),
    ).then(() => {
      if (disposed) return;
      const frame = ctx.createImageData(cw, ch);
      const pixels = frame.data;
      const start = performance.now();
      let wasDirty = false;

      const render = (now: number) => {
        raf = requestAnimationFrame(render);
        const t = (now - start) / 1000;
        pixels.fill(0);
        let dirty = false;
        const hov = hoveredRef.current;

        for (let m = 0; m < masks.length; m++) {
          const mask = masks[m];
          if (!mask) continue;
          const isHovered = hov === m;
          if (hov !== null && !isHovered) continue; // hover isolates one mask

          const maskH = mask.maxY - mask.minY || 1;
          const invRange = 1 / maskH;

          // hovered (or reduced motion): uniform glow across the whole mask
          const uniform = isHovered || reducedMotion;
          let scanCenterPx = 0;
          if (!uniform) {
            const cycle = (t + m * 2.3) % IDLE_CYCLE_S;
            if (cycle > IDLE_SWEEP_S) continue; // resting
            const radius = 0.4;
            const scan = -radius + (cycle / IDLE_SWEEP_S) * (1 + 2 * radius);
            scanCenterPx = mask.minY + scan * maskH;
          }
          const ry = maskH * 0.2;
          const rx = mask.w * 0.45;

          dirty = true;
          for (let s = 0; s < mask.sparse.length; s++) {
            const sp = mask.sparse[s];
            let shapeAlpha: number;
            if (uniform) {
              shapeAlpha = HOVER_ALPHA / SWEEP_ALPHA;
            } else {
              const dx = (sp.x - mask.cx) / rx;
              const dy = (sp.y - scanCenterPx) / ry;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 1.6) continue;
              shapeAlpha = dist < 1.2 ? 1 : 1 - ((dist - 1.2) / 0.4) ** 2;
            }
            const edgeFade = Math.min(1, (sp.val - MIN_MASK_VAL) / 100);
            const alpha = edgeFade * shapeAlpha * SWEEP_ALPHA;
            if (alpha < 0.01) continue;

            const gt = (sp.y - mask.minY) * invRange;
            let cr: number;
            let cg: number;
            let cb: number;
            if (gt < 0.5) {
              const lt = gt * 2;
              cr = GLOW_TOP[0] + (GLOW_MID[0] - GLOW_TOP[0]) * lt;
              cg = GLOW_TOP[1] + (GLOW_MID[1] - GLOW_TOP[1]) * lt;
              cb = GLOW_TOP[2] + (GLOW_MID[2] - GLOW_TOP[2]) * lt;
            } else {
              const lt = (gt - 0.5) * 2;
              cr = GLOW_MID[0] + (GLOW_BOT[0] - GLOW_MID[0]) * lt;
              cg = GLOW_MID[1] + (GLOW_BOT[1] - GLOW_MID[1]) * lt;
              cb = GLOW_MID[2] + (GLOW_BOT[2] - GLOW_MID[2]) * lt;
            }

            const pi = sp.idx * 4;
            pixels[pi] = Math.min(255, pixels[pi] + ((cr * alpha) | 0));
            pixels[pi + 1] = Math.min(255, pixels[pi + 1] + ((cg * alpha) | 0));
            pixels[pi + 2] = Math.min(255, pixels[pi + 2] + ((cb * alpha) | 0));
            pixels[pi + 3] = 255;
          }
        }

        if (dirty) {
          ctx.putImageData(frame, 0, 0);
          wasDirty = true;
        } else if (wasDirty) {
          ctx.clearRect(0, 0, cw, ch);
          wasDirty = false;
        }
      };
      raf = requestAnimationFrame(render);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [items, w, h]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute"
      style={{
        left: contentBox.x,
        top: contentBox.y,
        width: w,
        height: h,
        mixBlendMode: 'plus-lighter',
      }}
    />
  );
}
