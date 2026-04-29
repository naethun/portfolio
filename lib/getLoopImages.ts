import { readdirSync } from 'fs';
import { join } from 'path';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const LOOP_IMG_DIR = 'public/portfolio/loop-imgs';

export interface LoopImage {
  src: string;
  filename: string;
}

export function getLoopImages(): LoopImage[] {
  const dir = join(process.cwd(), LOOP_IMG_DIR);
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => {
      const dot = name.lastIndexOf('.');
      if (dot === -1) return false;
      return IMAGE_EXTENSIONS.has(name.slice(dot).toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b))
    .map((filename) => ({
      filename,
      src: `/portfolio/loop-imgs/${filename}`,
    }));
}
