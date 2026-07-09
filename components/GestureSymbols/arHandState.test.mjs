import test from 'node:test';
import assert from 'node:assert/strict';

import { getARHandState, symbolForLeftHand } from './arHandState.ts';

function pt(x, y, z = 0) {
  return { x, y, z };
}

function handWithExtendedCount(count, xOffset = 0) {
  const lm = Array.from({ length: 21 }, () => pt(xOffset, 0));
  lm[0] = pt(xOffset, 0);
  const fingers = [
    [5, 8],
    [9, 12],
    [13, 16],
    [17, 20],
  ];
  for (let i = 0; i < fingers.length; i++) {
    const [mcp, tip] = fingers[i];
    const x = xOffset + (i - 1.5) * 0.12;
    lm[mcp] = pt(x, 1);
    lm[tip] = pt(x, i < count ? 1.35 : 0.78);
  }
  return lm;
}

function result(entries) {
  return {
    landmarks: entries.map((entry) => entry.landmarks),
    handedness: entries.map((entry) => [{ categoryName: entry.label }]),
  };
}

test('uses the left hand for symbol selection even when right hand differs', () => {
  const state = symbolForLeftHand(
    result([
      { label: 'Right', landmarks: handWithExtendedCount(4, 1) },
      { label: 'Left', landmarks: handWithExtendedCount(2, 2) },
    ])
  );
  assert.equal(state, 'ring');
});

test('returns cross when the left hand is absent', () => {
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Right', landmarks: handWithExtendedCount(4, 1) }])
    ),
    'cross'
  );
});

test('maps left closed or one raised finger to cross', () => {
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Left', landmarks: handWithExtendedCount(0, 1) }])
    ),
    'cross'
  );
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Left', landmarks: handWithExtendedCount(1, 1) }])
    ),
    'cross'
  );
});

test('maps left two, three, and four raised fingers to ring, square, and star', () => {
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Left', landmarks: handWithExtendedCount(2, 1) }])
    ),
    'ring'
  );
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Left', landmarks: handWithExtendedCount(3, 1) }])
    ),
    'square'
  );
  assert.equal(
    symbolForLeftHand(
      result([{ label: 'Left', landmarks: handWithExtendedCount(4, 1) }])
    ),
    'star'
  );
});

test('returns a right-palm anchor independently from left-hand selection', () => {
  const arState = getARHandState(
    result([
      { label: 'Right', landmarks: handWithExtendedCount(4, 1) },
      { label: 'Left', landmarks: handWithExtendedCount(2, 2) },
    ])
  );
  assert.equal(arState.symbol, 'ring');
  assert.ok(arState.palmAnchor);
  assert.equal(arState.userRightDetected, true);
  assert.equal(arState.userLeftDetected, true);
});

test('uses a lone detected hand as the palm anchor even when handedness is mirrored', () => {
  const arState = getARHandState(
    result([{ label: 'Left', landmarks: handWithExtendedCount(4, 1) }])
  );

  assert.ok(arState.palmAnchor);
  assert.equal(arState.userLeftDetected, true);
});
