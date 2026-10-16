import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./WorkCard.tsx', import.meta.url), 'utf8');

test('title and date stack on narrow cards and share a line once the card is wide enough', () => {
  assert.match(
    source,
    /flex-col[^"\n]*@min-\[230px\]:flex-row[^"\n]*@min-\[230px\]:items-baseline/,
  );
});

test('the descriptor wraps after the role, never inside it', () => {
  assert.match(source, /whitespace-nowrap">\{lead\} ·<\/span>/);
});

test('above-the-fold highlight images load eagerly', () => {
  assert.match(source, /<Image[\s\S]*?loading="eager"/);
});
