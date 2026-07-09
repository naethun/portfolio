'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  buildAsciiSymbolDrawCommands,
  fontSizeForTexture,
} from './asciiSymbolTexture';
import { SYMBOL_TEXT_TEXTURES } from './textField';
import type { SymbolKind } from './types';

interface SymbolMeshProps {
  symbol: SymbolKind;
}

const TEXTURE_SIZE = 512;
const TEXTURE_WORLD_SIZE = 1.95;

function createTextureCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  return canvas;
}

function drawAsciiSymbolTexture(
  canvas: HTMLCanvasElement,
  symbol: SymbolKind,
  timeSeconds: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const commands = buildAsciiSymbolDrawCommands({
    symbol,
    width: canvas.width,
    height: canvas.height,
    timeSeconds,
    cellPx: 9,
  });
  const texture = SYMBOL_TEXT_TEXTURES[symbol];
  ctx.font = `${fontSizeForTexture(canvas.width) * 1.05}px ${texture.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';

  for (const command of commands) {
    ctx.globalAlpha = command.alpha;
    ctx.fillText(command.glyph, command.x, command.y);
  }
  ctx.globalAlpha = 1;
}

export function SymbolMesh({ symbol }: SymbolMeshProps) {
  const canvas = useMemo(
    () => (typeof document === 'undefined' ? null : createTextureCanvas()),
    []
  );
  const texture = useMemo(() => {
    if (!canvas) return null;
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.minFilter = THREE.LinearFilter;
    next.magFilter = THREE.LinearFilter;
    next.generateMipmaps = false;
    return next;
  }, [canvas]);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);

  useFrame(({ clock }) => {
    if (!canvas || !materialRef.current?.map) return;
    drawAsciiSymbolTexture(canvas, symbol, clock.elapsedTime);
    materialRef.current.map.needsUpdate = true;
  });

  if (!texture) return null;

  return (
    <mesh>
      <planeGeometry args={[TEXTURE_WORLD_SIZE, TEXTURE_WORLD_SIZE]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
