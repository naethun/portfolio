/**
 * Grid-cell centers for the "flat" gallery-wall formation.
 * Cells fill left→right, top→bottom and are centered on the world XY plane (z = 0).
 *
 * @param {number} count number of images
 * @param {{ columns?: number, spacingX?: number, spacingY?: number }} [opts]
 *   columns <= 0 (or omitted) → auto = ceil(sqrt(count)).
 * @returns {Float32Array} length count*3, [x, y, z] per image (instance order)
 */
export function computeFlatGrid(count, opts = {}) {
  const n = Math.max(0, count | 0);
  const out = new Float32Array(n * 3);
  if (n === 0) return out;

  const spacingX = opts.spacingX ?? 8;
  const spacingY = opts.spacingY ?? 8;
  const cols =
    opts.columns && opts.columns > 0 ? opts.columns : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  for (let k = 0; k < n; k++) {
    const col = k % cols;
    const row = Math.floor(k / cols);
    out[k * 3] = (col - cx) * spacingX;
    out[k * 3 + 1] = (cy - row) * spacingY;
    out[k * 3 + 2] = 0;
  }
  return out;
}
