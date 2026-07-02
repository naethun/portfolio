/**
 * Pure transforms: AESTHETIC `GET /mobile/outfit/{shortCode}` payload →
 * portfolio shoppable-manifest entry (see lib/shoppable/types.ts).
 * Dependency-free so it runs under `node --test`.
 */

const MAX_PRODUCTS_PER_ITEM = 5;

/**
 * Bound coordinates may arrive in source-image pixels OR already normalized
 * 0–1. width/height may be NEGATIVE because the stored corner order is
 * inverted (the "x,y" corner is bottom-right, width/height point back toward
 * top-left) — rectify with min/abs before scaling.
 * Returns { box, anchor } normalized 0–1, or null if unusable.
 */
export function normalizeBox(coordinates, imgWidth, imgHeight) {
  const { x, y, width, height, centerX, centerY } = coordinates ?? {};
  const values = [x, y, width, height, centerX, centerY];
  if (values.some((v) => typeof v !== 'number' || Number.isNaN(v))) return null;
  if (!(imgWidth > 0) || !(imgHeight > 0)) return null;

  // Rectify orientation first: x/y may point at any corner depending on
  // which way width/height run.
  const left = Math.min(x, x + width);
  const top = Math.min(y, y + height);
  const w = Math.abs(width);
  const h = Math.abs(height);

  const alreadyNormalized = values.every((v) => Math.abs(v) <= 1.5);
  const scaleX = (v) => (alreadyNormalized ? v : v / imgWidth);
  const scaleY = (v) => (alreadyNormalized ? v : v / imgHeight);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return {
    box: { x: clamp(scaleX(left)), y: clamp(scaleY(top)), w: clamp(scaleX(w)), h: clamp(scaleY(h)) },
    anchor: { x: clamp(scaleX(centerX)), y: clamp(scaleY(centerY)) },
  };
}

function safeHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Outfit-endpoint recommendation (camelCase fields) → ShoppableProduct, or null. */
export function transformProduct(rec) {
  if (!rec || typeof rec.productUrl !== 'string' || rec.productUrl.length === 0) return null;
  return {
    name: rec.name ?? 'Untitled product',
    brand: rec.brand ?? null,
    price: typeof rec.price === 'number' ? rec.price : null,
    currency: rec.currency ?? 'USD',
    url: rec.productUrl,
    image: rec.imageUrl ?? null,
    localImage: null, // filled in by the generator after thumbnail download
    merchant: rec.storeDomain ?? safeHostname(rec.productUrl),
  };
}

/**
 * Whole outfit payload → manifest entry for one image, or null when nothing
 * usable survived (no bounds, or every bound lacked coords/products).
 */
export function buildManifestEntry({ outfit, imgWidth, imgHeight }) {
  const image = outfit?.images?.[0];
  if (!image || !Array.isArray(image.bounds)) return null;

  const items = [];
  for (const bound of image.bounds) {
    const normalized = normalizeBox(bound.coordinates, imgWidth, imgHeight);
    if (!normalized) continue;
    const products = (bound.recommendations ?? [])
      .map(transformProduct)
      .filter(Boolean)
      .slice(0, MAX_PRODUCTS_PER_ITEM);
    if (products.length === 0) continue;
    items.push({
      boundId: bound.boundId,
      label: bound.productInfo?.label ?? 'item',
      category: bound.productInfo?.category ?? null,
      anchor: normalized.anchor,
      box: normalized.box,
      maskUrl: bound.maskUrl ?? null,
      localMask: null, // filled in by the generator after mask download
      products,
    });
  }

  if (items.length === 0) return null;
  return {
    shortCode: outfit.shortCode,
    generatedAt: new Date().toISOString(),
    items,
  };
}
