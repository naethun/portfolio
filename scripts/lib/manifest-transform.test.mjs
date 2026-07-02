import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBox,
  transformProduct,
  buildManifestEntry,
} from './manifest-transform.mjs';

const REC = {
  name: 'Studded leather over-knee boot',
  brand: 'Acme',
  price: 240,
  currency: 'USD',
  imageUrl: 'https://cdn.example.com/boot.jpg',
  productUrl: 'https://www.example.com/products/boot',
  storeDomain: 'example.com',
};

function makeOutfit(bounds) {
  return {
    shortCode: 'abc123',
    images: [{ imageUrl: 'https://s3.example.com/img.jpg', imageIndex: 0, bounds }],
  };
}

test('normalizeBox converts pixel coordinates to 0-1 against image dims', () => {
  const { box, anchor } = normalizeBox(
    { x: 100, y: 200, width: 300, height: 400, centerX: 250, centerY: 400 },
    1000,
    2000,
  );
  assert.deepEqual(box, { x: 0.1, y: 0.1, w: 0.3, h: 0.2 });
  assert.deepEqual(anchor, { x: 0.25, y: 0.2 });
});

test('normalizeBox passes through already-normalized coordinates', () => {
  const { box, anchor } = normalizeBox(
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4, centerX: 0.25, centerY: 0.4 },
    1000,
    2000,
  );
  assert.deepEqual(box, { x: 0.1, y: 0.2, w: 0.3, h: 0.4 });
  assert.deepEqual(anchor, { x: 0.25, y: 0.4 });
});

test('normalizeBox rectifies inverted (negative width/height) normalized coordinates', () => {
  const { box, anchor } = normalizeBox(
    { x: 0.776301, y: 0.967152, width: -0.331915, height: -0.56355, centerX: 0.610344, centerY: 0.685377 },
    1000,
    2000,
  );
  const approxEqual = (actual, expected) => assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${actual} to be within 1e-9 of ${expected}`,
  );
  approxEqual(box.x, 0.444386);
  approxEqual(box.y, 0.403602);
  approxEqual(box.w, 0.331915);
  approxEqual(box.h, 0.56355);
  approxEqual(anchor.x, 0.610344);
  approxEqual(anchor.y, 0.685377);
});

test('normalizeBox rectifies inverted pixel coordinates', () => {
  const { box, anchor } = normalizeBox(
    { x: 800, y: 1900, width: -300, height: -500, centerX: 650, centerY: 1650 },
    1000,
    2000,
  );
  assert.deepEqual(box, { x: 0.5, y: 0.7, w: 0.3, h: 0.25 });
  assert.deepEqual(anchor, { x: 0.65, y: 0.825 });
});

test('normalizeBox rejects missing/NaN coordinates', () => {
  assert.equal(normalizeBox({ x: 1 }, 1000, 2000), null);
  assert.equal(normalizeBox({ x: NaN, y: 1, width: 1, height: 1, centerX: 1, centerY: 1 }, 1000, 2000), null);
});

test('transformProduct maps outfit recommendation fields and defaults', () => {
  assert.deepEqual(transformProduct(REC), {
    name: 'Studded leather over-knee boot',
    brand: 'Acme',
    price: 240,
    currency: 'USD',
    url: 'https://www.example.com/products/boot',
    image: 'https://cdn.example.com/boot.jpg',
    localImage: null,
    merchant: 'example.com',
  });
  // merchant falls back to the product URL hostname (www stripped)
  assert.equal(
    transformProduct({ ...REC, storeDomain: null }).merchant,
    'example.com',
  );
  // no productUrl → unusable
  assert.equal(transformProduct({ ...REC, productUrl: null }), null);
});

test('buildManifestEntry keeps only bounds with valid coords and ≥1 product, caps at 5', () => {
  const bound = (overrides) => ({
    boundId: 'b1',
    productInfo: { label: 'knee high boots', category: 'boots', confidence: 0.9 },
    coordinates: { x: 100, y: 200, width: 300, height: 400, centerX: 250, centerY: 400 },
    recommendations: [REC],
    ...overrides,
  });
  const outfit = makeOutfit([
    bound({}),
    bound({ boundId: 'b2', recommendations: [] }), // dropped: no products
    bound({ boundId: 'b3', coordinates: { x: NaN } }), // dropped: bad coords
    bound({
      boundId: 'b4',
      recommendations: Array.from({ length: 8 }, (_, i) => ({
        ...REC,
        productUrl: `https://www.example.com/p/${i}`,
      })),
    }),
  ]);
  const entry = buildManifestEntry({ outfit, imgWidth: 1000, imgHeight: 2000 });
  assert.equal(entry.shortCode, 'abc123');
  assert.equal(typeof entry.generatedAt, 'string');
  assert.deepEqual(entry.items.map((i) => i.boundId), ['b1', 'b4']);
  assert.equal(entry.items[0].label, 'knee high boots');
  assert.equal(entry.items[1].products.length, 5);
});

test('buildManifestEntry carries maskUrl through and leaves localMask null', () => {
  const outfit = makeOutfit([
    {
      boundId: 'b1',
      productInfo: { label: 'boots', category: 'boots', confidence: 0.9 },
      coordinates: { x: 100, y: 200, width: 300, height: 400, centerX: 250, centerY: 400 },
      maskUrl: 'https://s3.example.com/masks/b1.png',
      recommendations: [REC],
    },
    {
      boundId: 'b2',
      productInfo: { label: 'top', category: 'tops', confidence: 0.8 },
      coordinates: { x: 100, y: 200, width: 300, height: 400, centerX: 250, centerY: 400 },
      recommendations: [REC], // no maskUrl at all
    },
  ]);
  const entry = buildManifestEntry({ outfit, imgWidth: 1000, imgHeight: 2000 });
  assert.equal(entry.items[0].maskUrl, 'https://s3.example.com/masks/b1.png');
  assert.equal(entry.items[0].localMask, null);
  assert.equal(entry.items[1].maskUrl, null);
  assert.equal(entry.items[1].localMask, null);
});

test('buildManifestEntry returns null when nothing survives', () => {
  assert.equal(buildManifestEntry({ outfit: makeOutfit([]), imgWidth: 10, imgHeight: 10 }), null);
  assert.equal(buildManifestEntry({ outfit: {}, imgWidth: 10, imgHeight: 10 }), null);
});
