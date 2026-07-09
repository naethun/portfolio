import type { SymbolKind } from './types';

/**
 * Pure, testable mask math for the Gesture Symbols poster.
 *
 * Every shape is expressed as a signed field `f(x, y)` in a centered,
 * aspect-corrected normalized space where `x ∈ [-1, 1]` spans the *short*
 * (width) axis and `y` uses the same unit (so the taller 9:16 axis simply
 * has a larger magnitude range). `f > FIELD_THRESHOLD` means the point is
 * inside the shape; the value behaves like a rough signed distance, so the
 * renderer can soft-fade cells near the boundary.
 *
 * Morphing between two shapes = interpolating their fields and testing the
 * mix against the threshold: `mix(fieldA, fieldB, t) > threshold`. No DOM,
 * no Date, no assets — inclusion is decided per text cell by the caller.
 */

/* ------------------------------------------------------------------ *
 * Tunable constants (grouped, named — safe to nudge after live review)
 * ------------------------------------------------------------------ */

/** A point is "inside" when its mixed field value exceeds this. */
export const FIELD_THRESHOLD = 0;

/** Cross — two overlapping bars. */
export const CROSS_ARM_HALF = 0.22; // half-thickness of each arm
export const CROSS_ARM_LEN = 0.82; // half-length of each arm (reach from center)

/** Ring — a hollow annulus band. */
export const RING_OUTER = 0.86; // outer radius
export const RING_INNER = 0.52; // inner (hole) radius

/** Square — a filled centered box. */
export const SQUARE_HALF = 0.7; // half-extent per side

/** Star — n-pointed, radius modulated between tip and valley. */
export const STAR_POINTS = 5;
export const STAR_OUTER = 0.92; // tip radius
export const STAR_INNER = 0.4; // valley radius
export const STAR_ROTATION = -Math.PI / 2 - Math.PI / STAR_POINTS; // one tip toward the top

/* ------------------------------------------------------------------ *
 * Per-shape signed fields
 * ------------------------------------------------------------------ */

/** Interior value of an origin-centered box with half-extents (hx, hy). */
function boxField(x: number, y: number, hx: number, hy: number): number {
  return Math.min(hx - Math.abs(x), hy - Math.abs(y));
}

export function crossField(x: number, y: number): number {
  const vertical = boxField(x, y, CROSS_ARM_HALF, CROSS_ARM_LEN);
  const horizontal = boxField(x, y, CROSS_ARM_LEN, CROSS_ARM_HALF);
  // union of the two bars → whichever is "more inside"
  return Math.max(vertical, horizontal);
}

export function ringField(x: number, y: number): number {
  const r = Math.hypot(x, y);
  const mid = (RING_OUTER + RING_INNER) / 2;
  const halfWidth = (RING_OUTER - RING_INNER) / 2;
  // positive inside the band, negative in the hole and outside
  return halfWidth - Math.abs(r - mid);
}

export function squareField(x: number, y: number): number {
  return boxField(x, y, SQUARE_HALF, SQUARE_HALF);
}

export function starField(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r < 1e-6) return STAR_INNER; // dead center is always inside
  const a = Math.atan2(y, x) - STAR_ROTATION;
  const sector = (Math.PI * 2) / STAR_POINTS;
  let s = a % sector;
  if (s < 0) s += sector;
  // frac: 1 at the tooth tip (sector/2), 0 at the valleys (0 and sector)
  const frac = 1 - Math.abs(s - sector / 2) / (sector / 2);
  const boundary = STAR_INNER + (STAR_OUTER - STAR_INNER) * frac;
  return boundary - r;
}

/* ------------------------------------------------------------------ *
 * Dispatch + morphing
 * ------------------------------------------------------------------ */

export function symbolField(kind: SymbolKind, x: number, y: number): number {
  switch (kind) {
    case 'cross':
      return crossField(x, y);
    case 'ring':
      return ringField(x, y);
    case 'square':
      return squareField(x, y);
    case 'star':
      return starField(x, y);
  }
}

/** Linear interpolation helper. */
export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolated field value between two shapes at parameter `t ∈ [0, 1]`.
 * `t = 0` → pure `from`, `t = 1` → pure `to`.
 */
export function morphValue(
  from: SymbolKind,
  to: SymbolKind,
  t: number,
  x: number,
  y: number,
): number {
  const a = symbolField(from, x, y);
  if (from === to) return a; // no work when re-selecting the same symbol
  const b = symbolField(to, x, y);
  return mix(a, b, t);
}

/** Membership test for the interpolated shape. */
export function insideMorph(
  from: SymbolKind,
  to: SymbolKind,
  t: number,
  x: number,
  y: number,
  threshold: number = FIELD_THRESHOLD,
): boolean {
  return morphValue(from, to, t, x, y) > threshold;
}
