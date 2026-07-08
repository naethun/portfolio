import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { claimBoundSearch } from './boundSearchLocks.mjs';

describe('claimBoundSearch', () => {
  it('locks a bound as soon as search starts and rejects duplicate searches', () => {
    const searched = new Set();

    assert.equal(claimBoundSearch(searched, 'upper-body'), true);
    assert.equal(claimBoundSearch(searched, 'upper-body'), false);
    assert.deepEqual([...searched], ['upper-body']);
  });

  it('allows a different bound to be searched without unlocking the first one', () => {
    const searched = new Set(['upper-body']);

    assert.equal(claimBoundSearch(searched, 'lower-body'), true);
    assert.deepEqual([...searched], ['upper-body', 'lower-body']);
  });
});
