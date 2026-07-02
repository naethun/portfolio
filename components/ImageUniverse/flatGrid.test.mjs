import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFlatGrid } from './flatGrid.mjs';

test('returns empty for count 0', () => {
  assert.equal(computeFlatGrid(0).length, 0);
});

test('single image sits at the origin', () => {
  assert.deepEqual([...computeFlatGrid(1, { spacingX: 8, spacingY: 8 })], [0, 0, 0]);
});

test('auto columns = ceil(sqrt(count)); fills left→right, top→bottom', () => {
  // 9 images → 3 columns, 3 rows. Last cell k=8 is col 2, row 2.
  const g = computeFlatGrid(9, { spacingX: 1, spacingY: 1 });
  assert.equal(g[8 * 3], 1); // col 2 → (2 - (3-1)/2) * 1 = 1
  assert.equal(g[8 * 3 + 1], -1); // row 2 → ((3-1)/2 - 2) * 1 = -1
});

test('2x2 grid is centered and symmetric', () => {
  const g = computeFlatGrid(4, { columns: 2, spacingX: 2, spacingY: 2 });
  assert.deepEqual([...g], [
    -1, 1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, -1, 0,
  ]);
});

test('a full rectangular grid is centered on the origin', () => {
  const g = computeFlatGrid(6, { columns: 3, spacingX: 5, spacingY: 5 });
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < 6; k++) {
    sx += g[k * 3];
    sy += g[k * 3 + 1];
  }
  assert.ok(Math.abs(sx) < 1e-6);
  assert.ok(Math.abs(sy) < 1e-6);
});

test('z is always 0', () => {
  const g = computeFlatGrid(7, { columns: 3 });
  for (let k = 0; k < 7; k++) assert.equal(g[k * 3 + 2], 0);
});
