'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  buildFacetBuffers,
  coverMetrics,
  dampMotionEnergy,
  expireStaleMotionTarget,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  motionAnchorsForCurrentHands,
  updateFacetedWindowState,
  updateMotionSampleLifecycle,
} from './facetedWindowGeometry.mjs';
import {
  FACET_FRAGMENT_SHADER,
  FACET_VERTEX_SHADER,
} from './facetedWindowShaders';

const CAMERA = { fov: 50, z: 3, depthScale: 0.32 } as const;
const FACET_MODES = [0, 1, 2] as const;
const PEARL_SEAM = '#EAF5FF';
const MIRRORED_INPUT = Object.freeze({ mirrored: true });
const EMPTY_HANDEDNESS: HandLandmarkerResult['handedness'][number] = [];

interface FacetedWindowProps {
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

type FacetUniforms = Record<string, THREE.IUniform> & {
  uVideo: { value: THREE.VideoTexture | null };
  uOpacity: { value: number };
  uMode: { value: number };
  uTime: { value: number };
  uMotion: { value: number };
  uViewport: { value: THREE.Vector2 };
};

interface RenderAnchor {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
}

interface VideoResources {
  videoTexture: THREE.VideoTexture;
}

interface MetricsDimensions {
  stageWidth: number;
  stageHeight: number;
  videoWidth: number;
  videoHeight: number;
}

function createUniforms(mode: number): FacetUniforms {
  return {
    uVideo: { value: null },
    uOpacity: { value: 0 },
    uMode: { value: mode },
    uTime: { value: 0 },
    uMotion: { value: 0 },
    uViewport: { value: new THREE.Vector2(1, 1) },
  };
}

function createVideoResources(video: HTMLVideoElement): VideoResources | null {
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    || video.videoWidth <= 0
    || video.videoHeight <= 0
  ) {
    return null;
  }

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;
  videoTexture.flipY = false;

  return { videoTexture };
}

function updateFacetNormal(
  positions: Float32Array,
  normals: Float32Array,
) {
  const edge1X = positions[3] - positions[0];
  const edge1Y = positions[4] - positions[1];
  const edge1Z = positions[5] - positions[2];
  const edge2X = positions[6] - positions[0];
  const edge2Y = positions[7] - positions[1];
  const edge2Z = positions[8] - positions[2];
  const edge3X = positions[15] - positions[9];
  const edge3Y = positions[16] - positions[10];
  const edge3Z = positions[17] - positions[11];

  let normalX = edge1Y * edge2Z - edge1Z * edge2Y;
  let normalY = edge1Z * edge2X - edge1X * edge2Z;
  let normalZ = edge1X * edge2Y - edge1Y * edge2X;
  normalX += edge2Y * edge3Z - edge2Z * edge3Y;
  normalY += edge2Z * edge3X - edge2X * edge3Z;
  normalZ += edge2X * edge3Y - edge2Y * edge3X;

  const inverseLength = 1 / Math.max(
    1e-6,
    Math.hypot(normalX, normalY, normalZ),
  );
  normalX *= inverseLength;
  normalY *= inverseLength;
  normalZ *= inverseLength;

  for (let offset = 0; offset < normals.length; offset += 3) {
    normals[offset] = normalX;
    normals[offset + 1] = normalY;
    normals[offset + 2] = normalZ;
  }
}

