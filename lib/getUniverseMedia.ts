import { readdirSync } from 'fs';
import { join } from 'path';

/**
 * Server-side media scanner for the 3D Image Universe.
 *
 * This is the Next.js-native equivalent of the spec's `generate-manifest.mjs`
 * script: instead of a build step that writes `media/manifest.json`, we scan the
 * folder on the server (in the RSC that renders the page) and hand the list to
 * the client. Drop files into `public/portfolio/loop-imgs/`, refresh, and they
 * appear — no manifest command to run.
 *
 * It intentionally lives alongside (not inside) `getLoopImages`, which the
 * MediaPipe HandLoop still consumes and which must keep returning bare images.
 */

const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
  '.gif',
]);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

const MEDIA_DIR = 'public/portfolio/loop-imgs';
const PUBLIC_PREFIX = '/portfolio/loop-imgs';

export type UniverseMediaType = 'image' | 'video';

export interface UniverseMedia {
  /** Public URL, e.g. "/portfolio/loop-imgs/celine.jpg" */
  src: string;
  filename: string;
  type: UniverseMediaType;
}

function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

export function getUniverseMedia(): UniverseMedia[] {
  const dir = join(process.cwd(), MEDIA_DIR);
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => !name.startsWith('.')) // skip .DS_Store etc.
    .map((filename) => {
      const ext = extOf(filename);
      let type: UniverseMediaType | null = null;
      if (IMAGE_EXTENSIONS.has(ext)) type = 'image';
      else if (VIDEO_EXTENSIONS.has(ext)) type = 'video';
      if (!type) return null;
      return {
        filename,
        src: `${PUBLIC_PREFIX}/${filename}`,
        type,
      } satisfies UniverseMedia;
    })
    .filter((m): m is UniverseMedia => m !== null)
    .sort((a, b) => a.filename.localeCompare(b.filename));
}
