import type { HandLandmarks, Landmark } from './gestureClassifier';

export interface PalmAnchor {
  x: number;
  y: number;
  z: number;
  scale: number;
  roll: number;
  confidence: number;
}

const PALM_POINTS = [0, 5, 9, 13, 17] as const;

export const PALM_MIN_SCALE = 0.14;
export const PALM_MAX_SCALE = 0.58;
export const PALM_SCALE_MULTIPLIER = 1.55;

function isFiniteLandmark(point: Landmark | undefined): point is Landmark {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  );
}

function distance2D(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computePalmAnchor(hand: HandLandmarks | null): PalmAnchor | null {
  if (!hand) return null;

  const points = PALM_POINTS.map((index) => hand[index]);
  if (!points.every(isFiniteLandmark)) return null;

  const [wrist, indexMcp, middleMcp, ringMcp, pinkyMcp] = points;
  const invCount = 1 / points.length;
  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x * invCount,
      y: sum.y + point.y * invCount,
      z: sum.z + point.z * invCount,
    }),
    { x: 0, y: 0, z: 0 }
  );
  const spread = distance2D(indexMcp, pinkyMcp);

  return {
    ...center,
    scale: clamp(
      spread * PALM_SCALE_MULTIPLIER,
      PALM_MIN_SCALE,
      PALM_MAX_SCALE
    ),
    roll: Math.atan2(pinkyMcp.y - indexMcp.y, pinkyMcp.x - indexMcp.x),
    confidence: isFiniteLandmark(wrist) && isFiniteLandmark(middleMcp) && isFiniteLandmark(ringMcp)
      ? 1
      : 0,
  };
}
