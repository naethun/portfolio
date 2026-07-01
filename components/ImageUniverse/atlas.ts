import * as THREE from 'three';

/**
 * TEXTURE ATLAS BUILDER
 * =====================
 * The whole universe is drawn in a SINGLE draw call. To do that every image
 * must live inside ONE texture — sampling a `sampler2D[]` array with a dynamic
 * per-particle index is not portable (fails on WebGL1, unreliable on WebGL2), so
 * we pack every image into one big canvas and give each particle a UV rect into
 * that canvas instead.
 *
 * For each image we store the *tight* rect (the exact sub-rectangle the image
 * occupies, excluding padding) plus its aspect ratio. That lets the shaders show
 * every image at its true aspect with no cropping or distortion:
 *   - Points mode: sample the tight rect and discard the square margins.
 *   - Instanced-planes mode: size the quad to the aspect and sample the rect.
 *
 * Each image is drawn "contain" (fit whole image, never crop) into its cell with
 * a transparent gutter around it, so mipmapped minification blends toward
 * transparency at cell edges rather than bleeding a neighbor's colors.
 */

export interface AtlasItem {
  index: number;
  /** top-left UV of the image's tight rect within the atlas (0..1). */
  uvOffset: [number, number];
  /** UV width/height of the image's tight rect within the atlas (0..1). */
  uvScale: [number, number];
  /** natural width / height of the source image. */
  aspect: number;
  /** false if the source failed to load (drawn as a neutral cell). */
  loaded: boolean;
}

export interface AtlasResult {
  texture: THREE.CanvasTexture;
  items: AtlasItem[];
  /** the backing canvas, kept so callers can dispose it if they want. */
  canvas: HTMLCanvasElement;
}

export interface BuildAtlasOptions {
  /** hard cap on the atlas dimension in px (kept <= GPU max texture size). */
  maxAtlasSize?: number;
  /** max per-image cell size in px (quality ceiling). */
  maxCell?: number;
  /** min per-image cell size in px (floor for huge sets). */
  minCell?: number;
  /** anisotropy from renderer.capabilities.getMaxAnisotropy(). */
  anisotropy?: number;
  /** called after each image settles, for a loading indicator. */
  onProgress?: (loaded: number, total: number) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // same-origin assets from /public; crossOrigin keeps us safe if that changes.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export async function buildAtlas(
  sources: string[],
  opts: BuildAtlasOptions = {},
): Promise<AtlasResult> {
  const maxAtlasSize = opts.maxAtlasSize ?? 4096;
  const maxCell = opts.maxCell ?? 1024;
  const minCell = opts.minCell ?? 64;

  const n = Math.max(1, sources.length);

  // Square-ish grid layout.
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);

  // Cell size honours both the quality ceiling and the atlas-size cap.
  const cell = Math.max(
    minCell,
    Math.min(maxCell, Math.floor(maxAtlasSize / cols)),
  );
  const pad = Math.max(2, Math.round(cell * 0.03)); // transparent gutter

  const atlasW = cols * cell;
  const atlasH = rows * cell;

  const canvas = document.createElement('canvas');
  canvas.width = atlasW;
  canvas.height = atlasH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, atlasW, atlasH); // transparent background

  // Load everything in parallel; a failure becomes a neutral cell so indices
  // stay aligned with the particle buffers.
  let settled = 0;
  const results = await Promise.all(
    sources.map(async (src) => {
      try {
        const img = await loadImage(src);
        return img;
      } catch {
        return null;
      } finally {
        settled += 1;
        opts.onProgress?.(settled, sources.length);
      }
    }),
  );

  const items: AtlasItem[] = [];
  const drawable = cell - pad * 2;

  for (let i = 0; i < sources.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellX = col * cell;
    const cellY = row * cell;
    const img = results[i];

    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) {
      // Neutral placeholder cell (square) so a broken file still shows up.
      ctx.fillStyle = 'rgba(200,196,188,1)';
      ctx.fillRect(cellX + pad, cellY + pad, drawable, drawable);
      items.push({
        index: i,
        uvOffset: [(cellX + pad) / atlasW, (cellY + pad) / atlasH],
        uvScale: [drawable / atlasW, drawable / atlasH],
        aspect: 1,
        loaded: false,
      });
      continue;
    }

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const aspect = iw / ih;

    // "contain" fit inside the drawable area, centered in the cell.
    const scale = Math.min(drawable / iw, drawable / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = cellX + (cell - dw) / 2;
    const dy = cellY + (cell - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);

    items.push({
      index: i,
      uvOffset: [dx / atlasW, dy / atlasH],
      uvScale: [dw / atlasW, dh / atlasH],
      aspect,
      loaded: true,
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  // We authored the atlas top-left origin, and both shaders sample with a
  // top-left convention, so keep flipY off for a deterministic mapping.
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (opts.anisotropy) texture.anisotropy = opts.anisotropy;
  texture.needsUpdate = true;

  return { texture, items, canvas };
}
