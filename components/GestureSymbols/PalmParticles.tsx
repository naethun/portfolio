'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { SymbolKind } from './types';

interface PalmParticlesProps {
  symbol: SymbolKind;
}

const PARTICLE_COUNT = 90;
const PARTICLE_LIFETIME = 1.8;
const PARTICLE_RISE = 1.4;
const PARTICLE_SPREAD = 0.45;
const PARTICLE_SIZE = 0.035;

const SYMBOL_COLORS: Record<SymbolKind, string> = {
  cross: '#ffffff',
  ring: '#c9fff4',
  square: '#ffe7b8',
  star: '#ffd6f3',
};

interface ParticleSeed {
  angle: number;
  radius: number;
  offset: number;
  drift: number;
}

export function PalmParticles({ symbol }: PalmParticlesProps) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const elapsedRef = useRef(0);
  const seeds = useMemo<ParticleSeed[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const t = i / PARTICLE_COUNT;
        return {
          angle: t * Math.PI * 2 * 7.13,
          radius: PARTICLE_SPREAD * (0.18 + ((i * 37) % 100) / 125),
          offset: (i * 0.137) % PARTICLE_LIFETIME,
          drift: ((i * 19) % 100) / 100 - 0.5,
        };
      }),
    []
  );

  useEffect(() => {
    elapsedRef.current = 0;
  }, [symbol]);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const position = pointsRef.current?.geometry.getAttribute('position');
    if (!position || !(position instanceof THREE.BufferAttribute)) return;
    const positions = position.array;
    if (!(positions instanceof Float32Array)) return;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const seed = seeds[i];
      const age = (elapsedRef.current + seed.offset) % PARTICLE_LIFETIME;
      const p = age / PARTICLE_LIFETIME;
      const radius = seed.radius * (0.35 + p * 0.9);
      const base = i * 3;

      positions[base] =
        Math.cos(seed.angle + p * 2.4) * radius + seed.drift * p * 0.18;
      positions[base + 1] = p * PARTICLE_RISE - 0.48;
      positions[base + 2] = Math.sin(seed.angle + p * 1.7) * radius * 0.45;
    }

    position.needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry();
    next.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3)
    );
    return next;
  }, []);

  return (
    <points geometry={geometry} ref={pointsRef}>
      <pointsMaterial
        color={SYMBOL_COLORS[symbol]}
        size={PARTICLE_SIZE}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