function FacetedScene({ landmarksRef, videoRef, enabled }: FacetedWindowProps) {
  const geometryRefs = useRef<Array<THREE.BufferGeometry | null>>([]);
  const materialRefs = useRef<Array<THREE.ShaderMaterial | null>>([]);
  const seamGroupRef = useRef<THREE.Group | null>(null);
  const seamMaterialRef = useRef<THREE.LineBasicMaterial | null>(null);
  const resourcesRef = useRef<VideoResources | null>(null);
  const facetedStateRef = useRef<ReturnType<typeof updateFacetedWindowState>>(
    initialFacetedWindowState(),
  );
  const handInputsRef = useRef<
    Array<NonNullable<ReturnType<typeof handMeshInputFromLandmarks>>>
  >([]);
  const lastLandmarkerResultRef = useRef<HandLandmarkerResult | null>(null);
  const wasEnabledRef = useRef(enabled);
  const drawingBufferSizeRef = useRef(new THREE.Vector2(1, 1));
  const metricsDimensionsRef = useRef<MetricsDimensions>({
    stageWidth: 0,
    stageHeight: 0,
    videoWidth: 0,
    videoHeight: 0,
  });
  const metricsRef = useRef<ReturnType<typeof coverMetrics>>(null);
  const cameraContractRef = useRef({ ...CAMERA, aspect: 1 });
  const motionEnergyRef = useRef(0);
  const motionTargetRef = useRef(0);
  const previousMotionAnchorsRef = useRef<RenderAnchor[] | null>(null);
  const lastMotionSampleMsRef = useRef<number | null>(null);

  const positionArrays = useMemo(
    () => FACET_MODES.map(() => new Float32Array(18)),
    [],
  );
  const uvArrays = useMemo(
    () => FACET_MODES.map(() => new Float32Array(12)),
    [],
  );
  const normalArrays = useMemo(
    () => FACET_MODES.map(() => new Float32Array(18)),
    [],
  );
  const uniforms = useMemo(
    () => FACET_MODES.map((mode) => createUniforms(mode)),
    [],
  );

  useEffect(() => () => {
    const resources = resourcesRef.current;
    if (!resources) return;
    resources.videoTexture.dispose();
    resourcesRef.current = null;
  }, []);

  useEffect(() => {
    const seamGroup = seamGroupRef.current;
    if (!seamGroup) return;

    const geometries = FACET_MODES.map((mode) => geometryRefs.current[mode]);
    const materials = FACET_MODES.map((mode) => materialRefs.current[mode]);

    for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
      const geometry = geometries[mode];
      if (!geometry) continue;

      const positionAttribute = new THREE.BufferAttribute(positionArrays[mode], 3);
      const uvAttribute = new THREE.BufferAttribute(uvArrays[mode], 2);
      const normalAttribute = new THREE.BufferAttribute(normalArrays[mode], 3);
      positionAttribute.setUsage(THREE.DynamicDrawUsage);
      uvAttribute.setUsage(THREE.DynamicDrawUsage);
      normalAttribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('position', positionAttribute);
      geometry.setAttribute('uv', uvAttribute);
      geometry.setAttribute('normal', normalAttribute);
      geometry.setDrawRange(0, 6);
    }

    const seamMaterial = new THREE.LineBasicMaterial({
      color: PEARL_SEAM,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    });
    seamMaterialRef.current = seamMaterial;
    const seamEntries: Array<{
      geometry: THREE.BufferGeometry;
      index: THREE.Uint16BufferAttribute;
      line: THREE.LineSegments;
    }> = [];

    geometries.forEach((geometry, mode) => {
      if (!geometry) return;
      const seamIndex = new THREE.Uint16BufferAttribute(
        [0, 1, 1, 2, 2, 5, 5, 0],
        1,
      );
      const line = new THREE.LineSegments(geometry, seamMaterial);
      line.frustumCulled = false;
      line.renderOrder = 8 + mode;
      line.onBeforeRender = () => {
        geometry.setIndex(seamIndex);
        geometry.setDrawRange(0, 8);
      };
      line.onAfterRender = () => {
        geometry.setIndex(null);
        geometry.setDrawRange(0, 6);
      };
      seamGroup.add(line);
      seamEntries.push({ geometry, index: seamIndex, line });
    });

    return () => {
      seamEntries.forEach(({ line }) => {
        seamGroup.remove(line);
        line.onBeforeRender = () => {};
        line.onAfterRender = () => {};
      });
      seamMaterial.dispose();
      seamMaterialRef.current = null;

      materials.forEach((material) => {
        if (!material) return;
        material.uniforms.uVideo.value = null;
        material.dispose();
      });
      seamEntries.forEach(({ geometry, index }) => {
        geometry.setIndex(index);
        geometry.dispose();
        geometry.setIndex(null);
        geometry.setDrawRange(0, 6);
      });
    };
  }, [normalArrays, positionArrays, uvArrays]);

  useFrame((frameState, deltaSeconds) => {
    const elapsedMilliseconds = frameState.clock.elapsedTime * 1000;
    const seamMaterial = seamMaterialRef.current;
    const video = videoRef.current;
    let resources = resourcesRef.current;

    if (!enabled) {
      if (wasEnabledRef.current) {
        facetedStateRef.current = initialFacetedWindowState();
        handInputsRef.current.length = 0;
        lastLandmarkerResultRef.current = null;
      }
      motionEnergyRef.current = 0;
      motionTargetRef.current = 0;
      previousMotionAnchorsRef.current = null;
      lastMotionSampleMsRef.current = null;
      wasEnabledRef.current = false;
      for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
        const material = materialRefs.current[mode];
        if (material) material.uniforms.uOpacity.value = 0;
      }
      if (seamMaterial) seamMaterial.opacity = 0;
      return;
    }
    wasEnabledRef.current = true;

    if (!resources && video) {
      resources = createVideoResources(video);
      if (resources) {
        resourcesRef.current = resources;
        for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
          const material = materialRefs.current[mode];
          if (!material) continue;
          material.uniforms.uVideo.value = resources.videoTexture;
        }
      }
    }

    const result = landmarksRef.current;
    const handInputs = handInputsRef.current;
    const resultChanged = lastLandmarkerResultRef.current !== result;
    if (resultChanged) {
      lastLandmarkerResultRef.current = result;
      handInputs.length = 0;
      if (result) {
        for (let index = 0; index < result.landmarks.length; index += 1) {
          const handedness = result.handedness?.[index]
            ?? result.handednesses?.[index]
            ?? EMPTY_HANDEDNESS;
          const input = handMeshInputFromLandmarks(
            result.landmarks[index],
            handedness,
            MIRRORED_INPUT,
          );
          if (input) handInputs.push(input);
        }
      }
    }

    if (
      resultChanged
      || (facetedStateRef.current.armed && handInputs.length < 2)
    ) {
      facetedStateRef.current = updateFacetedWindowState(
        facetedStateRef.current as Parameters<typeof updateFacetedWindowState>[0],
        handInputs,
        elapsedMilliseconds,
      );
    }
    const facetedState = facetedStateRef.current;

    const dimensions = metricsDimensionsRef.current;
    let dimensionsChanged = false;
    if (video) {
      dimensionsChanged = (
        dimensions.stageWidth !== frameState.size.width
        || dimensions.stageHeight !== frameState.size.height
        || dimensions.videoWidth !== video.videoWidth
        || dimensions.videoHeight !== video.videoHeight
      );
      if (dimensionsChanged) {
        dimensions.stageWidth = frameState.size.width;
        dimensions.stageHeight = frameState.size.height;
        dimensions.videoWidth = video.videoWidth;
        dimensions.videoHeight = video.videoHeight;
        metricsRef.current = coverMetrics(
          dimensions.stageWidth,
          dimensions.stageHeight,
          dimensions.videoWidth,
          dimensions.videoHeight,
        );
      }
    }

    const cameraContract = cameraContractRef.current;
    cameraContract.aspect = frameState.size.width / Math.max(1, frameState.size.height);
    const motionMetrics = metricsRef.current;
    if (resultChanged || dimensionsChanged) {
      const currentAnchors = motionAnchorsForCurrentHands(
        facetedState.pair,
        motionMetrics,
        handInputs.length,
      ) as RenderAnchor[] | null;
      const nextMotionSample = updateMotionSampleLifecycle(
        {
          target: motionTargetRef.current,
          anchors: previousMotionAnchorsRef.current,
          timestampMs: lastMotionSampleMsRef.current,
        },
        currentAnchors,
        motionMetrics,
        elapsedMilliseconds,
        resultChanged,
        dimensionsChanged,
      );
      motionTargetRef.current = nextMotionSample.target;
      previousMotionAnchorsRef.current = nextMotionSample.anchors;
      lastMotionSampleMsRef.current = nextMotionSample.timestampMs;
    }

    motionTargetRef.current = expireStaleMotionTarget(
      motionTargetRef.current,
      lastMotionSampleMsRef.current,
      elapsedMilliseconds,
    );
    motionEnergyRef.current = dampMotionEnergy(
      motionEnergyRef.current,
      motionTargetRef.current,
      deltaSeconds,
    );
    if (
      (resultChanged || dimensionsChanged)
      && facetedState.pair
      && metricsRef.current
      && video
    ) {
      const facetBuffers = buildFacetBuffers(
        facetedState,
        metricsRef.current,
        cameraContract,
      );
      for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
        const facet = facetBuffers[mode];
        const positions = positionArrays[mode];
        const uvs = uvArrays[mode];
        const normals = normalArrays[mode];
        positions.set(facet.positions);
        uvs.set(facet.uvs);
        updateFacetNormal(positions, normals);

        const geometry = geometryRefs.current[mode];
        if (!geometry) continue;
        const positionAttribute = geometry.getAttribute('position');
        const uvAttribute = geometry.getAttribute('uv');
        const normalAttribute = geometry.getAttribute('normal');
        positionAttribute.needsUpdate = true;
        uvAttribute.needsUpdate = true;
        normalAttribute.needsUpdate = true;
      }
    }

    frameState.gl.getDrawingBufferSize(drawingBufferSizeRef.current);
    const renderOpacity = resources && video ? facetedState.opacity : 0;
    for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
      const material = materialRefs.current[mode];
      if (!material) continue;
      material.uniforms.uOpacity.value = renderOpacity;
      material.uniforms.uTime.value = frameState.clock.elapsedTime;
      material.uniforms.uMotion.value = motionEnergyRef.current;
      material.uniforms.uViewport.value.copy(drawingBufferSizeRef.current);
    }
    if (seamMaterial) seamMaterial.opacity = renderOpacity * 0.55;
  });

  return (
    <group>
      <group ref={seamGroupRef} />
      {FACET_MODES.map((mode) => (
        <mesh key={mode} frustumCulled={false} renderOrder={mode}>
          <bufferGeometry
            ref={(geometry) => {
              geometryRefs.current[mode] = geometry as THREE.BufferGeometry | null;
            }}
          />
          <shaderMaterial
            ref={(material) => { materialRefs.current[mode] = material; }}
            uniforms={uniforms[mode]}
            vertexShader={FACET_VERTEX_SHADER}
            fragmentShader={FACET_FRAGMENT_SHADER}
            side={THREE.DoubleSide}
            transparent
            depthTest
            depthWrite
          />
        </mesh>
      ))}
    </group>
  );
}

export function FacetedWindow(props: FacetedWindowProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
      camera={{
        fov: CAMERA.fov,
        position: [0, 0, CAMERA.z],
        near: 0.1,
        far: 10,
      }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <FacetedScene {...props} />
    </Canvas>
  );
}

export default FacetedWindow;
