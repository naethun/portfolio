import {
  framePointToWorld,
  mediaPipeToCoveredFramePoint,
  type FrameSize,
  type VideoSize,
} from './cameraProjection.ts';
import type { PalmAnchor } from './palmAnchor';

export interface ARSymbolTargetTransform {
  position: {
    x: number;
    y: number;
    z: number;
  };
  scale: number;
  opacity: number;
}

export interface ARSymbolTargetOptions {
  palmAnchor: PalmAnchor | null;
  videoSize: VideoSize | null;
  frameSize: FrameSize | null;
  fallbackVisible: boolean;
  worldHeight: number;
}

export const SYMBOL_SCALE_MULTIPLIER = 0.98;
export const SYMBOL_MIN_TARGET_SCALE = 1.15;
export const SYMBOL_MAX_TARGET_SCALE = 2.65;
export const PALM_LIFT_MULTIPLIER = 0.32;
export const SYMBOL_LOCAL_Y_OFFSET = 0.34;
const SYMBOL_CENTER_MAX_ABS_Y = 3.3;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveARSymbolTargetTransform({
  palmAnchor,
  videoSize,
  frameSize,
  fallbackVisible,
  worldHeight,
}: ARSymbolTargetOptions): ARSymbolTargetTransform {
  if (palmAnchor && frameSize) {
    const projectionVideoSize = videoSize ?? frameSize;
    const framePoint = mediaPipeToCoveredFramePoint(
      palmAnchor,
      projectionVideoSize,
      frameSize,
      true
    );
    const worldPoint = framePointToWorld(framePoint, frameSize, worldHeight);
    const scale = clamp(
      palmAnchor.scale * worldHeight * SYMBOL_SCALE_MULTIPLIER,
      SYMBOL_MIN_TARGET_SCALE,
      SYMBOL_MAX_TARGET_SCALE
    );
    const rawGroupY = worldPoint.y + scale * PALM_LIFT_MULTIPLIER;
    const clampedSymbolCenterY = clamp(
      rawGroupY + scale * SYMBOL_LOCAL_Y_OFFSET,
      -SYMBOL_CENTER_MAX_ABS_Y,
      SYMBOL_CENTER_MAX_ABS_Y
    );

    return {
      position: {
        x: worldPoint.x,
        y: clampedSymbolCenterY - scale * SYMBOL_LOCAL_Y_OFFSET,
        z: 0,
      },
      scale,
      opacity: palmAnchor.confidence,
    };
  }

  return {
    position: { x: 0, y: 0, z: 0 },
    scale: fallbackVisible ? 1.9 : 0.6,
    opacity: fallbackVisible ? 0.86 : 0,
  };
}
