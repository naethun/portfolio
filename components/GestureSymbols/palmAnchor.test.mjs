import test from 'node:test';
import assert from 'node:assert/strict';

import { computePalmAnchor } from './palmAnchor.ts';

function pt(x, y, z = 0) {
  return { x, y, z };
}

function makeHand(overrides = {}) {
  const lm = Array.from({ length: 21 }, () => pt(0, 0, 0));
  lm[0] = pt(0.2, 0.6, 0);
  lm[5] = pt(0.3, 0.42, -0.01);
  lm[9] = pt(0.42, 0.38, -0.02);
  lm[13] = pt(0.54, 0.42, -0.01);
  lm[17] = pt(0.66, 0.5, 0);
  for (const [index, value] of Object.entries(overrides)) {
    lm[Number(index)] = value;
  }
  return lm;
}

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} !== ${expected}`);
}

test('returns null for a null hand', () => {
  assert.equal(computePalmAnchor(null), null);
});

test('returns null for an incomplete hand', () => {
  assert.equal(computePalmAnchor(makeHand().slice(0, 17)), null);
});

test('places the palm center at the average of wrist and MCP landmarks', () => {
  const anchor = computePalmAnchor(makeHand());
  assert.ok(anchor);
  assertClose(anchor.x, (0.2 + 0.3 + 0.42 + 0.54 + 0.66) / 5);
  assertClose(anchor.y, (0.6 + 0.42 + 0.38 + 0.42 + 0.5) / 5);
  assertClose(anchor.z, (0 - 0.01 - 0.02 - 0.01 + 0) / 5);
  assert.equal(anchor.confidence, 1);
});

test('increases scale as index and pinky MCP landmarks spread apart', () => {
  const narrow = computePalmAnchor(
    makeHand({
      5: pt(0.38, 0.42),
      17: pt(0.48, 0.5),
    })
  );
  const wide = computePalmAnchor(
    makeHand({
      5: pt(0.22, 0.42),
      17: pt(0.78, 0.5),
    })
  );
  assert.ok(narrow);
  assert.ok(wide);
  assert.ok(wide.scale > narrow.scale);
});

test('returns a finite roll value for a normal hand fixture', () => {
  const anchor = computePalmAnchor(makeHand());
  assert.ok(anchor);
  assert.equal(Number.isFinite(anchor.roll), true);
});
