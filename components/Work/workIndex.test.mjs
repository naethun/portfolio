import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatDateRange,
  getHighlightMeta,
  getWorkRowMeta,
  nextWorkItemId,
  partitionWorkItems,
  workItemId,
} from './workIndex.mjs';

const role = (id, roleTitle, company, date, extra = {}) => ({
  kind: 'role',
  data: { id, role: roleTitle, company, date, ...extra },
});

const project = (id, title, category, date, extra = {}) => ({
  kind: 'project',
  data: { id, title, category, date, ...extra },
});

const items = [
  role(0, 'Founding Engineer', 'Aesthetic', 'December 2025 - Present'),
  role(1, 'Software Engineer', 'EnergeX AI', 'September 2025 - April 2026'),
  role(2, 'Software Engineer', 'Daedastream', 'June 2025 - December 2025'),
  role(4, 'Data Engineer', 'Viet Voices', 'Jan 2024 - Jul 2025'),
  role(5, 'Lead Developer & Instructor', 'Code Ninjas', 'Dec 2022 - Sept 2025'),
  role(6, 'Software Developer', 'LightningATC', 'May 2022 - Jun 2023'),
  project(9, 'Redacted CLI', 'CLI Software', 'July 2022 - Jan 2023'),
  project(1, 'Telios AIO', 'Chrome Extension', 'Dec 2022 - April 2023'),
];

test('workItemId produces the stable kind-id identity', () => {
  assert.equal(workItemId(items[0]), 'role-0');
  assert.equal(workItemId(items[6]), 'project-9');
});

test('partitionWorkItems selects exactly the four approved highlights in source order', () => {
  const { highlights } = partitionWorkItems(items);
  assert.deepEqual(highlights.map(workItemId), [
    'role-0',
    'role-1',
    'role-6',
    'project-9',
  ]);
});

test('partitionWorkItems keeps every non-highlighted item in source order', () => {
  const { other } = partitionWorkItems(items);
  assert.deepEqual(other.map(workItemId), [
    'role-2',
    'role-4',
    'role-5',
    'project-1',
  ]);
});

test('formatDateRange gives every range one compact format', () => {
  assert.equal(formatDateRange('December 2025 - Present'), 'Dec 2025 — now');
  assert.equal(formatDateRange('June 2025 - December 2025'), 'Jun 2025 — Dec 2025');
  assert.equal(formatDateRange('Dec 2022 - Sept 2025'), 'Dec 2022 — Sep 2025');
  assert.equal(formatDateRange('Jan 2024 - Jul 2025'), 'Jan 2024 — Jul 2025');
  assert.equal(formatDateRange('May 2022 - Jun 2023'), 'May 2022 — Jun 2023');
  assert.equal(formatDateRange('July 2022 - Jan 2023'), 'Jul 2022 — Jan 2023');
  assert.equal(formatDateRange('Dec 2022 - April 2023'), 'Dec 2022 — Apr 2023');
});

test('getWorkRowMeta splits name, role and date into list-view columns', () => {
  assert.deepEqual(getWorkRowMeta(items[2]), {
    name: 'Daedastream',
    role: 'Software Engineer',
    date: 'Jun 2025 — Dec 2025',
  });
  assert.deepEqual(getWorkRowMeta(items[7]), {
    name: 'Telios AIO',
    role: 'Chrome Extension',
    date: 'Dec 2022 — Apr 2023',
  });
});

test('getHighlightMeta exposes the image, a compact date and a descriptor from the data', () => {
  const aesthetic = role(0, 'Founding Engineer', 'Aesthetic', 'December 2025 - Present', {
    img: '/aedemo1.gif',
    summary: 'AI shopping platform',
  });
  const redacted = project(9, 'Redacted CLI', 'CLI Software', 'July 2022 - Jan 2023', {
    image: '/redacted.png',
    summary: 'Discord & NFT automation',
  });

  assert.deepEqual(getHighlightMeta(aesthetic), {
    title: 'Aesthetic',
    image: '/aedemo1.gif',
    date: 'Dec 2025 — now',
    descriptor: 'Founding Engineer · AI shopping platform',
  });
  assert.deepEqual(getHighlightMeta(redacted), {
    title: 'Redacted CLI',
    image: '/redacted.png',
    date: 'Jul 2022 — Jan 2023',
    descriptor: 'CLI Software · Discord & NFT automation',
  });
});

test('getHighlightMeta falls back to the role alone when there is no summary', () => {
  const plain = role(1, 'Software Engineer', 'EnergeX AI', 'September 2025 - April 2026', {
    img: '/energex.gif',
  });
  assert.equal(getHighlightMeta(plain).descriptor, 'Software Engineer');
});

test('nextWorkItemId steps through the work in order and wraps around', () => {
  assert.equal(nextWorkItemId(items, 'role-0'), 'role-1');
  assert.equal(nextWorkItemId(items, 'project-9'), 'project-1');
  assert.equal(nextWorkItemId(items, 'project-1'), 'role-0');
  assert.equal(nextWorkItemId(items, 'missing'), null);
});
