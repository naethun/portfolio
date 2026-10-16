import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCaseStudyBody } from './caseStudyBody.mjs';

test('an intro paragraph followed by hyphen bullets becomes a paragraph and one list', () => {
  const desc = `Aesthetic is an all-in-one shopping platform.

    - Users can upload an image.

    - Led zero-downtime migration from DynamoDB to PostgreSQL.
    `;

  assert.deepEqual(parseCaseStudyBody(desc), [
    { type: 'paragraph', text: 'Aesthetic is an all-in-one shopping platform.' },
    {
      type: 'list',
      items: [
        'Users can upload an image.',
        'Led zero-downtime migration from DynamoDB to PostgreSQL.',
      ],
    },
  ]);
});

test('paragraph-only text stays as separate paragraphs and keeps line breaks inside a block', () => {
  const desc = `Full-stack development by me & my colleague.

      Some features that we had:
      MagicEden NFT Sniper, user set a price.
      Multi-Threaded CandyMachine NFT Minter.`;

  assert.deepEqual(parseCaseStudyBody(desc), [
    { type: 'paragraph', text: 'Full-stack development by me & my colleague.' },
    {
      type: 'paragraph',
      text: 'Some features that we had:\nMagicEden NFT Sniper, user set a price.\nMulti-Threaded CandyMachine NFT Minter.',
    },
  ]);
});

test('bullets separated by a paragraph form two lists in reading order', () => {
  const desc = `Intro.

  - One.

  Middle note.

  - Two.`;

  assert.deepEqual(parseCaseStudyBody(desc), [
    { type: 'paragraph', text: 'Intro.' },
    { type: 'list', items: ['One.'] },
    { type: 'paragraph', text: 'Middle note.' },
    { type: 'list', items: ['Two.'] },
  ]);
});

test('empty or blank text produces no blocks', () => {
  assert.deepEqual(parseCaseStudyBody(''), []);
  assert.deepEqual(parseCaseStudyBody('   \n\n  '), []);
  assert.deepEqual(parseCaseStudyBody(undefined), []);
});
