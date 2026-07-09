import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Pure-math sanity tests for the symbol fields. This file mirrors the logic
 * in `symbolMasks.ts` (the .ts is TypeScript, so we re-implement the tiny
 * math here to keep the test node-runnable without a build step). If you
 * change a constant or formula in symbolMasks.ts, mirror it below.
 */

const FIELD_THRESHOLD = 0;
const CROSS_ARM_HALF = 0.22;
const CROSS_ARM_LEN = 0.82;
const RING_OUTER = 0.86;
const RING_INNER = 0.52;
const SQUARE_HALF = 0.7;
const STAR_POINTS = 5;
const STAR_OUTER = 0.92;
const STAR_INNER = 0.4;
const STAR_ROTATION = -Math.PI / 2 - Math.PI / STAR_POINTS;

const box = (x, y, hx, hy) => Math.min(hx - Math.abs(x), hy - Math.abs(y));
const crossField = (x, y) =>
  Math.max(box(x, y, CROSS_ARM_HALF, CROSS_ARM_LEN), box(x, y, CROSS_ARM_LEN, CROSS_ARM_HALF));
const ringField = (x, y) => {
  const r = Math.hypot(x, y);
  const mid = (RING_OUTER + RING_INNER) / 2;
  const hw = (RING_OUTER - RING_INNER) / 2;
  return hw - Math.abs(r - mid);
};
const squareField = (x, y) => box(x, y, SQUARE_HALF, SQUARE_HALF);
const starField = (x, y) => {
  const r = Math.hypot(x, y);
  if (r < 1e-6) return STAR_INNER;
  const a = Math.atan2(y, x) - STAR_ROTATION;
  const sector = (Math.PI * 2) / STAR_POINTS;
  let s = a % sector;
  if (s < 0) s += sector;
  const frac = 1 - Math.abs(s - sector / 2) / (sector / 2);
  return STAR_INNER + (STAR_OUTER - STAR_INNER) * frac - r;
};
const fields = { cross: crossField, ring: ringField, square: squareField, star: starField };
const inside = (f, x, y) => f(x, y) > FIELD_THRESHOLD;
const morphValue = (from, to, t, x, y) => {
  const a = fields[from](x, y);
  if (from === to) return a;
  const b = fields[to](x, y);
  return a + (b - a) * t;
};

test('cross: arms are solid, corners are empty', () => {
  assert.ok(inside(crossField, 0, 0)); // center
  assert.ok(inside(crossField, 0, 0.7)); // up the vertical arm
  assert.ok(inside(crossField, 0.7, 0)); // out the horizontal arm
  assert.ok(!inside(crossField, 0.6, 0.6)); // diagonal corner is empty
  assert.ok(!inside(crossField, 0.95, 0)); // beyond arm reach
});

test('ring: hollow center, solid band, empty outside', () => {
  assert.ok(!inside(ringField, 0, 0)); // hole
  const midR = (RING_OUTER + RING_INNER) / 2;
  assert.ok(inside(ringField, midR, 0)); // band
  assert.ok(!inside(ringField, 0.99, 0)); // outside
});

test('square: filled interior, empty beyond the half-extent', () => {
  assert.ok(inside(squareField, 0, 0));
  assert.ok(inside(squareField, 0.65, 0.65)); // corner region inside a filled box
  assert.ok(!inside(squareField, 0.8, 0)); // beyond half-extent
});

test('star: tips reach farther than valleys', () => {
  assert.ok(inside(starField, 0, 0)); // center
  // A tip points up: solid near the outer radius straight above center...
  assert.ok(inside(starField, 0, -0.85));
  // ...while a valley at the same distance is empty.
  const valleyAngle = STAR_ROTATION; // s=0 is a valley
  const rr = 0.85;
  assert.ok(!inside(starField, Math.cos(valleyAngle) * rr, Math.sin(valleyAngle) * rr));
});

test('morph endpoints: t=0 is `from`, t=1 is `to`', () => {
  // A hole point: inside square (from) at t=0, outside ring (to) at t=1.
  assert.ok(morphValue('square', 'ring', 0, 0, 0) > 0);
  assert.ok(morphValue('square', 'ring', 1, 0, 0) <= 0);
});

test('morph is continuous / monotone across a boundary sweep', () => {
  // Sampling the same point across t should move smoothly (no NaN, finite).
  let prev = morphValue('cross', 'star', 0, 0.5, 0.1);
  for (let k = 1; k <= 10; k++) {
    const v = morphValue('cross', 'star', k / 10, 0.5, 0.1);
    assert.ok(Number.isFinite(v));
    assert.ok(Math.abs(v - prev) < 0.5); // no wild jumps between steps
    prev = v;
  }
});

test('re-selecting the same symbol is a no-op field (t irrelevant)', () => {
  assert.equal(morphValue('cross', 'cross', 0, 0.1, 0.1), crossField(0.1, 0.1));
  assert.equal(morphValue('cross', 'cross', 1, 0.1, 0.1), crossField(0.1, 0.1));
});
