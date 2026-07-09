import {
  FIELD_THRESHOLD,
  morphValue,
} from './symbolMasks.ts';
import {
  buildTextField,
  charForSymbol,
  FONT_PX_RATIO,
  gridDimsFor,
  GRID_TARGET_CELL_PX,
  hash2,
  type TextField,
} from './textField.ts';
import type { SymbolKind } from './types';

export interface AsciiSymbolTextureOptions {
  symbol: SymbolKind;
  width: number;
  height: number;
  timeSeconds: number;
  fromSymbol?: SymbolKind;
  morphT?: number;
  cellPx?: number;
}

export interface AsciiGlyphCommand {
  x: number;
  y: number;
  alpha: number;
  glyph: string;
  col: number;
  row: number;
}

export interface AsciiVolumeLayerSpec {
  z: number;
  opacity: number;
}

const EDGE_SOFT = 0.06;
const ALPHA_JITTER = 0.14;
const JITTER_BASE = 1.05;
const ROW_DRIFT_BASE = 1.1;
const ROW_DRIFT_HZ = 0.07;
const CHAR_CYCLE_HZ = 0.7;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function fieldForSize(
  width: number,
  height: number,
  cellPx: number
): TextField {
  const { cols, rows } = gridDimsFor(width, height, cellPx);
  return buildTextField(cols, rows, height / width);
}

export function buildAsciiSymbolDrawCommands({
  symbol,
  width,
  height,
  timeSeconds,
  fromSymbol = symbol,
  morphT = 1,
  cellPx = GRID_TARGET_CELL_PX,
}: AsciiSymbolTextureOptions): AsciiGlyphCommand[] {
  if (width <= 0 || height <= 0) return [];

  const field = fieldForSize(width, height, cellPx);
  const invAspect = 1 / field.aspect;
  const t = clamp01(morphT);
  const commands: AsciiGlyphCommand[] = [];

  for (const cell of field.cells) {
    const v = morphValue(fromSymbol, symbol, t, cell.nx, cell.ny);
    if (v <= FIELD_THRESHOLD) continue;

    let alpha = Math.min(1, v / EDGE_SOFT);
    alpha *= 1 - ALPHA_JITTER * hash2(cell.col + 5, cell.row + 11);
    if (alpha < 0.02) continue;

    let x = (cell.nx * 0.5 + 0.5) * width;
    let y = (cell.ny * invAspect * 0.5 + 0.5) * height;
    x += Math.sin(cell.phase + timeSeconds * 1.7) * JITTER_BASE;
    y += Math.cos(cell.phase * 1.3 + timeSeconds * 1.53) * JITTER_BASE * 0.7;
    x +=
      ROW_DRIFT_BASE *
      Math.sin(timeSeconds * Math.PI * 2 * ROW_DRIFT_HZ + cell.row * 0.6);

    commands.push({
      x,
      y,
      alpha,
      glyph: charForSymbol(
        symbol,
        cell.col,
        cell.row,
        (timeSeconds * CHAR_CYCLE_HZ + cell.phase) | 0
      ),
      col: cell.col,
      row: cell.row,
    });
  }

  return commands;
}

export function fontSizeForTexture(width: number): number {
  const { cols } = gridDimsFor(width, width, GRID_TARGET_CELL_PX);
  return (width / cols) * FONT_PX_RATIO;
}

export function buildAsciiVolumeLayerSpecs(
  depth: number,
  count: number
): AsciiVolumeLayerSpec[] {
  const layerCount = Math.max(1, Math.round(count));
  if (layerCount === 1) return [{ z: 0, opacity: 1 }];

  const halfDepth = depth / 2;
  const center = (layerCount - 1) / 2;
  return Array.from({ length: layerCount }, (_, index) => {
    const normalized = index / (layerCount - 1);
    const distanceFromFace = Math.min(index, layerCount - 1 - index) / center;
    return {
      z: Number((-halfDepth + normalized * depth).toFixed(6)),
      opacity: 0.24 + (1 - distanceFromFace) * 0.76,
    };
  });
}
