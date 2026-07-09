'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  buildFacetBuffers,
  coverMetrics,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  updateFacetedWindowState,
} from './facetedWindowGeometry.mjs';
import {
  FACET_FRAGMENT_SHADER,
  FACET_VERTEX_SHADER,
} from './facetedWindowShaders';

const CAMERA = { fov: 50, z: 3, depthScale: 0.32 } as const;
const FACET_MODES = [0, 1, 2, 3] as const;
const ASCII_RAMP = ' .,:;irsXA253hMHGS#9B&@';
const ASCII_REFRESH_MS = 80;
const ASCII_COLUMNS = 72;
const ASCII_CELL_WIDTH = 6;
const ASCII_CELL_HEIGHT = 10;
const ASCII_FONT_STACK = '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
const INK = '#070709';
const BONE = '#F4F0E6';
const BLUSH = '#F8BCB2';
const MIRRORED_INPUT = Object.freeze({ mirrored: true });
const EMPTY_HANDEDNESS: HandLandmarkerResult['handedness'][number] = [];

interface FacetedWindowProps {
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

type FacetUniforms = Record<string, THREE.IUniform> & {
  uVideo: { value: THREE.VideoTexture | null };
  uAscii: { value: THREE.CanvasTexture | null };
  uOpacity: { value: number };
  uMode: { value: number };
  uTime: { value: number };
  uViewport: { value: THREE.Vector2 };
};

interface TextureResources {
  asciiCanvas: HTMLCanvasElement;
  asciiContext: CanvasRenderingContext2D;
  asciiTexture: THREE.CanvasTexture;
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
    uAscii: { value: null },
    uOpacity: { value: 0 },
    uMode: { value: mode },
    uTime: { value: 0 },
    uViewport: { value: new THREE.Vector2(1, 1) },
  };
}

function createTextureResources(video: HTMLVideoElement): TextureResources | null {
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    || video.videoWidth <= 0
    || video.videoHeight <= 0
  ) {
    return null;
  }

  const rows = Math.max(
    1,
    Math.round(
      (video.videoHeight / video.videoWidth)
      * ASCII_COLUMNS
      * (ASCII_CELL_WIDTH / ASCII_CELL_HEIGHT),
    ),
  );
  const asciiCanvas = document.createElement('canvas');
  asciiCanvas.width = ASCII_COLUMNS * ASCII_CELL_WIDTH;
  asciiCanvas.height = rows * ASCII_CELL_HEIGHT;
  const asciiContext = asciiCanvas.getContext('2d', { willReadFrequently: true });
  if (!asciiContext) return null;
  asciiContext.fillStyle = INK;
  asciiContext.fillRect(0, 0, asciiCanvas.width, asciiCanvas.height);

  const videoTexture = new THREE.VideoTexture(video);
  videoTexture.colorSpace = THREE.SRGBColorSpace;
  videoTexture.minFilter = THREE.LinearFilter;
  videoTexture.magFilter = THREE.LinearFilter;
  videoTexture.generateMipmaps = false;
  videoTexture.flipY = false;

  const asciiTexture = new THREE.CanvasTexture(asciiCanvas);
  asciiTexture.colorSpace = THREE.SRGBColorSpace;
  asciiTexture.minFilter = THREE.LinearFilter;
  asciiTexture.magFilter = THREE.LinearFilter;
  asciiTexture.generateMipmaps = false;
  asciiTexture.flipY = false;

  return { asciiCanvas, asciiContext, asciiTexture, videoTexture };
}

function drawAsciiTexture(resources: TextureResources, video: HTMLVideoElement) {
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
    || video.videoWidth <= 0
    || video.videoHeight <= 0
  ) {
    return;
  }

  const { asciiCanvas: canvas, asciiContext: context } = resources;
  const rows = Math.max(1, Math.floor(canvas.height / ASCII_CELL_HEIGHT));
  const outputWidth = canvas.width;
  const outputHeight = canvas.height;

  context.globalAlpha = 1;
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, outputWidth, outputHeight);
  context.drawImage(video, 0, 0, ASCII_COLUMNS, rows);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, ASCII_COLUMNS, rows).data;
  } catch {
    return;
  }

  context.clearRect(0, 0, outputWidth, outputHeight);
  context.fillStyle = INK;
  context.fillRect(0, 0, outputWidth, outputHeight);
  context.fillStyle = BONE;
  context.font = `${ASCII_CELL_HEIGHT - 1}px ${ASCII_FONT_STACK}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < ASCII_COLUMNS; x += 1) {
      const pixelIndex = (y * ASCII_COLUMNS + x) * 4;
      const luminance = (
        0.2126 * pixels[pixelIndex]
        + 0.7152 * pixels[pixelIndex + 1]
        + 0.0722 * pixels[pixelIndex + 2]
      ) / 255;
      const characterIndex = Math.min(
        ASCII_RAMP.length - 1,
        Math.floor(luminance * ASCII_RAMP.length),
      );
      context.globalAlpha = 0.3 + luminance * 0.7;
      context.fillText(
        ASCII_RAMP[characterIndex],
        x * ASCII_CELL_WIDTH + ASCII_CELL_WIDTH * 0.5,
        y * ASCII_CELL_HEIGHT + ASCII_CELL_HEIGHT * 0.54,
      );
    }
  }

  context.globalAlpha = 1;
  resources.asciiTexture.needsUpdate = true;
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
  const resourcesRef = useRef<TextureResources | null>(null);
  const facetedStateRef = useRef<ReturnType<typeof updateFacetedWindowState>>(
    initialFacetedWindowState(),
  );
  const handInputsRef = useRef<
    Array<NonNullable<ReturnType<typeof handMeshInputFromLandmarks>>>
  >([]);
  const lastLandmarkerResultRef = useRef<HandLandmarkerResult | null>(null);
  const lastAsciiUpdateRef = useRef(Number.NEGATIVE_INFINITY);
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
    resources.asciiTexture.dispose();
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
      color: BLUSH,
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
        material.uniforms.uAscii.value = null;
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

  useFrame((frameState) => {
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
      resources = createTextureResources(video);
      if (resources) {
        resourcesRef.current = resources;
        for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
          const material = materialRefs.current[mode];
          if (!material) continue;
          material.uniforms.uVideo.value = resources.videoTexture;
          material.uniforms.uAscii.value = resources.asciiTexture;
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

    if (
      resources
      && video
      && elapsedMilliseconds - lastAsciiUpdateRef.current >= ASCII_REFRESH_MS
    ) {
      drawAsciiTexture(resources, video);
      lastAsciiUpdateRef.current = elapsedMilliseconds;
    }

    frameState.gl.getDrawingBufferSize(drawingBufferSizeRef.current);
    const renderOpacity = resources && video ? facetedState.opacity : 0;
    for (let mode = 0; mode < FACET_MODES.length; mode += 1) {
      const material = materialRefs.current[mode];
      if (!material) continue;
      material.uniforms.uOpacity.value = renderOpacity;
      material.uniforms.uTime.value = frameState.clock.elapsedTime;
      material.uniforms.uViewport.value.copy(drawingBufferSizeRef.current);
    }
    if (seamMaterial) seamMaterial.opacity = renderOpacity * 0.72;
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
