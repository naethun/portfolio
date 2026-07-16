import assert from 'node:assert/strict';
import test from 'node:test';

import { ageLine, statusRoles, statusSignals } from './statusRail.mjs';

test('the status rail opens with the approved age line and no section label', () => {
  assert.equal(ageLine, "i'm a 22 year old...");
  const visibleCopy = JSON.stringify({ ageLine, statusRoles, statusSignals });
  assert.doesNotMatch(visibleCopy, /currently|selected signals/i);
});

test('the status rail keeps the three approved current roles in reading order', () => {
  assert.deepEqual(
    statusRoles.map(({ index, title }) => ({ index, title })),
    [
      { index: '01', title: 'Founding Engineer @ Aesthetic' },
      { index: '02', title: 'Head of Growth @ storytolds ✸' },
      { index: '03', title: 'Design + Interaction + CS @ UCSD' },
    ],
  );
});

test('the status rail closes with only the two selected proof signals', () => {
  assert.deepEqual(statusSignals, [
    { value: '50M+', copy: 'organic views across social content' },
    { value: '$350K+', copy: 'profit generated for users by age 17' },
  ]);
});
