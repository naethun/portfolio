export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

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

/** Horizontal-ish cubic bezier from an anchor dot to a card's left edge. */
export function limbPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(40, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}
