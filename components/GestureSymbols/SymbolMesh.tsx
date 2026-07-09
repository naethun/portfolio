'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

import type { SymbolKind } from './types';

interface SymbolMeshProps {
  symbol: SymbolKind;
}

const MATERIAL_PROPS = {
  color: '#ffffff',
  emissive: '#ffffff',
  emissiveIntensity: 0.42,
  metalness: 0.08,
  roughness: 0.38,
  transparent: true,
  opacity: 1,
} as const;

function SymbolMaterial() {
  return <meshStandardMaterial {...MATERIAL_PROPS} />;
}

function CrossMesh() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.28, 1.32, 0.18]} />
        <SymbolMaterial />
      </mesh>
      <mesh>
        <boxGeometry args={[1.32, 0.28, 0.18]} />
        <SymbolMaterial />
      </mesh>
    </group>
  );
}

function RingMesh() {
  return (
    <mesh>
      <torusGeometry args={[0.48, 0.085, 20, 72]} />
      <SymbolMaterial />
    </mesh>
  );
}

function SquareMesh() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[1.16, 0.16, 0.16]} />
        <SymbolMaterial />
      </mesh>
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.16, 0.16, 0.16]} />
        <SymbolMaterial />
      </mesh>
      <mesh position={[-0.55, 0, 0]}>
        <boxGeometry args={[0.16, 1.16, 0.16]} />
        <SymbolMaterial />
      </mesh>
      <mesh position={[0.55, 0, 0]}>
        <boxGeometry args={[0.16, 1.16, 0.16]} />
        <SymbolMaterial />
      </mesh>
    </group>
  );
}

function StarMesh() {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 10;
    const outer = 0.72;
    const inner = 0.32;

    for (let i = 0; i < points; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + (i / points) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
  }, []);

  return (
    <mesh geometry={geometry} position={[0, 0, -0.07]}>
      <SymbolMaterial />
    </mesh>
  );
}

export function SymbolMesh({ symbol }: SymbolMeshProps) {
  if (symbol === 'ring') return <RingMesh />;
  if (symbol === 'square') return <SquareMesh />;
  if (symbol === 'star') return <StarMesh />;
  return <CrossMesh />;
}
