# Faceted Fingertip Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat ASCII rectangle at `/reels/window` with a smooth four-face WebGL mesh anchored to all five fingertips on each hand, using the approved hybrid face treatments.

**Architecture:** Keep `WindowMode` as the single owner of camera and MediaPipe lifecycle. Add a pure `.mjs` geometry/state module and a transparent React Three Fiber renderer that reads the latest complete `HandLandmarkerResult` through refs, shares the existing video element as one `VideoTexture`, and updates stable buffers without per-frame React state.

**Tech Stack:** Next.js 16, React 19, TypeScript, MediaPipe Tasks Vision, Three.js 0.181, React Three Fiber 9, Node `node:test`, GLSL.

## Global Constraints

- Do not stage or commit any file unless the user explicitly asks in a later message.
- Do not add dependencies.
- Do not create another camera stream, `<video>` element, or HandLandmarker instance.
- Preserve the `/reels/window` route shell, mirrored webcam, skeleton overlay, and camera/model error states.
- The mesh requires two tracked hands and arms only when both hands enter a tight pinch.
- The visible mesh has exactly four anatomical bands: thumb-index, index-middle, middle-ring, ring-pinky.
- Treat MediaPipe `z` as relative input: normalize, clamp, and visually exaggerate it; never present it as calibrated distance.
- Normal camera/landmark frames must not trigger React state renders.
- Follow red-green TDD for pure geometry and lifecycle behavior.

---

## File Structure

- Create `components/WindowMode/facetedWindowGeometry.mjs`: pure landmark normalization, stable hand pairing, pinch collapse, smoothing, lifecycle, cover projection, and face-buffer generation.
- Create `components/WindowMode/facetedWindowGeometry.test.mjs`: synthetic-landmark unit tests for every pure behavior.
- Create `components/WindowMode/facetedWindowShaders.ts`: shared vertex shader and four-mode fragment shader.
- Create `components/WindowMode/FacetedWindow.tsx`: React Three Fiber canvas, shared video/ASCII textures, four reusable meshes/materials, and cleanup.
- Modify `components/WindowMode/WindowMode.tsx`: retain camera/tracker/error/skeleton ownership, store full results, remove the flat canvas renderer, and mount `FacetedWindow`.
- Retain `components/WindowMode/windowGesture.mjs` and its tests until usage inspection proves safe removal; they are not part of the new render path.

---

### Task 1: Pure Fingertip Geometry and Lifecycle

**Files:**
- Create: `components/WindowMode/facetedWindowGeometry.test.mjs`
- Create: `components/WindowMode/facetedWindowGeometry.mjs`

**Interfaces:**
- Consumes: MediaPipe-like landmark arrays (`{x, y, z}`), handedness categories (`{categoryName, score}`), timestamps in milliseconds, video/stage dimensions.
- Produces:
  - `FINGERTIP_INDICES: readonly [4, 8, 12, 16, 20]`
  - `initialFacetedWindowState(): FacetedWindowState`
  - `handMeshInputFromLandmarks(landmarks, handedness, options): HandMeshInput | null`
  - `assignHandPair(hands, previousPair): {a, b} | null`
  - `updateFacetedWindowState(previous, hands, timestampMs, options): FacetedWindowState`
  - `coverMetrics(stageWidth, stageHeight, videoWidth, videoHeight): CoverMetrics | null`
  - `buildFacetBuffers(state, metrics, camera): Array<{positions, uvs}>`

- [ ] **Step 1: Write failing extraction, mirroring, and collapse tests**

Use a deterministic 21-landmark fixture and assert the exact anatomical order, mirrored display coordinates, source UV coordinates, normalized pinch ratio, and collapse endpoints.

