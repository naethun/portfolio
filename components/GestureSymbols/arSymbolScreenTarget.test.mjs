import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveARSymbolScreenTarget } from './arSymbolScreenTarget.ts';

const frameSize = { width: 405, height: 720 };
const videoSize = { width: 1280, height: 720 };

test('places a detected palm target inside the rendered frame', () => {
  const target = resolveARSymbolScreenTarget({
    palmAnchor: {
      x: 0.5,
      y: 0.5,
      z: 0,
      scale: 0.3,
      roll: 0,
      confidence: 1,
    },
    videoSize,
    frameSize,
  });

  assert.equal(target.opacity, 1);
  assert.ok(target.x > 0 && target.x < frameSize.width);
  assert.ok(target.y > 0 && target.y < frameSize.height);
  assert.ok(target.size >= 96);
});

test('keeps a low palm popup visible instead of letting it fall below frame', () => {
  const target = resolveARSymbolScreenTarget({
    palmAnchor: {
      x: 0.5,
      y: 0.92,
      z: 0,
      scale: 0.25,
      roll: 0,
      confidence: 1,
    },
    videoSize,
    frameSize,
  });

  assert.equal(target.opacity, 1);
  assert.ok(target.y < frameSize.height - target.size / 2);
});

test('snaps size into stable buckets so hand-scale jitter does not resize the canvas', () => {
  const base = resolveARSymbolScreenTarget({
    palmAnchor: {
      x: 0.5,
      y: 0.5,
      z: 0,
      scale: 0.18,
      roll: 0,
      confidence: 1,
    },
    videoSize,
    frameSize,
  });
  const jittered = resolveARSymbolScreenTarget({
    palmAnchor: {
      x: 0.5,
      y: 0.5,
      z: 0,
      scale: 0.181,
      roll: 0,
      confidence: 1,
    },
    videoSize,
    frameSize,
  });

  assert.equal(base.size, jittered.size);
  assert.equal(base.size % 8, 0);
});

test('hides the popup target when there is no palm', () => {
  const target = resolveARSymbolScreenTarget({
    palmAnchor: null,
    videoSize,
    frameSize,
  });

  assert.equal(target.opacity, 0);
});
