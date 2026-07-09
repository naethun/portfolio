import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const shellSource = readFileSync(
  new URL('./ReelsModeShell.tsx', import.meta.url),
  'utf8',
);
const windowClientSource = readFileSync(
  new URL('./ReelsWindowClient.tsx', import.meta.url),
  'utf8',
);

describe('reels window stage width', () => {
  it('keeps 9:16 as the shared default and widens only window mode to 11:16', () => {
    assert.match(shellSource, /aspectRatio = '9 \/ 16'/);
    assert.match(shellSource, /style=\{\{ aspectRatio, height: '100vh'/);
    assert.match(windowClientSource, /<ReelsModeShell aspectRatio="11 \/ 16">/);
  });
});
