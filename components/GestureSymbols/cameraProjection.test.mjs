import test from 'node:test';
import assert from 'node:assert/strict';

import {
  framePointToWorld,
  mediaPipeToCoveredFramePoint,
} from './cameraProjection.ts';

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} !== ${expected}`);
}

test('maps a centered point to the frame center without mirroring', () => {
  const point = mediaPipeToCoveredFramePoint(
    { x: 0.5, y: 0.5 },
    { width: 1920, height: 1080 },
    { width: 900, height: 1600 },
    false
  );
  assertClose(point.x, 450);
  assertClose(point.y, 800);
});

test('maps a centered point to the frame center with mirroring', () => {
  const point = mediaPipeToCoveredFramePoint(
    { x: 0.5, y: 0.5 },
    { width: 1920, height: 1080 },
    { width: 900, height: 1600 },
    true
  );
  assertClose(point.x, 450);
  assertClose(point.y, 800);
});

test('flips x when mirrored', () => {
  const unmirrored = mediaPipeToCoveredFramePoint(
    { x: 0.25, y: 0.5 },
    { width: 1000, height: 1000 },
    { width: 500, height: 500 },
    false
  );
  const mirrored = mediaPipeToCoveredFramePoint(
    { x: 0.25, y: 0.5 },
    { width: 1000, height: 1000 },
    { width: 500, height: 500 },
    true
  );
  assertClose(unmirrored.x, 125);
  assertClose(mirrored.x, 375);
});

test('accounts for horizontal crop when a wide video covers a 9:16 frame', () => {
  const leftEdge = mediaPipeToCoveredFramePoint(
    { x: 0, y: 0.5 },
    { width: 1920, height: 1080 },
    { width: 900, height: 1600 },
    false
  );
  const rightEdge = mediaPipeToCoveredFramePoint(
    { x: 1, y: 0.5 },
    { width: 1920, height: 1080 },
    { width: 900, height: 1600 },
    false
  );
  assertClose(leftEdge.x, -972.2222222222222);
  assertClose(leftEdge.y, 800);
  assertClose(rightEdge.x, 1872.2222222222222);
});

test('accounts for vertical crop when a tall video covers a 9:16 frame', () => {
  const topEdge = mediaPipeToCoveredFramePoint(
    { x: 0.5, y: 0 },
    { width: 720, height: 1920 },
    { width: 900, height: 1600 },
    false
  );
  const bottomEdge = mediaPipeToCoveredFramePoint(
    { x: 0.5, y: 1 },
    { width: 720, height: 1920 },
    { width: 900, height: 1600 },
    false
  );
  assertClose(topEdge.x, 450);
  assertClose(topEdge.y, -400);
  assertClose(bottomEdge.y, 2000);
});

test('maps frame points into orthographic world coordinates', () => {
  const center = framePointToWorld({ x: 450, y: 800 }, { width: 900, height: 1600 }, 10);
  const topLeft = framePointToWorld({ x: 0, y: 0 }, { width: 900, height: 1600 }, 10);
  assertClose(center.x, 0);
  assertClose(center.y, 0);
  assert.ok(topLeft.x < 0);
  assert.ok(topLeft.y > 0);
});
