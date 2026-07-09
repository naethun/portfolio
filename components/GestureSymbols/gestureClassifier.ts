// Pure, stateless hand-pose classification for the Gesture Symbols experience.
//
// The math here is LIFTED from the HandLoop hooks (useHandShape, usePinch,
// useHandFacing) rather than imported: those are stateful React hooks that each
// run their own rAF loop, take a single-hand ref, and publish debounced React
// state. This module needs the same geometry as plain functions so a single
// gesture loop can call them per frame and apply its own dwell/hold-off timing.
// Kept in sync with the HandLoop conventions (same landmark indices/ratios).

export interface Landmark {
  x: number;
  y: number;
  z: number;
}
export type HandLandmarks = ReadonlyArray<Landmark>;

export type HandShape = 'open' | 'closed' | 'unknown';
export type HandFacing = 'palmar' | 'dorsal' | 'unknown';

// --- tunables (mirror the HandLoop source) --------------------------------
const EXTEND_RATIO = 1.15; // finger "extended" when tip is this× farther than mcp
const PINCH_THRESHOLD = 0.3; // thumb-index tip distance / hand size below this
const FACING_EPS = 0.005; // |palm-normal.z| below this = ambiguous
// PALMAR_SIGN for the user's right hand under the mirrored selfie pipeline;
// the left hand is the mirror, so its palmar sign is flipped. Empirically
// calibrated in HandLoop — flip if palmar/dorsal read inverted. Polarity is
// cosmetic/orthogonal, so a wrong sign is low-risk to correct.
const PALMAR_SIGN = 1;

// [tip, mcp] pairs for index / middle / ring / pinky
const FINGERS: ReadonlyArray<readonly [number, number]> = [
  [8, 5],
  [12, 9],
  [16, 13],
  [20, 17],
];

function dist3D(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** True when a hand has enough landmarks to classify. */
export function hasHand(lm: HandLandmarks | null | undefined): lm is HandLandmarks {
  return !!lm && lm.length >= 21;
}

/** Open vs closed palm from how many fingers are extended (3D, wrist-relative). */
export function classifyShape(lm: HandLandmarks): HandShape {
  const wrist = lm[0];
  let count = 0;
  for (const [tip, mcp] of FINGERS) {
    if (dist3D(lm[tip], wrist) > dist3D(lm[mcp], wrist) * EXTEND_RATIO) count += 1;
  }
  if (count >= 3) return 'open';
  if (count <= 1) return 'closed';
  return 'unknown';
}

/** Pinch = thumb-tip ↔ index-tip distance normalized by hand size (wrist↔mid MCP). */
export function classifyPinch(lm: HandLandmarks): boolean {
  const handSize = dist3D(lm[0], lm[9]);
  if (handSize <= 0) return false;
  return dist3D(lm[4], lm[8]) / handSize < PINCH_THRESHOLD;
}

/**
 * Palm orientation from the sign of the palm-normal z-component. The 2D cross
 * product (wrist→index-MCP) × (wrist→pinky-MCP) flips with hand chirality, so
 * the palmar sign is chosen from the handedness label.
 */
export function classifyFacing(
  lm: HandLandmarks,
  handedness: string | undefined
): HandFacing {
  const w = lm[0];
  const idx = lm[5];
  const pky = lm[17];
  const nz = (idx.x - w.x) * (pky.y - w.y) - (idx.y - w.y) * (pky.x - w.x);
  if (Math.abs(nz) < FACING_EPS) return 'unknown';
  const palmarSign = handedness === 'Left' ? -PALMAR_SIGN : PALMAR_SIGN;
  return Math.sign(nz) === palmarSign ? 'palmar' : 'dorsal';
}
