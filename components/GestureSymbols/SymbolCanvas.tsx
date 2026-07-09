'use client';

import { useEffect, useRef } from 'react';
import type { Polarity, SymbolKind, SymbolState, TransitionSource } from './types';
import { FIELD_THRESHOLD, mix, morphValue } from './symbolMasks';
import {
  buildTextField,
  charAt,
  FONT_PX_RATIO,
  gridDimsFor,
  GRID_TARGET_CELL_PX,
  hash2,
  type TextField,
} from './textField';

/**
 * SymbolCanvas — a living typographic poster.
 *
 * Dense repeated monospace text is clipped into a math-defined 2D symbol
 * (cross / ring / square / star). Symbol changes morph the mask over
 * ~0.7–1.1s with per-cell jitter, row drift and (for swipes) lateral smear;
 * when settled the field breathes gently. Polarity flips black-on-white vs
 * white-on-black with a brief text shimmer. Honors `prefers-reduced-motion`.
 *
 * 2D canvas only. The mask math lives in `symbolMasks.ts`; the grid in
 * `textField.ts`. This component owns only timing, drawing and interaction.
 */

export interface SymbolCanvasProps {
  state: SymbolState;
}

/* ------------------------------------------------------------------ *
 * Tunable constants (timing / motion / color) — grouped for live tuning
 * ------------------------------------------------------------------ */

/** Morph durations (ms) by trigger. Reduced-motion overrides all of them. */
const MORPH_MS = { base: 900, swipe: 1050, reduced: 380 };

/** Max backing-store scale — clamps huge DPRs for perf. */
const MAX_DPR = 2;

/** Colors per polarity. Off-white / near-black for an elegant, printed feel. */
const COLORS: Record<Polarity, { bg: string; fg: string }> = {
  'dark-on-light': { bg: '#f4f2ec', fg: '#0b0b0b' },
  'light-on-dark': { bg: '#0b0b0b', fg: '#f4f2ec' },
};

/** Soft-edge falloff: cells within this field distance of the edge fade out. */
const EDGE_SOFT = 0.06;

/** Subtle per-cell base alpha variation for depth. */
const ALPHA_JITTER = 0.14;

/** Jitter amplitudes (CSS px). */
const JITTER_BASE = 1.15; // always-on living motion, visible even at rest
const JITTER_TRANS = 2.6; // added at mid-morph
const JITTER_PULSE = 1.6; // added by the decaying "restart" pulse
const JITTER_BASE_REDUCED = 0.35; // reduced-motion: gentle, not frozen

/** Always-on ambient row drift (CSS px) — rows slide slowly out of phase. */
const ROW_DRIFT_BASE = 1.4;
const ROW_DRIFT_HZ = 0.07;

/** Per-cell character cycling: glyph swaps per second (async per cell). */
const CHAR_CYCLE_HZ = 0.7;
const CHAR_CYCLE_TRANS_BOOST = 5; // extra scramble at mid-transition
const CHAR_CYCLE_HZ_REDUCED = 0.12;

/** Lateral smear (CSS px) at mid-morph, by source. Swipes smear more. */
const SMEAR_SWIPE = 26;
const SMEAR_GESTURE = 9;
/** Draw a faint trailing ghost once smear exceeds this many px. */
const GHOST_MIN_PX = 3;
const GHOST_FRAC = 0.6; // ghost offset as a fraction of the smear
const GHOST_ALPHA = 0.28;

/** Per-row horizontal drift during transitions (CSS px). */
const ROW_DRIFT_PX = 5;

/** "Restart" energy pulse — decays after every symbol change. */
const PULSE_TAU = 0.6; // seconds
const PULSE_BREATHE = 0.9; // extra breathing during the pulse

/** Polarity-flip text shimmer. */
const SHIMMER_MS = 260;
const SHIMMER_MS_REDUCED = 120;
const SHIMMER_DEPTH = 0.6; // how much the flicker can dim a cell

