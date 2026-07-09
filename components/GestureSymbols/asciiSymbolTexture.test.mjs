import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAsciiSymbolDrawCommands } from './asciiSymbolTexture.ts';
import { SYMBOL_TEXT_TEXTURES } from './textField.ts';

test('builds many ASCII glyph commands inside the active symbol mask', () => {
  const commands = buildAsciiSymbolDrawCommands({
    symbol: 'cross',
    width: 512,
    height: 512,
    timeSeconds: 0,
  });

  assert.ok(commands.length > 40);
  const pool = new Set(SYMBOL_TEXT_TEXTURES.cross.chars);
  assert.equal(commands.every((command) => pool.has(command.glyph)), true);
});

test('keeps the ring center hollow in the ASCII texture plan', () => {
  const commands = buildAsciiSymbolDrawCommands({
    symbol: 'ring',
    width: 512,
    height: 512,
    timeSeconds: 0,
  });
  const centerGlyphs = commands.filter(
    (command) =>
      Math.abs(command.x - 256) < 40 && Math.abs(command.y - 256) < 40
  );

  assert.equal(centerGlyphs.length, 0);
});
