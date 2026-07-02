export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which card edge a limb connects to — the edge facing the image. */
export type LimbEdge = 'left' | 'right' | 'top' | 'bottom';

/**
 * Content box of an `object-fit: contain` image inside a container —
 * where bound anchors/boxes must be positioned (accounts for letterboxing).
 */
export function fitContain(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): Rect {
  if (containerW <= 0 || containerH <= 0 || naturalW <= 0 || naturalH <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const scale = Math.min(containerW / naturalW, containerH / naturalH);
  const w = naturalW * scale;
  const h = naturalH * scale;
  return { x: (containerW - w) / 2, y: (containerH - h) / 2, w, h };
}

/**
 * Distance from point (ax, ay) inside `rect` to where the ray along (dx, dy)
 * (normalized) exits the rect. Used to push cards outward past the image edge
 * along their item's direction.
 */
export function rayExitDistance(
  ax: number,
  ay: number,
  dx: number,
  dy: number,
  rect: Rect,
): number {
  let t = Infinity;
  if (dx > 0) t = Math.min(t, (rect.x + rect.w - ax) / dx);
  else if (dx < 0) t = Math.min(t, (rect.x - ax) / dx);
  if (dy > 0) t = Math.min(t, (rect.y + rect.h - ay) / dy);
  else if (dy < 0) t = Math.min(t, (rect.y - ay) / dy);
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

/**
 * Cubic bezier from an anchor to a card-edge connection point: leaves the
 * anchor along the limb's own direction and arrives perpendicular to the
 * card edge it connects to.
 */
export function limbPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  edge: LimbEdge = 'left',
): string {
  const dist = Math.hypot(x2 - x1, y2 - y1) || 1;
  const reach = Math.max(40, dist * 0.4);
  const c1x = x1 + ((x2 - x1) / dist) * reach;
  const c1y = y1 + ((y2 - y1) / dist) * reach;
  const pull = Math.max(40, dist * 0.35);
  let c2x = x2;
  let c2y = y2;
  if (edge === 'left') c2x = x2 - pull;
  else if (edge === 'right') c2x = x2 + pull;
  else if (edge === 'top') c2y = y2 - pull;
  else c2y = y2 + pull;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}
