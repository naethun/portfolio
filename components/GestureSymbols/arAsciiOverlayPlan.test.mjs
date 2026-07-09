import test from 'node:test';
import assert from 'node:assert/strict';

import { buildARAsciiOverlayPlan } from './arAsciiOverlayPlan.ts';
import { SYMBOL_TEXT_TEXTURES } from './textField.ts';

test('builds the palm popup from ASCII symbol texture commands', () => {
  const plan = buildARAsciiOverlayPlan({
    symbol: 'star',
    size: 156,
    timeSeconds: 0,
  });
  const pool = new Set(SYMBOL_TEXT_TEXTURES.star.chars);

  assert.ok(plan.commands.length > 30);
  assert.equal(plan.commands.every((command) => pool.has(command.glyph)), true);
  assert.ok(plan.fontPx > 0);
});

test('uses a transparent canvas plan instead of a solid symbol fill', () => {
  const plan = buildARAsciiOverlayPlan({
    symbol: 'ring',
    size: 156,
    timeSeconds: 0,
  });

  assert.equal(plan.background, 'transparent');
  assert.equal(plan.kind, 'ascii-mask');
});

test('describes the palm popup as a 3/4 tilted ASCII volume', () => {
  const plan = buildARAsciiOverlayPlan({
    symbol: 'star',
    size: 156,
    timeSeconds: 0,
  });
  assert.ok(Array.isArray(plan.layers));
  assert.ok(plan.tilt);
  const zValues = new Set(plan.layers.map((layer) => layer.translateZ));

  assert.ok(plan.layers.length >= 4);
  assert.ok(Math.abs(plan.tilt.rotateY) > 12);
  assert.ok(Math.abs(plan.tilt.rotateX) > 8);
  assert.ok(plan.tilt.perspective > 300);
  assert.equal(zValues.size, plan.layers.length);
  assert.ok(plan.layers.some((layer) => Math.abs(layer.translateX) > 1));
});
