import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveARSymbolTargetTransform,
  SYMBOL_LOCAL_Y_OFFSET,
  SYMBOL_MAX_TARGET_SCALE,
} from './arSymbolTransform.ts';

test('keeps an open-palm symbol target visible instead of lifting it out of frame', () => {
  const target = resolveARSymbolTargetTransform({
    palmAnchor: {
      x: 0.5,
      y: 0.5,
      z: 0,
      scale: 0.58,
      roll: 0,
      confidence: 1,
    },
    videoSize: { width: 390, height: 844 },
    frameSize: { width: 390, height: 844 },
    fallbackVisible: false,
    worldHeight: 10,
  });

  assert.equal(target.opacity, 1);
  assert.equal(target.scale <= SYMBOL_MAX_TARGET_SCALE, true);
  assert.equal(
    Math.abs(target.position.y + target.scale * SYMBOL_LOCAL_Y_OFFSET) < 3.35,
    true
  );
});
