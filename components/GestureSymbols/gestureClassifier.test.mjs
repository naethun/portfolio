import test from 'node:test';
import assert from 'node:assert/strict';

import {
  countExtendedFingers,
  symbolForFingerCount,
} from './gestureClassifier.ts';

function pt(x, y, z = 0) {
  return { x, y, z };
}

function handWithExtendedCount(count) {
  const lm = Array.from({ length: 21 }, () => pt(0, 0));
  lm[0] = pt(0, 0);
  const fingers = [
    [5, 8],
    [9, 12],
    [13, 16],
    [17, 20],
  ];
  for (let i = 0; i < fingers.length; i++) {
    const [mcp, tip] = fingers[i];
    const x = (i - 1.5) * 0.12;
    lm[mcp] = pt(x, 1);
    lm[tip] = pt(x, i < count ? 1.35 : 0.78);
  }
  return lm;
}

test('counts index through pinky raised fingers', () => {
  for (let count = 0; count <= 4; count++) {
    assert.equal(countExtendedFingers(handWithExtendedCount(count)), count);
  }
});

test('maps closed/rest and 1-4 raised fingers to symbol numbers', () => {
  assert.equal(symbolForFingerCount(false, 4), 'cross');
  assert.equal(symbolForFingerCount(true, 0), 'cross');
  assert.equal(symbolForFingerCount(true, 1), 'cross');
  assert.equal(symbolForFingerCount(true, 2), 'ring');
  assert.equal(symbolForFingerCount(true, 3), 'square');
  assert.equal(symbolForFingerCount(true, 4), 'star');
});
