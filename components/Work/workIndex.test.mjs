import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getHighlightMeta,
  getWorkRowMeta,
  partitionWorkItems,
  workItemId,
} from './workIndex.mjs';

const role = (id, roleTitle, company, date) => ({
  kind: 'role',
  data: { id, role: roleTitle, company, date },
});

const project = (id, title, category, date) => ({
  kind: 'project',
  data: { id, title, category, date },
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

test('getWorkRowMeta formats roles and projects without losing dates', () => {
  assert.deepEqual(getWorkRowMeta(items[2]), {
    label: 'Software Engineer @ Daedastream',
    date: 'June 2025 - December 2025',
  });
  assert.deepEqual(getWorkRowMeta(items[7]), {
    label: 'Chrome Extension @ Telios AIO',
    date: 'Dec 2022 - April 2023',
  });
});

test('getHighlightMeta exposes the correct image and a compact editorial date', () => {
  const aesthetic = {
    ...items[0],
    data: { ...items[0].data, img: '/aedemo1.gif' },
  };
  const redacted = {
    ...items[6],
    data: { ...items[6].data, image: '/redacted.png' },
  };

  assert.deepEqual(getHighlightMeta(aesthetic), {
    title: 'Aesthetic',
    image: '/aedemo1.gif',
    date: 'Dec 2025 — now',
  });
  assert.deepEqual(getHighlightMeta(redacted), {
    title: 'Redacted CLI',
    image: '/redacted.png',
    date: 'Jul 2022 — Jan 2023',
  });
});