```js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FINGERTIP_INDICES,
  handMeshInputFromLandmarks,
} from './facetedWindowGeometry.mjs';

function handFixture({ x = 0.5, pinch = false, z = 0 } = {}) {
  const points = Array.from({ length: 21 }, () => ({ x, y: 0.6, z }));
  points[0] = { x, y: 0.82, z: 0 };
  points[9] = { x, y: 0.52, z: 0 };
  const tips = [
    { x: x - 0.15, y: 0.55, z: -0.01 },
    { x: x - 0.08, y: 0.32, z: -0.04 },
    { x, y: 0.27, z: -0.08 },
    { x: x + 0.08, y: 0.32, z: -0.05 },
    { x: x + 0.14, y: 0.42, z: -0.02 },
  ];
  FINGERTIP_INDICES.forEach((index, i) => { points[index] = tips[i]; });
  if (pinch) points[4] = { ...points[8], x: points[8].x - 0.01 };
  return points;
}

describe('handMeshInputFromLandmarks', () => {
  it('extracts five anatomical tips and preserves source UVs while mirroring display x', () => {
    const input = handMeshInputFromLandmarks(
      handFixture(),
      [{ categoryName: 'Left', score: 0.98 }],
      { mirrored: true },
    );
    assert.ok(input);
    assert.equal(input.rail.length, 5);
    assert.deepEqual(FINGERTIP_INDICES, [4, 8, 12, 16, 20]);
    assert.equal(Number(input.rail[1].x.toFixed(2)), 0.58);
    assert.equal(Number(input.rail[1].u.toFixed(2)), 0.42);
  });

  it('drives collapse weight near one for a tight thumb-index pinch', () => {
    const input = handMeshInputFromLandmarks(handFixture({ pinch: true }), [], { mirrored: true });
    assert.ok(input);
    assert.ok(input.collapse > 0.95);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test components/WindowMode/facetedWindowGeometry.test.mjs`

Expected: FAIL because `facetedWindowGeometry.mjs` does not exist.

- [ ] **Step 3: Implement landmark extraction and continuous collapse**

Implement hand-size normalization from wrist `0` to middle MCP `9`, smoothstep collapse between tight-pinch and open thresholds, wrist-relative clamped depth, mirrored display points, and unmirrored UVs.

```js
export const FINGERTIP_INDICES = Object.freeze([4, 8, 12, 16, 20]);

const DEFAULTS = Object.freeze({
  armPinchRatio: 0.32,
  openPinchRatio: 0.78,
  depthLimit: 0.9,
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function handMeshInputFromLandmarks(landmarks, handedness = [], optionsArg = {}) {
  const options = { ...DEFAULTS, ...optionsArg };
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (!wrist || !middleMcp || !thumb || !index) return null;
  const handSize = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y, (wrist.z ?? 0) - (middleMcp.z ?? 0));
  if (!Number.isFinite(handSize) || handSize <= 1e-6) return null;
  const pinchRatio = Math.hypot(thumb.x - index.x, thumb.y - index.y, (thumb.z ?? 0) - (index.z ?? 0)) / handSize;
  const collapse = 1 - smoothstep(options.armPinchRatio, options.openPinchRatio, pinchRatio);
  const toPoint = (point) => ({
    x: options.mirrored === false ? point.x : 1 - point.x,
    y: point.y,
    z: clamp(((wrist.z ?? 0) - (point.z ?? 0)) / handSize, -options.depthLimit, options.depthLimit),
    u: point.x,
    v: 1 - point.y,
  });
  return {
    label: handedness[0]?.categoryName || '',
    score: handedness[0]?.score ?? 0,
    pinchRatio,
    collapse,
    center: toPoint(middleMcp),
    pinch: toPoint({
      x: (thumb.x + index.x) / 2,
      y: (thumb.y + index.y) / 2,
      z: ((thumb.z ?? 0) + (index.z ?? 0)) / 2,
    }),
    rail: FINGERTIP_INDICES.map((tipIndex) => toPoint(landmarks[tipIndex])),
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test components/WindowMode/facetedWindowGeometry.test.mjs`

Expected: PASS for extraction and collapse tests.

- [ ] **Step 5: Add failing stable-pair, arming, damping, fade/reset, and topology tests**

Add distinct assertions for:

```js
it('arms only when two hands are tightly pinched');
it('keeps anatomical roles stable when detector array order reverses');
it('collapses one rail while leaving an open rail spread');
it('creates four quads with consistent vertex and UV ordering');
it('damps equivalent elapsed time consistently across frame rates');
it('holds briefly, fades, then resets after sustained hand loss');
it('maps mirrored video coordinates through object-cover cropping');
it('projects depth without moving the final screen anchor');
```

Use explicit timestamps (`0`, `16`, `150`, `300`, `750`) and fixed dimensions (`stage 540×960`, `video 1920×1080`).

- [ ] **Step 6: Run the expanded test and verify RED**

Run: `node --test components/WindowMode/facetedWindowGeometry.test.mjs`

Expected: FAIL on the first not-yet-implemented state/topology behavior.

- [ ] **Step 7: Implement stable assignment, lifecycle, smoothing, and facet buffers**

Use the approved state shape and stable return contracts:

