import {
  buildAsciiSymbolDrawCommands,
  fontSizeForTexture,
  type AsciiGlyphCommand,
} from './asciiSymbolTexture.ts';
import type { SymbolKind } from './types';

export interface ARAsciiOverlayPlan {
  kind: 'ascii-mask';
  background: 'transparent';
  commands: AsciiGlyphCommand[];
  fontPx: number;
  layers: ARAsciiOverlayLayer[];
  tilt: ARAsciiOverlayTilt;
}

export interface ARAsciiOverlayLayer {
  id: string;
  translateX: number;
  translateY: number;
  translateZ: number;
  scale: number;
  opacity: number;
  shadowBlur: number;
}

export interface ARAsciiOverlayTilt {
  perspective: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
}

export interface ARAsciiOverlayPlanOptions {
  symbol: SymbolKind;
  size: number;
  timeSeconds: number;
}

const AR_OVERLAY_CELL_PX = 9;
const AR_VOLUME_LAYER_COUNT = 5;

function buildVolumeLayers(size: number): ARAsciiOverlayLayer[] {
  const center = (AR_VOLUME_LAYER_COUNT - 1) / 2;

  return Array.from({ length: AR_VOLUME_LAYER_COUNT }, (_, index) => {
    const depth = index - center;
    const frontness = index / (AR_VOLUME_LAYER_COUNT - 1);

    return {
      id: `ascii-depth-${index}`,
      translateX: depth * size * 0.034,
      translateY: -depth * size * 0.018,
      translateZ: depth * size * 0.058,
      scale: 0.955 + frontness * 0.06,
      opacity: 0.2 + frontness * 0.8,
      shadowBlur: frontness > 0.7 ? size * 0.036 : size * 0.012,
    };
  });
}

function buildThreeQuarterTilt(size: number): ARAsciiOverlayTilt {
  return {
    perspective: Math.max(360, Math.round(size * 4.4)),
    rotateX: -18,
    rotateY: 28,
    rotateZ: -4,
  };
}

export function buildARAsciiOverlayPlan({
  symbol,
  size,
  timeSeconds,
}: ARAsciiOverlayPlanOptions): ARAsciiOverlayPlan {
  const safeSize = Math.max(1, size);

  return {
    kind: 'ascii-mask',
    background: 'transparent',
    commands: buildAsciiSymbolDrawCommands({
      symbol,
      width: safeSize,
      height: safeSize,
      timeSeconds,
      cellPx: AR_OVERLAY_CELL_PX,
      }),
      fontPx: fontSizeForTexture(safeSize),
      layers: buildVolumeLayers(safeSize),
      tilt: buildThreeQuarterTilt(safeSize),
    };
}