/** Per-symbol motion identity: coordinate scale + gentle breathing. */
const MOTION: Record<SymbolKind, { scale: number; breatheAmp: number; breatheHz: number }> = {
  cross: { scale: 1.0, breatheAmp: 0.014, breatheHz: 0.11 }, // stable slow breathing
  ring: { scale: 1.06, breatheAmp: 0.02, breatheHz: 0.16 }, // expands into a halo
  square: { scale: 0.9, breatheAmp: 0.006, breatheHz: 0.09 }, // compresses, dense, still
  star: { scale: 1.0, breatheAmp: 0.022, breatheHz: 0.24 }, // sharper, faster
};

/* ------------------------------------------------------------------ *
 * Easing
 * ------------------------------------------------------------------ */

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

interface MorphRef {
  from: SymbolKind;
  to: SymbolKind;
  source: TransitionSource;
  start: number; // performance.now() at trigger
  dur: number; // ms
}

interface SizeRef {
  w: number; // CSS px
  h: number; // CSS px
  dpr: number;
  fontPx: number;
  fontFamily: string;
  field: TextField;
}

export function SymbolCanvas({ state }: SymbolCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest inputs read by the rAF loop.
  const stateRef = useRef<SymbolState>(state);
  const morphRef = useRef<MorphRef>({
    from: state.symbol,
    to: state.symbol,
    source: state.source,
    start: 0,
    dur: MORPH_MS.base,
  });
  const polarityTimeRef = useRef<number>(-Infinity);
  const prevPolarityRef = useRef<Polarity>(state.polarity);
  const reducedRef = useRef<boolean>(false);
  const sizeRef = useRef<SizeRef | null>(null);

  // Start (or restart) a morph whenever the symbol or changeCount moves.
  useEffect(() => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const reduced = reducedRef.current;
    const dur = reduced
      ? MORPH_MS.reduced
      : state.source === 'swipe'
        ? MORPH_MS.swipe
        : MORPH_MS.base;
    morphRef.current = {
      from: morphRef.current.to, // snap from the previous target
      to: state.symbol,
      source: state.source,
      start: now,
      dur,
    };
    stateRef.current = state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.symbol, state.changeCount]);

  // Polarity flip → hard color swap + brief shimmer.
  useEffect(() => {
    stateRef.current = state;
    if (state.polarity !== prevPolarityRef.current) {
      prevPolarityRef.current = state.polarity;
      polarityTimeRef.current =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }, [state.polarity, state]);

  // The render loop + sizing + media listeners live in one mount effect.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = reduceMq.matches;
    const onReduce = () => {
      reducedRef.current = reduceMq.matches;
    };
    reduceMq.addEventListener('change', onReduce);

    const resize = () => {
      const parent = canvas.parentElement;
      const w = Math.max(1, parent?.clientWidth ?? canvas.clientWidth);
      const h = Math.max(1, parent?.clientHeight ?? canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const { cols, rows } = gridDimsFor(w, h, GRID_TARGET_CELL_PX);
      const cellPx = w / cols;
      const varFam = getComputedStyle(canvas)
        .getPropertyValue('--font-jetbrains-mono')
        .trim();
      const fontFamily = `${varFam ? varFam + ', ' : ''}'JetBrains Mono', ui-monospace, monospace`;
      sizeRef.current = {
        w,
        h,
        dpr,
        fontPx: cellPx * FONT_PX_RATIO,
        fontFamily,
        field: buildTextField(cols, rows, h / w),
      };
    };
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    let raf = 0;
    let running = false;

    const render = (now: number) => {
      const size = sizeRef.current;
      if (!size) return;
      const { w, h, dpr, fontPx, fontFamily, field } = size;
      const reduced = reducedRef.current;
      const st = stateRef.current;
      const morph = morphRef.current;
      const time = now / 1000;

      // Draw in CSS px; the backing store is DPR-scaled.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const colors = COLORS[st.polarity];
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, w, h);

      // --- transition timing -------------------------------------------
      const rawT = morph.dur > 0 ? clamp01((now - morph.start) / morph.dur) : 1;
      const ease = morph.to === 'star' && !reduced ? easeOutBack : easeInOutCubic;
      const t = ease(rawT);
      const transAct = reduced ? 0 : Math.sin(rawT * Math.PI); // 0..1, peaks mid
      const elapsedSec = (now - morph.start) / 1000;
      const pulse = reduced ? 0 : Math.exp(-elapsedSec / PULSE_TAU);

      // --- per-frame motion params -------------------------------------
      const scaleFrom = MOTION[morph.from].scale;
      const scaleTo = MOTION[morph.to].scale;
      const baseScale = mix(scaleFrom, scaleTo, t);
      const breatheAmp = mix(MOTION[morph.from].breatheAmp, MOTION[morph.to].breatheAmp, t);
      const breatheHz = mix(MOTION[morph.from].breatheHz, MOTION[morph.to].breatheHz, t);
      const breathe =
        1 +
        breatheAmp *
          Math.sin(time * Math.PI * 2 * breatheHz) *
          (reduced ? 0.3 : 1) *
          (1 + pulse * PULSE_BREATHE);
      const sampleScale = baseScale * breathe;
      const invScale = 1 / sampleScale;

      const jitterAmp = reduced
        ? JITTER_BASE_REDUCED
        : JITTER_BASE + transAct * JITTER_TRANS + pulse * JITTER_PULSE;
      const jitHz = 1.7;
      const driftAmp = reduced ? 0 : ROW_DRIFT_PX * transAct;
      const rowDriftT = time * Math.PI * 2 * ROW_DRIFT_HZ;
      const cycleHz = reduced
        ? CHAR_CYCLE_HZ_REDUCED
        : CHAR_CYCLE_HZ * (1 + transAct * CHAR_CYCLE_TRANS_BOOST);
      const smearMag =
        reduced ? 0 : (morph.source === 'swipe' ? SMEAR_SWIPE : SMEAR_GESTURE) * transAct;

      // --- polarity shimmer --------------------------------------------
      const shimMs = reduced ? SHIMMER_MS_REDUCED : SHIMMER_MS;
      const shimElapsed = now - polarityTimeRef.current;
      const shim = shimElapsed >= 0 && shimElapsed < shimMs ? 1 - shimElapsed / shimMs : 0;

      // --- draw cells ---------------------------------------------------
      ctx.font = `${fontPx}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colors.fg;

      const invAspect = 1 / field.aspect;
      const cells = field.cells;
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        // Membership is tested on stable base coords (with a small domain
        // warp during morphs so edges reflow), scaled by the motion scale.
        let sx = c.nx * invScale;
        let sy = c.ny * invScale;
        if (transAct > 0) {
          const wobble = 0.06 * transAct;
          sx += Math.sin(c.phase + time * jitHz) * wobble;
          sy += Math.cos(c.phase * 1.3 + time * jitHz) * wobble;
        }
        const v = morphValue(morph.from, morph.to, t, sx, sy);
        if (v <= FIELD_THRESHOLD) continue;

        // Soft edge + per-cell depth.
        let alpha = Math.min(1, v / EDGE_SOFT);
        alpha *= 1 - ALPHA_JITTER * hash2(c.col + 5, c.row + 11);
        if (shim > 0) {
          const flick = hash2(c.col + ((time * 40) | 0), c.row + 3);
          alpha *= 1 - shim * SHIMMER_DEPTH * flick;
        }
        if (alpha < 0.02) continue;

        // Pixel position + jitter / drift / smear.
        let px = (c.nx * 0.5 + 0.5) * w;
        let py = (c.ny * invAspect * 0.5 + 0.5) * h;
        if (jitterAmp > 0) {
          px += Math.sin(c.phase + time * jitHz) * jitterAmp;
          py += Math.cos(c.phase * 1.3 + time * jitHz * 0.9) * jitterAmp * 0.7;
        }
        if (!reduced) px += ROW_DRIFT_BASE * Math.sin(rowDriftT + c.row * 0.6);
        px += c.drift * driftAmp;
        const smearX = smearMag * (0.5 + 0.5 * c.drift);
        px += smearX;

        // Live glyph: cells retype themselves over time, async via phase.
        const glyph = charAt(c.col, c.row, (time * cycleHz + c.phase) | 0);

        // Faint trailing ghost for the smear (transition only).
        if (smearX > GHOST_MIN_PX) {
          ctx.globalAlpha = alpha * GHOST_ALPHA;
          ctx.fillText(glyph, px - smearX * GHOST_FRAC, py);
        }
        ctx.globalAlpha = alpha;
        ctx.fillText(glyph, px, py);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (document.hidden) {
        running = false;
        return;
      }
      render(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMq.removeEventListener('change', onReduce);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
