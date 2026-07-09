import {
  mediaPipeToCoveredFramePoint,
  type FrameSize,
  type VideoSize,
} from './cameraProjection.ts';
import type { PalmAnchor } from './palmAnchor';

export interface ARSymbolScreenTarget {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

interface Options {
  palmAnchor: PalmAnchor | null;
  videoSize: VideoSize | null;
  frameSize: FrameSize | null;
}

const MIN_SIZE = 96;
const MAX_SIZE = 190;
const SIZE_MULTIPLIER = 1.18;
const SIZE_BUCKET_PX = 8;
const LIFT_MULTIPLIER = 0.58;
const EDGE_MARGIN = 18;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapSize(value: number): number {
  return Math.round(value / SIZE_BUCKET_PX) * SIZE_BUCKET_PX;
}

export function resolveARSymbolScreenTarget({
  palmAnchor,
  videoSize,
  frameSize,
}: Options): ARSymbolScreenTarget {
  if (!palmAnchor || !frameSize) {
    return { x: 0, y: 0, size: MIN_SIZE, opacity: 0 };
  }

  const projectionVideoSize = videoSize ?? frameSize;
  const point = mediaPipeToCoveredFramePoint(
    palmAnchor,
    projectionVideoSize,
    frameSize,
    true
  );
  const size = clamp(
    snapSize(palmAnchor.scale * frameSize.height * SIZE_MULTIPLIER),
    MIN_SIZE,
    MAX_SIZE
  );
  const half = size / 2;
  const minX = half + EDGE_MARGIN;
  const maxX = frameSize.width - half - EDGE_MARGIN;
  const minY = half + EDGE_MARGIN;
  const maxY = frameSize.height - half - EDGE_MARGIN;

  return {
    x: clamp(point.x, minX, Math.max(minX, maxX)),
    y: clamp(point.y - size * LIFT_MULTIPLIER, minY, Math.max(minY, maxY)),
    size,
    opacity: palmAnchor.confidence,
  };
}
