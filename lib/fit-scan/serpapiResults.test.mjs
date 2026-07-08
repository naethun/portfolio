import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildGoogleLensUrl,
  selectBestLensResult,
} from './serpapiResults.mjs';

describe('buildGoogleLensUrl', () => {
  it('keeps Google Lens search server-side and requests product results', () => {
    const url = buildGoogleLensUrl({
      apiKey: 'secret-key',
      imageUrl: 'https://cdn.example.com/crop.jpg',
      type: 'products',
    });

    assert.equal(url.origin, 'https://serpapi.com');
    assert.equal(url.pathname, '/search.json');
    assert.equal(url.searchParams.get('engine'), 'google_lens');
    assert.equal(url.searchParams.get('url'), 'https://cdn.example.com/crop.jpg');
    assert.equal(url.searchParams.get('type'), 'products');
    assert.equal(url.searchParams.get('api_key'), 'secret-key');
  });
});

describe('selectBestLensResult', () => {
  it('prefers a live product result and labels it Best match', () => {
    const match = selectBestLensResult({
      product_results: [
        {
          title: 'Waxed Denim Jacket',
          source: 'SSENSE',
          link: 'https://shop.example.com/jacket',
          thumbnail: 'https://images.example.com/jacket.jpg',
          price: '$420',
          in_stock: true,
          condition: 'New',
        },
      ],
      visual_matches: [
        {
          title: 'Similar jacket',
          source: 'Other Shop',
          link: 'https://other.example.com',
        },
      ],
    });

    assert.equal(match?.matchKind, 'best');
    assert.equal(match?.label, 'Best match');
    assert.equal(match?.title, 'Waxed Denim Jacket');
    assert.equal(match?.source, 'SSENSE');
    assert.equal(match?.price, '$420');
    assert.equal(match?.stock, 'In stock');
    assert.equal(match?.condition, 'New');
  });

  it('uses Exact match only for explicit exact-match buckets', () => {
    const match = selectBestLensResult({
      exact_matches: [
        {
          title: 'Exact silver ring',
          source: 'Vestiaire',
          link: 'https://shop.example.com/ring',
          image: 'https://images.example.com/ring.jpg',
        },
      ],
    });

    assert.equal(match?.matchKind, 'exact');
    assert.equal(match?.label, 'Exact match');
  });

  it('returns null when the live response has no usable result', () => {
    const match = selectBestLensResult({
      search_metadata: { status: 'Success' },
      product_results: [],
      visual_matches: [],
      exact_matches: [],
    });

    assert.equal(match, null);
  });
});
