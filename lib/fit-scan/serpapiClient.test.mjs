import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FitScanSearchError,
  getSerpApiConfig,
  searchGoogleLens,
} from './serpapiClient.mjs';

describe('getSerpApiConfig', () => {
  it('throws an honest config error when SERPAPI_API_KEY is missing', () => {
    assert.throws(
      () => getSerpApiConfig({}),
      (err) =>
        err instanceof FitScanSearchError &&
        err.code === 'SERPAPI_NOT_CONFIGURED',
    );
  });
});

describe('searchGoogleLens', () => {
  it('calls SerpApi Google Lens with type=products first and returns the best live match', async () => {
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(new URL(url));
      return Response.json({
        product_results: [
          {
            title: 'Leather jacket',
            source: 'Grailed',
            link: 'https://shop.example.com/leather-jacket',
            thumbnail: 'https://images.example.com/leather-jacket.jpg',
          },
        ],
      });
    };

    const result = await searchGoogleLens({
      imageUrl: 'https://cdn.example.com/crop.jpg',
      config: getSerpApiConfig({ SERPAPI_API_KEY: 'serp-secret' }),
      fetchImpl,
    });

    assert.equal(result.match.title, 'Leather jacket');
    assert.equal(urls[0].searchParams.get('engine'), 'google_lens');
    assert.equal(urls[0].searchParams.get('type'), 'products');
    assert.equal(urls[0].searchParams.get('api_key'), 'serp-secret');
  });

  it('makes one additional live Lens request without product type when products are empty', async () => {
    const urls = [];
    const responses = [
      { product_results: [] },
      {
        visual_matches: [
          {
            title: 'Similar boot',
            source: 'eBay',
            link: 'https://shop.example.com/boot',
          },
        ],
      },
    ];
    const fetchImpl = async (url) => {
      urls.push(new URL(url));
      return Response.json(responses.shift());
    };

    const result = await searchGoogleLens({
      imageUrl: 'https://cdn.example.com/crop.jpg',
      config: getSerpApiConfig({ SERPAPI_API_KEY: 'serp-secret' }),
      fetchImpl,
    });

    assert.equal(result.match.title, 'Similar boot');
    assert.equal(urls.length, 2);
    assert.equal(urls[0].searchParams.get('type'), 'products');
    assert.equal(urls[1].searchParams.has('type'), false);
  });

  it('returns a no-match result when live SerpApi responses have no usable matches', async () => {
    const result = await searchGoogleLens({
      imageUrl: 'https://cdn.example.com/crop.jpg',
      config: getSerpApiConfig({ SERPAPI_API_KEY: 'serp-secret' }),
      fetchImpl: async () =>
        Response.json({
          product_results: [],
          visual_matches: [],
          exact_matches: [],
        }),
    });

    assert.equal(result.match, null);
  });
});