```js
export function initialFacetedWindowState() {
  return {
    armed: false,
    pair: null,
    opacity: 0,
    lastSeenMs: 0,
    lastUpdateMs: 0,
  };
}

export function damp(current, target, lambda, deltaSeconds) {
  return target + (current - target) * Math.exp(-lambda * Math.max(0, deltaSeconds));
}

export function coverMetrics(stageWidth, stageHeight, videoWidth, videoHeight) {
  if (![stageWidth, stageHeight, videoWidth, videoHeight].every((value) => value > 0)) return null;
  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight);
  const displayWidth = videoWidth * scale;
  const displayHeight = videoHeight * scale;
  return {
    stageWidth,
    stageHeight,
    displayWidth,
    displayHeight,
    offsetX: (stageWidth - displayWidth) / 2,
    offsetY: (stageHeight - displayHeight) / 2,
  };
}
```

`updateFacetedWindowState` must use handedness first, previous-centroid proximity second, and screen-x sorting only for the first unlabeled pair. It must blend each rail point and its UV toward the pinch point by collapse weight, then damp x/y/z/u/v/collapse. `buildFacetBuffers` must emit four quads ordered `[a[i], b[i], b[i+1], a[i+1]]` with triangle index order `[0, 1, 2, 0, 2, 3]`.

For exact screen anchoring with a perspective camera:

```js
function projectedWorldPoint(point, metrics, camera) {
  const px = metrics.offsetX + point.x * metrics.displayWidth;
  const py = metrics.offsetY + point.y * metrics.displayHeight;
  const ndcX = (px / metrics.stageWidth) * 2 - 1;
  const ndcY = 1 - (py / metrics.stageHeight) * 2;
  const z = point.z * camera.depthScale;
  const distance = camera.z - z;
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance;
  const halfWidth = halfHeight * camera.aspect;
  return { x: ndcX * halfWidth, y: ndcY * halfHeight, z };
}
```

- [ ] **Step 8: Run Task 1 verification**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
node --test components/WindowMode/windowGesture.test.mjs
```

Expected: all tests pass with zero failures.

- [ ] **Step 9: Review checkpoint without staging or committing**

Run: `git diff --check && git status --short`

Expected: only the approved spec, plan, and Task 1 files are uncommitted; no file is staged.

---

### Task 2: Hybrid Shader and Reusable WebGL Renderer

**Files:**
- Create: `components/WindowMode/facetedWindowShaders.ts`
- Create: `components/WindowMode/FacetedWindow.tsx`

**Interfaces:**
- Consumes:
  - `landmarksRef: RefObject<HandLandmarkerResult | null>`
  - `videoRef: RefObject<HTMLVideoElement | null>`
  - `enabled: boolean`
  - Task 1 geometry/state functions
- Produces: `<FacetedWindow landmarksRef videoRef enabled />`

- [ ] **Step 1: Define one shared vertex shader and four-mode fragment shader**

Export `FACET_VERTEX_SHADER` and `FACET_FRAGMENT_SHADER`. The vertex shader passes UV, transformed normal, and world position. The fragment shader shares `uVideo`, `uAscii`, `uOpacity`, `uMode`, `uTime`, and `uViewport` and implements exact modes:

```glsl
// mode 0: dark ASCII texture
// mode 1: cobalt/chalk cyanotype threshold
// mode 2: green/cream duotone with restrained RGB separation
// mode 3: coral stipple-halftone on a light ground

