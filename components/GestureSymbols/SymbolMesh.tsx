'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  buildAsciiSymbolDrawCommands,
  buildAsciiVolumeLayerSpecs,
} from './asciiSymbolTexture';
import { hash2, SYMBOL_TEXT_TEXTURES } from './textField';
import type { SymbolKind } from './types';

interface SymbolMeshProps {
  symbol: SymbolKind;
}

interface GlyphSprite {
  material: THREE.SpriteMaterial;
  sprite: THREE.Sprite;
}

const SAMPLE_SIZE = 512;
const SYMBOL_WORLD_SIZE = 1.95;
const SYMBOL_DEPTH = 0.58;
const SYMBOL_LAYERS = 7;
const SAMPLE_CELL_PX = 22;
const MAX_GLYPHS = 2200;
const GLYPH_TEXTURE_SIZE = 96;
const GLYPH_WORLD_SIZE = 0.072;
const MORPH_DURATION_MS = 940;

function createGlyphTexture(symbol: SymbolKind, glyph: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_TEXTURE_SIZE;
  canvas.height = GLYPH_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const texture = SYMBOL_TEXT_TEXTURES[symbol];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.floor(GLYPH_TEXTURE_SIZE * 0.58)}px ${
      texture.fontFamily
    }`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function getGlyphTexture(
  cache: Map<string, THREE.CanvasTexture>,
  symbol: SymbolKind,
  glyph: string
): THREE.CanvasTexture {
  const key = `${symbol}:${glyph}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const texture = createGlyphTexture(symbol, glyph);
  cache.set(key, texture);
  return texture;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hideUnusedSprites(pool: GlyphSprite[], fromIndex: number) {
  for (let i = fromIndex; i < pool.length; i++) {
    if (!pool[i].sprite.visible) continue;
    pool[i].sprite.visible = false;
    pool[i].material.opacity = 0;
    pool[i].material.userData.baseOpacity = 0;
  }
}

export function SymbolMesh({ symbol }: SymbolMeshProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const poolRef = useRef<GlyphSprite[]>([]);
  const textureCacheRef = useRef<Map<string, THREE.CanvasTexture>>(new Map());
  const morphRef = useRef({
    from: symbol,
    to: symbol,
    startMs: 0,
  });
  const symbolRef = useRef(symbol);
  const layers = useMemo(
    () => buildAsciiVolumeLayerSpecs(SYMBOL_DEPTH, SYMBOL_LAYERS),
    []
  );

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const textureCache = textureCacheRef.current;

    const pool: GlyphSprite[] = Array.from({ length: MAX_GLYPHS }, () => {
      const material = new THREE.SpriteMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
      });
      material.userData.baseOpacity = 0;
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.center.set(0.5, 0.5);
      group.add(sprite);
      return { material, sprite };
    });

    poolRef.current = pool;

    return () => {
      for (const { material, sprite } of pool) {
        group.remove(sprite);
        material.dispose();
      }
      for (const texture of textureCache.values()) {
        texture.dispose();
      }
      textureCache.clear();
      poolRef.current = [];
    };
  }, []);

  useFrame(({ clock }) => {
    const pool = poolRef.current;
    if (!pool.length) return;

    if (symbolRef.current !== symbol) {
      morphRef.current = {
        from: morphRef.current.to,
        to: symbol,
        startMs: clock.elapsedTime * 1000,
      };
      symbolRef.current = symbol;
    }

    const elapsedMs = clock.elapsedTime * 1000 - morphRef.current.startMs;
    const rawT = Math.min(1, Math.max(0, elapsedMs / MORPH_DURATION_MS));
    const morphT = easeInOutCubic(rawT);
    const transitionEnergy = Math.sin(rawT * Math.PI);
    const commands = buildAsciiSymbolDrawCommands({
      symbol: morphRef.current.to,
      width: SAMPLE_SIZE,
      height: SAMPLE_SIZE,
      timeSeconds: clock.elapsedTime,
      fromSymbol: morphRef.current.from,
      morphT,
      cellPx: SAMPLE_CELL_PX,
    });

    const textureCache = textureCacheRef.current;
    let spriteIndex = 0;
    outer: for (const command of commands) {
      const x = (command.x / SAMPLE_SIZE - 0.5) * SYMBOL_WORLD_SIZE;
      const y = (0.5 - command.y / SAMPLE_SIZE) * SYMBOL_WORLD_SIZE;

      for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
        if (spriteIndex >= pool.length) break outer;

        const layer = layers[layerIndex];
        const { material, sprite } = pool[spriteIndex];
        const depthSeed = hash2(
          command.col + 17 * (layerIndex + 1),
          command.row + 29
        );
        const liftSeed = hash2(command.col + 3, command.row + 43);
        const z =
          layer.z +
          (depthSeed - 0.5) * 0.044 +
          Math.sin(command.col * 0.61 + command.row * 0.37 + clock.elapsedTime * 2) *
            transitionEnergy *
            0.045;
        const xyPulse =
          1 +
          transitionEnergy *
            0.055 *
            Math.sin(command.col * 0.47 + command.row * 0.53 + clock.elapsedTime * 5);
        const glyphScale =
          GLYPH_WORLD_SIZE *
          (0.86 + liftSeed * 0.28 + transitionEnergy * 0.13);
        const texture = getGlyphTexture(
          textureCache,
          morphRef.current.to,
          command.glyph
        );

        if (material.map !== texture) {
          material.map = texture;
          material.needsUpdate = true;
        }

        const baseOpacity = Math.min(1, command.alpha * layer.opacity * 0.92);
        material.userData.baseOpacity = baseOpacity;
        material.opacity = baseOpacity;
        sprite.visible = baseOpacity > 0.018;
        sprite.position.set(x * xyPulse, y * xyPulse, z);
        sprite.scale.setScalar(glyphScale);
        spriteIndex++;
      }
    }

    hideUnusedSprites(pool, spriteIndex);
  }, -1);

  return <group ref={groupRef} />;
}
