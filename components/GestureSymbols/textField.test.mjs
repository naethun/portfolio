import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SYMBOL_TEXT_TEXTURES,
  charForSymbol,
} from './textField.ts';

const symbols = ['cross', 'ring', 'square', 'star'];

test('each symbol has its own font stack', () => {
  const fonts = symbols.map((symbol) => SYMBOL_TEXT_TEXTURES[symbol].fontFamily);
  assert.equal(new Set(fonts).size, symbols.length);
});

test('each symbol has its own character pool', () => {
  const pools = symbols.map((symbol) => SYMBOL_TEXT_TEXTURES[symbol].chars.join(''));
  assert.equal(new Set(pools).size, symbols.length);
});

test('characters are selected from the active symbol pool', () => {
  for (const symbol of symbols) {
    const texture = SYMBOL_TEXT_TEXTURES[symbol];
    for (let tick = 0; tick < 12; tick++) {
      const glyph = charForSymbol(symbol, 2, 3, tick);
      assert.ok(texture.chars.includes(glyph));
    }
  }
});
