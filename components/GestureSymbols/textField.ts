/**
 * Deterministic text-grid generation for the Gesture Symbols poster.
 *
 * The field is a stable lattice of small monospace cells laid across the
 * frame. Each cell carries a normalized center (matching the coordinate
 * space of `symbolMasks.ts`), a per-cell jitter phase, a row-drift seed, and
 * a short character fragment. Everything is derived by hashing the integer
 * cell coordinates, so the field is fully reproducible for a given grid size
 * with no `Math.random` and no per-frame allocation.
 */

/* ------------------------------------------------------------------ *
 * Tunable constants (density / texture)
 * ------------------------------------------------------------------ */

/** Target CSS-pixel size of one grid cell. Smaller → denser texture. */
export const GRID_TARGET_CELL_PX = 13;

/** Font size as a fraction of the cell size. */
export const FONT_PX_RATIO = 0.92;

/** Minimum grid dimension so tiny frames still produce a lattice. */
export const MIN_GRID = 2;

/**
 * Fragments drawn per cell. Kept to 1 char (plus a couple of 2-char pairs)
 * so the monospace texture stays tight and even. Reads as texture, not copy.
 */
export const CHAR_POOL: readonly string[] = [
  'A',
  'E',
  'S',
  'T',
  'H',
  'C',
  '0',
  '1',
  '+',
  '*',
  '/',
  '\\',
  '.',
  ':',
  '=',
  'x',
  '//',
  '::',
];

/* ------------------------------------------------------------------ *
 * Hashing (deterministic, seeded by integer cell coords)
 * ------------------------------------------------------------------ */

/** Integer-coordinate hash → float in [0, 1). */
export function hash2(ix: number, iy: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h >>> 0) / 4294967296;
}

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface TextCell {
  col: number;
  row: number;
  /** Normalized x, width axis spans [-1, 1]. */
  nx: number;
  /** Normalized y, same unit as nx (magnitude up to `aspect`). */
  ny: number;
  /** 0..2π per-cell jitter phase. */
  phase: number;
  /** -1..1 seed for per-row lateral drift. */
  drift: number;
  /** 1–3 char fragment. */
  char: string;
}

export interface TextField {
  cols: number;
  rows: number;
  /** height / width of the frame — vertical normalized extent. */
  aspect: number;
  cells: TextCell[];
}

/* ------------------------------------------------------------------ *
 * Grid construction
 * ------------------------------------------------------------------ */

/** Choose a column/row count for a pixel box at the target cell size. */
export function gridDimsFor(
  width: number,
  height: number,
  cellPx: number = GRID_TARGET_CELL_PX,
): { cols: number; rows: number } {
  const cols = Math.max(MIN_GRID, Math.round(width / cellPx));
  const rows = Math.max(MIN_GRID, Math.round(height / cellPx));
  return { cols, rows };
}

/**
 * Build the (deterministic) text field for a grid of `cols × rows` cells in
 * a frame of the given `aspect` (height / width). Cell centers are placed on
 * a regular lattice; per-cell attributes are hashed from the cell indices.
 */
export function buildTextField(cols: number, rows: number, aspect: number): TextField {
  const cells: TextCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const nx = ((col + 0.5) / cols - 0.5) * 2;
      const ny = ((row + 0.5) / rows - 0.5) * 2 * aspect;
      const phase = hash2(col + 1, row + 1) * Math.PI * 2;
      const drift = hash2(col + 7, row + 3) * 2 - 1;
      const char = CHAR_POOL[Math.floor(hash2(col + 13, row + 17) * CHAR_POOL.length)];
      cells.push({ col, row, nx, ny, phase, drift, char });
    }
  }
  return { cols, rows, aspect, cells };
}
