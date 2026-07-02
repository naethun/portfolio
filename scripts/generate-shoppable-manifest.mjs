/**
 * Generate lib/shoppable/manifest.json by running curated /loop images
 * through the AESTHETIC discovery pipeline (dev stage).
 *
 * Usage:
 *   AESTHETIC_API_BASE=https://…/dev \
 *   AESTHETIC_API_KEY=… \
 *   PORTFOLIO_BASE_URL=https://<deployed-portfolio-domain> \
 *   npm run shoppable:generate
 *
 * Reads scripts/shoppable-images.json (filenames under
 * public/portfolio/loop-imgs/), submits each image's public URL to
 * /save-search-query (idempotent server-side: the URL is UNIQUE, so re-runs
 * resume the cached search), polls /mobile/outfit/{shortCode} until bounds +
 * recommendations land, caches each item's top product image locally, and
 * rewrites the manifest from scratch (the list file is the source of truth).
 * Images that time out or yield nothing usable are skipped with a warning.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';
import { buildManifestEntry } from './lib/manifest-transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const IMAGES_DIR = join(ROOT, 'public/portfolio/loop-imgs');
const THUMBS_DIR = join(ROOT, 'public/portfolio/shoppable/thumbs');
const THUMBS_PUBLIC_PREFIX = '/portfolio/shoppable/thumbs';
const MASKS_DIR = join(ROOT, 'public/portfolio/shoppable/masks');
const MASKS_PUBLIC_PREFIX = '/portfolio/shoppable/masks';
const MANIFEST_PATH = join(ROOT, 'lib/shoppable/manifest.json');
const LIST_PATH = join(__dirname, 'shoppable-images.json');

const API_BASE = process.env.AESTHETIC_API_BASE?.replace(/\/$/, '');
const API_KEY = process.env.AESTHETIC_API_KEY;
const PORTFOLIO_BASE_URL = process.env.PORTFOLIO_BASE_URL?.replace(/\/$/, '');

const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 5 * 60_000;
const USER_ID = 'portfolio-universe';
const SOURCE = 'portfolio-universe';

for (const [name, value] of [
  ['AESTHETIC_API_BASE', API_BASE],
  ['AESTHETIC_API_KEY', API_KEY],
  ['PORTFOLIO_BASE_URL', PORTFOLIO_BASE_URL],
]) {
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const headers = { 'Content-Type': 'application/json', 'x-api-key': API_KEY };

async function submit(filename) {
  const imageUrl = `${PORTFOLIO_BASE_URL}/portfolio/loop-imgs/${encodeURIComponent(filename)}`;
  const res = await fetch(`${API_BASE}/save-search-query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: USER_ID, searchQuery: imageUrl, source: SOURCE }),
  });
  const data = await res.json().catch(() => ({}));
  const shortCode = data?.data?.shortCode;
  if (!res.ok || !shortCode) {
    throw new Error(`save-search-query failed (${res.status}): ${JSON.stringify(data)}`);
  }
  return shortCode;
}

/**
 * Poll until every detected bound has recommendations (pipeline finished),
 * or return the last partial payload at timeout — bounds without products
 * are dropped by the transform, matching the spec's error handling.
 */
async function pollOutfit(shortCode) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let last = null;
  while (Date.now() < deadline) {
    const res = await fetch(`${API_BASE}/mobile/outfit/${shortCode}`, { headers });
    if (res.ok) {
      const body = await res.json();
      const outfit = body?.data ?? body;
      const bounds = outfit?.images?.[0]?.bounds ?? [];
      if (bounds.length > 0) {
        last = outfit;
        if (bounds.every((b) => (b.recommendations ?? []).length > 0)) return outfit;
        const withRecs = bounds.filter((b) => (b.recommendations ?? []).length > 0).length;
        console.log(`  …${withRecs}/${bounds.length} bounds have recommendations`);
      } else {
        console.log('  …no bounds yet');
      }
    } else {
      console.log(`  …outfit not ready (${res.status})`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return last;
}

const EXT_BY_CONTENT_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** Cache the item's top product image locally; sets products[0].localImage on success. */
async function downloadThumb(item) {
  const product = item.products[0];
  if (!product?.image) return;
  try {
    const res = await fetch(product.image);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ext = EXT_BY_CONTENT_TYPE[res.headers.get('content-type')?.split(';')[0]] ?? 'jpg';
    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(THUMBS_DIR, { recursive: true });
    const filename = `${item.boundId}.${ext}`;
    writeFileSync(join(THUMBS_DIR, filename), buffer);
    product.localImage = `${THUMBS_PUBLIC_PREFIX}/${filename}`;
  } catch (error) {
    console.warn(`  thumb download failed for "${item.label}": ${error.message}`);
  }
}

/** Cache the item's SAM mask cutout locally; sets item.localMask on success. */
async function downloadMask(item) {
  if (!item.maskUrl) return;
  try {
    const res = await fetch(item.maskUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    mkdirSync(MASKS_DIR, { recursive: true });
    const filename = `${item.boundId}.png`;
    writeFileSync(join(MASKS_DIR, filename), buffer);
    item.localMask = `${MASKS_PUBLIC_PREFIX}/${filename}`;
  } catch (error) {
    console.warn(`  mask download failed for "${item.label}": ${error.message}`);
  }
}

async function processImage(filename) {
  console.log(`\n▶ ${filename}`);
  const localPath = join(IMAGES_DIR, filename);
  const { width, height } = imageSize(readFileSync(localPath));
  if (!width || !height) throw new Error(`could not read dimensions of ${filename}`);

  const shortCode = await submit(filename);
  console.log(`  shortCode: ${shortCode} — polling (up to ${POLL_TIMEOUT_MS / 60000} min)`);
  const outfit = await pollOutfit(shortCode);
  if (!outfit) {
    console.warn(`  SKIPPED: no bounds appeared within the timeout`);
    return null;
  }

  const entry = buildManifestEntry({ outfit, imgWidth: width, imgHeight: height });
  if (!entry) {
    console.warn(`  SKIPPED: no bound had usable coordinates + products`);
    return null;
  }

  for (const item of entry.items) {
    await downloadThumb(item);
    await downloadMask(item);
  }
  console.log(
    `  ✓ ${entry.items.length} shoppable item(s): ${entry.items.map((i) => i.label).join(', ')}`,
  );
  return entry;
}

const filenames = JSON.parse(readFileSync(LIST_PATH, 'utf8'));
const manifest = {};
let failures = 0;

for (const filename of filenames) {
  try {
    const entry = await processImage(filename);
    if (entry) manifest[filename] = entry;
    else failures += 1;
  } catch (error) {
    failures += 1;
    console.warn(`  SKIPPED (${filename}): ${error.message}`);
  }
}

writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `\nWrote ${Object.keys(manifest).length}/${filenames.length} entries to lib/shoppable/manifest.json` +
    (failures ? ` (${failures} skipped)` : ''),
);
process.exit(Object.keys(manifest).length > 0 || filenames.length === 0 ? 0 : 1);