float luminance(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
```

All modes multiply by restrained face lighting derived from `vNormal`, preserve `uOpacity`, and add a thin warm seam through a separate line mesh rather than shader edge detection.

- [ ] **Step 2: Implement the transparent R3F canvas and four stable meshes**

`FacetedWindow.tsx` must:

- create one `THREE.VideoTexture(videoRef.current)` with `SRGBColorSpace`, linear filtering, and `flipY = false`
- create one reusable offscreen ASCII canvas and `THREE.CanvasTexture`
- create exactly four `BufferGeometry` objects and four `ShaderMaterial` objects
- update their position/UV attributes and normals inside `useFrame`
- update the ASCII canvas at most every 80 milliseconds
- cap Canvas DPR to `[1, 1.5]`
- render with alpha and no clear-color fill
- dispose every geometry/material/texture on unmount
- avoid React state in the frame loop

Use a fixed camera contract matching Task 1:

```tsx
const CAMERA = { fov: 50, z: 3, depthScale: 0.32 } as const;

<Canvas
  dpr={[1, 1.5]}
  gl={{ alpha: true, antialias: true, premultipliedAlpha: false }}
  camera={{ fov: CAMERA.fov, position: [0, 0, CAMERA.z], near: 0.1, far: 10 }}
  style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
>
  <FacetedScene {...props} />
</Canvas>
```

Keep mesh instances stable:

```tsx
const geometryRefs = useRef<Array<THREE.BufferGeometry | null>>([]);
const materialRefs = useRef<Array<THREE.ShaderMaterial | null>>([]);

return (
  <group>
    {[0, 1, 2, 3].map((mode) => (
      <mesh key={mode} frustumCulled={false} renderOrder={mode}>
        <bufferGeometry ref={(geometry) => { geometryRefs.current[mode] = geometry; }} />
        <shaderMaterial
          ref={(material) => { materialRefs.current[mode] = material; }}
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
```

- [ ] **Step 3: Implement the offscreen ASCII texture**

Reuse the existing character ramp exactly:

```ts
const ASCII_RAMP = ' .,:;irsXA253hMHGS#9B&@';
const ASCII_REFRESH_MS = 80;
```

Sample the existing video into a small readback canvas, map luminance to characters, and draw light warm-gray glyphs over a near-black ground. Do not create or play another video.

- [ ] **Step 4: Run TypeScript and lint verification**

Run:

```bash
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
```

Expected: both commands exit 0 with no new errors.

- [ ] **Step 5: Review checkpoint without staging or committing**

Run: `git diff --check && git status --short`

Expected: Task 1 and Task 2 files remain unstaged and uncommitted.

---

### Task 3: Integrate the Faceted Renderer and Verify the Complete Route

**Files:**
- Modify: `components/WindowMode/WindowMode.tsx`
- Verify: `app/reels/_components/ReelsWindowMode.tsx`
- Verify: `app/reels/_components/ReelsWindowClient.tsx`
- Verify: `app/reels/window/page.tsx`

**Interfaces:**
- Consumes: `<FacetedWindow landmarksRef videoRef enabled />` from Task 2.
- Produces: the existing `/reels/window` route with unchanged shell/error behavior and the new faceted inner object.

- [ ] **Step 1: Replace the flat canvas path in `WindowMode`**

Keep `rootRef`, `videoRef`, `landmarksRef`, camera state, hand-model error, `useCameraStream`, `useHandTracking`, mirrored `<video>`, `SkeletonOverlay`, and the enable/error UI. Remove the rectangle gesture state, `windowGesture.mjs` imports, rounded shell helpers, ASCII draw loop, and flat `<canvas>`.

The result callback becomes data-only:

```tsx
const onResult = useCallback((result: HandLandmarkerResult) => {
  landmarksRef.current = result;
  setHandError(null);
}, []);
```

Mount the new renderer at the old canvas layer:

```tsx
<div className="pointer-events-none absolute inset-0 z-10">
  <FacetedWindow
    landmarksRef={landmarksRef}
    videoRef={videoRef}
    enabled={cameraActive}
  />
</div>
<div className="absolute inset-0 z-20">
  <SkeletonOverlay
    landmarksRef={landmarksRef}
    videoRef={videoRef}
    enabled={cameraActive}
  />
</div>
```

- [ ] **Step 2: Run focused and project verification**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
node --test components/WindowMode/windowGesture.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
npm run build
```

Expected: every command exits 0; geometry and legacy tests report zero failures; the build includes `/reels/window`.

- [ ] **Step 3: Start the development server and inspect baseline route state**

Run: `npm run dev`

Open `/reels/window`. Verify the existing Mac-style full-stage frame, `camera` title, enable-camera button or granted camera, mirrored video, and skeleton remain intact.

- [ ] **Step 4: Perform live gesture verification**

Verify each approved state on camera:

1. Open hands before activation do not show a mesh.
2. Two pinches arm a narrow ribbon.
3. Keeping one hand pinched while opening the other creates a clear apex-to-five-fingertip cone/diamond.
4. Opening both hands creates a four-band warped window.
5. Rotating/moving fingers keeps all four treatments anatomically attached.
6. Bringing fingers toward or away from the camera changes face overlap/shading without detaching screen anchors.
7. Brief hand loss holds without flicker; sustained loss fades and resets.
8. Re-pinching both hands re-arms after reset.

- [ ] **Step 5: Inspect browser errors and capture visual evidence**

Confirm no shader compilation, WebGL, camera, resource cleanup, or React errors. Capture at least one screenshot of the one-pinched/one-open cone and one screenshot of the both-open window for final comparison.

- [ ] **Step 6: Final review without staging or committing**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: all implementation and documentation files are visible as unstaged/uncommitted changes; no unrelated files changed; no commit is created.
