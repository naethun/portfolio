import test from 'node:test';
import assert from 'node:assert/strict';

import { splitHandRoles } from './handRoles.ts';

function pt(x, y, z = 0) {
  return { x, y, z };
}

function hand(offset = 0) {
  return Array.from({ length: 21 }, (_, i) => pt(offset + i * 0.01, i * 0.01));
}

function result(entries) {
  return {
    landmarks: entries.map((entry) => entry.landmarks),
    handedness: entries.map((entry) =>
      entry.label ? [{ categoryName: entry.label }] : []
    ),
  };
}

test('returns empty roles for a null result', () => {
  assert.deepEqual(splitHandRoles(null), {
    userRight: null,
    userLeft: null,
  });
});

test('treats a Right label as the user right hand', () => {
  const right = hand(1);
  const roles = splitHandRoles(result([{ label: 'Right', landmarks: right }]));
  assert.equal(roles.userRight, right);
  assert.equal(roles.userLeft, null);
  assert.equal(roles.userRightLabel, 'Right');
});

test('treats a Left label as the user left hand', () => {
  const left = hand(2);
  const roles = splitHandRoles(result([{ label: 'Left', landmarks: left }]));
  assert.equal(roles.userRight, null);
  assert.equal(roles.userLeft, left);
  assert.equal(roles.userLeftLabel, 'Left');
});

test('splits both labeled hands into user roles', () => {
  const right = hand(3);
  const left = hand(4);
  const roles = splitHandRoles(
    result([
      { label: 'Left', landmarks: left },
      { label: 'Right', landmarks: right },
    ])
  );
  assert.equal(roles.userRight, right);
  assert.equal(roles.userLeft, left);
});

test('falls back to the first hand as user right when labels are missing', () => {
  const fallback = hand(5);
  const roles = splitHandRoles(result([{ landmarks: fallback }]));
  assert.equal(roles.userRight, fallback);
  assert.equal(roles.userLeft, null);
  assert.equal(roles.userRightLabel, undefined);
});
