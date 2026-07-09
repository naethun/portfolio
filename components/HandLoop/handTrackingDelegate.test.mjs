import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HAND_TRACKING_DELEGATES,
  createWithHandDelegateFallback,
} from './handTrackingDelegate.ts';

test('tries GPU before CPU for hand tracking', () => {
  assert.deepEqual(HAND_TRACKING_DELEGATES, ['GPU', 'CPU']);
});

test('falls back to CPU when GPU hand tracking creation fails', async () => {
  const attempts = [];
  const landmarker = await createWithHandDelegateFallback(async (delegate) => {
    attempts.push(delegate);
    if (delegate === 'GPU') throw new Error('gpu unavailable');
    return { delegate };
  });

  assert.deepEqual(attempts, ['GPU', 'CPU']);
  assert.deepEqual(landmarker, { delegate: 'CPU' });
});
