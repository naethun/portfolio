import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('./WorkCard.tsx', import.meta.url), 'utf8');

test('highlight metadata stacks on narrow cards and aligns inline at wider breakpoints', () => {
  assert.match(
    source,
    /mt-2[^"\n]*flex-col[^"\n]*sm:flex-row[^"\n]*sm:items-baseline/,
  );
});

test('above-the-fold highlight images load eagerly', () => {
  assert.match(source, /<Image[\s\S]*?loading="eager"/);
});
