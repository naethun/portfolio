import manifestJson from './manifest.json';
import type { ShoppableManifest } from './types';

/**
 * Server-side loader for the shoppable manifest (companion to
 * `getUniverseMedia`). Statically imported so the JSON ships with the build;
 * filters out malformed or empty entries so `/loop` can never break on a
 * bad manifest — worst case an image is simply not shoppable.
 */
export function getShoppable(): ShoppableManifest {
  const manifest = manifestJson as unknown as ShoppableManifest;
  const valid: ShoppableManifest = {};
  for (const [filename, entry] of Object.entries(manifest)) {
    if (!entry || typeof entry.shortCode !== 'string' || !Array.isArray(entry.items)) continue;
    const items = entry.items.filter(
      (item) =>
        item &&
        typeof item.boundId === 'string' &&
        item.anchor &&
        typeof item.anchor.x === 'number' &&
        typeof item.anchor.y === 'number' &&
        item.box &&
        Array.isArray(item.products) &&
        item.products.length > 0 &&
        typeof item.products[0].url === 'string',
    );
    if (items.length === 0) continue;
    valid[filename] = { ...entry, items };
  }
  return valid;
}
