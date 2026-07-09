'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  type FrameSize,
  type VideoSize,
} from './cameraProjection';
import type { PalmAnchor } from './palmAnchor';
import { PalmParticles } from './PalmParticles';
import { SymbolMesh } from './SymbolMesh';
import {
  resolveARSymbolTargetTransform,
  SYMBOL_LOCAL_Y_OFFSET,
} from './arSymbolTransform';
import type { SymbolState } from './types';

interface ARSymbolOverlayProps {
  state: SymbolState;
  palmAnchor: PalmAnchor | null;
  videoSize: VideoSize | null;
  frameSize: FrameSize | null;
  fallbackVisible: boolean;
}

interface SymbolSceneProps extends ARSymbolOverlayProps {
  worldHeight: number;
}

interface TargetTransform {
  position: THREE.Vector3;
  scale: number;
  opacity: number;
}

const WORLD_HEIGHT = 10;
const ANCHOR_LERP = 0.16;
const SCALE_LERP = 0.14;
const OPACITY_LERP = 0.12;

function setMaterialOpacity(root: THREE.Object3D, opacity: number) {
  root.traverse((child) => {
    const mesh = child as THREE.Object3D & {
      material?: THREE.Material | THREE.Material[];
      isPoints?: boolean;
    };
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    for (const material of materials) {
      if (typeof material.userData.baseOpacity !== 'number') {
        material.userData.baseOpacity =
          typeof material.opacity === 'number' ? material.opacity : 1;
      }
      material.transparent = true;
      material.opacity =
        material.userData.baseOpacity * (mesh.isPoints ? opacity * 0.72 : opacity);
    }
  });
}

function useTargetTransform({
  palmAnchor,
  videoSize,
  frameSize,
  fallbackVisible,
  worldHeight,
}: SymbolSceneProps): TargetTransform {
  return useMemo(() => {
    const target = resolveARSymbolTargetTransform({
      palmAnchor,
      videoSize,
      frameSize,
      fallbackVisible,
      worldHeight,
    });

    return {
      position: new THREE.Vector3(
        target.position.x,
        target.position.y,
        target.position.z
      ),
      scale: target.scale,
      opacity: target.opacity,
    };
  }, [fallbackVisible, frameSize, palmAnchor, videoSize, worldHeight]);
}

function SymbolScene(props: SymbolSceneProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const opacityRef = useRef(0);
  const target = useTargetTransform(props);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    group.position.lerp(target.position, ANCHOR_LERP);
    const nextScale = group.scale.x + (target.scale - group.scale.x) * SCALE_LERP;
    group.scale.setScalar(Math.max(0.001, nextScale));
    opacityRef.current += (target.opacity - opacityRef.current) * OPACITY_LERP;

    group.rotation.y += delta * 1.55;
    group.rotation.x = 0;
    group.rotation.z = 0;
    setMaterialOpacity(group, opacityRef.current);
  }, 1);

  return (
    <>
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.75} />
      <pointLight position={[-2, 1.8, 3]} intensity={1.15} />
      <group ref={groupRef} scale={0.001}>
        <PalmParticles symbol={props.state.symbol} />
        <group position={[0, SYMBOL_LOCAL_Y_OFFSET, 0]}>
          <SymbolMesh symbol={props.state.symbol} />
        </group>
      </group>
    </>
  );
}

export function ARSymbolOverlay(props: ARSymbolOverlayProps) {
  const zoom = props.frameSize ? props.frameSize.height / WORLD_HEIGHT : 100;

  return (
    <Canvas
      className="pointer-events-none absolute inset-0"
      orthographic
      camera={{ position: [0, 0, 12], zoom, near: 0.1, far: 100 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <SymbolScene {...props} worldHeight={WORLD_HEIGHT} />
    </Canvas>
  );
}
