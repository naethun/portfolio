# Cryogenic Pearl Three-Facet Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `/reels/window` from four unrelated fingertip facets to three connected Cryogenic Pearl facets that remain camera-readable and respond cohesively to hand motion and facet angle.

**Architecture:** Preserve the existing five-point hand state and gesture lifecycle, then resample each damped hand rail into four display-space anchors only when building render data. Three stable WebGL meshes share one live `VideoTexture`, one motion-energy signal, one caustic field, and three phase-specific shader branches: frosted diffusion, liquid mercury, and interference membrane.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, React Three Fiber 9, Three.js 0.181, MediaPipe Tasks Vision 0.10, GLSL ES 1.0, Node test runner.

**Design specification:** `docs/superpowers/specs/2026-07-14-cryogenic-pearl-three-facet-window-design.md`

## Global Constraints

- Scope the change to `/reels/window`; do not change other `/reels` or `/portrait` routes.
- Preserve the existing camera lifecycle, MediaPipe configuration, two-hand pinch activation, hand assignment, collapse/open-fan behavior, damping, projection, tracking hold/fade, and error UI.
- Render exactly three connected facets while retaining all five fingertips in the stored hand rails.
- Keep one camera stream, one video element, one `VideoTexture`, one WebGL canvas, and three stable meshes.
- Do not add dependencies, controls, filter selection, audio reactivity, recording, export, a CPU processing canvas, or another texture source.
- Keep the `/reels/window` stage at `11 / 16` and preserve the existing Mac-style camera window.
- Use the Cryogenic Pearl palette exactly: optical ink `#080D13`, ice white `#EFFCFF`, cool silver `#B4C6D4`, pearl `#ECE9FF`, cyan `#71F1F3`, violet `#806EFF`, and seam `#EAF5FF`.
- Map normalized screen speed through `smoothstep(0.03, 0.45, speed)`; use attack lambda `14` and release lambda `5`.
- Keep material assignment anatomical: thumb-side frost, center mercury, pinky-side interference.
- Do not claim the live interaction is verified unless the permissioned camera path is exercised with real hands.

## File Structure

- Modify `components/WindowMode/facetedWindowGeometry.mjs`: own five-to-four rail resampling, three-facet buffer construction, normalized anchor speed, and motion-energy damping as pure functions.
- Modify `components/WindowMode/facetedWindowGeometry.test.mjs`: prove resampling, UV alignment, three-facet topology, and motion response without React or WebGL.
- Modify `components/WindowMode/FacetedWindow.tsx`: render three stable meshes, maintain motion refs, publish `uMotion`, and use pearl seams.
- Modify `components/WindowMode/facetedWindowShaders.ts`: replace four existing material branches with the shared Cryogenic Pearl optical pipeline and three phase branches.
- Modify `components/WindowMode/facetedWindowShaders.test.mjs`: lock the renderer/shader contract, three mode names, palette, shared signals, single sampler, and removal of old treatments.
- Do not modify `components/WindowMode/WindowMode.tsx`, route wrappers, hand-tracking hooks, `ReelsModeShell`, `ReelsStageWindow`, or the skeleton overlay unless a failing regression test demonstrates a direct requirement.

---

### Task 1: Resample Five Fingertips Into Three Render Facets

**Files:**
- Modify: `components/WindowMode/facetedWindowGeometry.mjs:276-323`
- Test: `components/WindowMode/facetedWindowGeometry.test.mjs:4-12,319-380`

**Interfaces:**
- Consumes: existing rail points shaped as `{ x, y, z, u, v }` and existing `coverMetrics(...)` output.
- Produces: `resampleRailToAnchors(rail, metrics) -> Array<{ x, y, z, u, v }>` with exactly four anchors, and `buildFacetBuffers(...)` with exactly three facet buffers.

- [ ] **Step 1: Write failing rail-resampling and three-facet tests**

Replace the geometry import with:

```js
import {
  FINGERTIP_INDICES,
  assignHandPair,
  buildFacetBuffers,
  coverMetrics,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  resampleRailToAnchors,
  updateFacetedWindowState,
} from './facetedWindowGeometry.mjs';
```

Add this helper near the existing fixtures:

```js
function assertPointClose(actual, expected, epsilon = 1e-9) {
  for (const key of ['x', 'y', 'z', 'u', 'v']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) < epsilon,
      `${key}: expected ${expected[key]}, received ${actual[key]}`,
    );
  }
}
```

Add this test group before the existing `facet buffers` group:

```js
describe('three-facet rail resampling', () => {
  const metrics = {
    stageWidth: 300,
    stageHeight: 300,
    displayWidth: 300,
    displayHeight: 300,
    offsetX: 0,
    offsetY: 0,
  };

  it('preserves endpoints and samples interior anchors by display-space length', () => {
    const rail = [
      { x: 0, y: 0, z: 0, u: 0, v: 1 },
      { x: 0.1, y: 0, z: 1, u: 0.1, v: 0.9 },
      { x: 0.4, y: 0, z: 2, u: 0.4, v: 0.6 },
      { x: 0.9, y: 0, z: 3, u: 0.9, v: 0.1 },
      { x: 1, y: 0, z: 4, u: 1, v: 0 },
    ];

    const anchors = resampleRailToAnchors(rail, metrics);

    assert.equal(anchors.length, 4);
    assert.deepEqual(anchors[0], rail[0]);
    assert.deepEqual(anchors[3], rail[4]);
    assertPointClose(anchors[1], {
      x: 1 / 3,
      y: 0,
      z: 1 + (7 / 9),
      u: 1 / 3,
      v: 2 / 3,
    });
    assertPointClose(anchors[2], {
      x: 2 / 3,
      y: 0,
      z: 2 + (8 / 15),
      u: 2 / 3,
      v: 1 / 3,
    });
  });

  it('uses finite index interpolation for a zero-length display rail', () => {
    const rail = Array.from({ length: 5 }, (_, index) => ({
      x: 0.5,
      y: 0.5,
      z: index,
      u: index * 0.1,
      v: 1 - index * 0.1,
    }));

    const anchors = resampleRailToAnchors(rail, metrics);

    assert.equal(anchors.length, 4);
    assertPointClose(anchors[1], {
      x: 0.5,
      y: 0.5,
      z: 4 / 3,
      u: 2 / 15,
      v: 13 / 15,
    });
    assertPointClose(anchors[2], {
      x: 0.5,
      y: 0.5,
      z: 8 / 3,
      u: 4 / 15,
      v: 11 / 15,
    });
  });
});
```

Replace the first facet-buffer test with:

```js
it('creates three connected quads with consistent vertex and UV ordering', () => {
  const aRail = railFixture({ x: 0.3, u: 0.1 });
  const bRail = railFixture({ x: 0.7, u: 0.6 });
  const facets = buildFacetBuffers(bufferState(aRail, bRail), metrics, camera);

  assert.equal(facets.length, 3);
  assert.equal(facets[0].positions.length, 18);
  assert.equal(facets[0].uvs.length, 12);
  assert.deepEqual(facets[0].uvs.map((value) => Number(value.toFixed(6))), [
    0.1, 0.75,
    0.6, 0.75,
    0.613333, 0.616667,
    0.1, 0.75,
    0.613333, 0.616667,
    0.113333, 0.616667,
  ]);
  assert.deepEqual(
    facets[0].positions.slice(6, 9),
    facets[1].positions.slice(3, 6),
  );
  assert.deepEqual(
    facets[0].positions.slice(15, 18),
    facets[1].positions.slice(0, 3),
  );
});
```

In the activation test, add `assert.equal(pinchedFacets.length, 3);` before measuring areas.

- [ ] **Step 2: Run the geometry test and verify the new contract fails**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
```

Expected: FAIL because `resampleRailToAnchors` is not exported and the current buffer builder returns four facets.

- [ ] **Step 3: Implement display-space rail resampling and three-facet buffers**

Add these helpers after `coverMetrics` and before `projectedWorldPoint`:

```js
const RENDER_ANCHOR_COUNT = 4;
const MIN_RAIL_LENGTH = 1e-6;

function interpolateRailPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    u: a.u + (b.u - a.u) * t,
    v: a.v + (b.v - a.v) * t,
  };
}

function sampleRailByIndex(rail, sourcePosition) {
  const startIndex = Math.min(
    rail.length - 1,
    Math.max(0, Math.floor(sourcePosition)),
  );
  const endIndex = Math.min(rail.length - 1, startIndex + 1);
  return interpolateRailPoint(
    rail[startIndex],
    rail[endIndex],
    sourcePosition - startIndex,
  );
}

export function resampleRailToAnchors(rail, metrics) {
  if (
    !Array.isArray(rail)
    || rail.length < 2
    || !metrics
    || metrics.displayWidth <= 0
    || metrics.displayHeight <= 0
  ) {
    return [];
  }

  const cumulative = [0];
  for (let index = 1; index < rail.length; index += 1) {
    const dx = (rail[index].x - rail[index - 1].x) * metrics.displayWidth;
    const dy = (rail[index].y - rail[index - 1].y) * metrics.displayHeight;
    cumulative.push(cumulative[index - 1] + Math.hypot(dx, dy));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= MIN_RAIL_LENGTH) {
    return Array.from({ length: RENDER_ANCHOR_COUNT }, (_, anchorIndex) => {
      const sourcePosition = (
        anchorIndex * (rail.length - 1) / (RENDER_ANCHOR_COUNT - 1)
      );
      return sampleRailByIndex(rail, sourcePosition);
    });
  }

  return Array.from({ length: RENDER_ANCHOR_COUNT }, (_, anchorIndex) => {
    if (anchorIndex === 0) return { ...rail[0] };
    if (anchorIndex === RENDER_ANCHOR_COUNT - 1) {
      return { ...rail[rail.length - 1] };
    }

    const targetLength = totalLength * anchorIndex / (RENDER_ANCHOR_COUNT - 1);
    let segmentIndex = 0;
    while (
      segmentIndex < cumulative.length - 2
      && cumulative[segmentIndex + 1] < targetLength
    ) {
      segmentIndex += 1;
    }
    const segmentLength = cumulative[segmentIndex + 1] - cumulative[segmentIndex];
    const localT = (targetLength - cumulative[segmentIndex])
      / Math.max(MIN_RAIL_LENGTH, segmentLength);
    return interpolateRailPoint(
      rail[segmentIndex],
      rail[segmentIndex + 1],
      localT,
    );
  });
}
```

Replace `buildFacetBuffers` with:

```js
export function buildFacetBuffers(state, metrics, camera) {
  const aRail = state?.pair?.a?.rail;
  const bRail = state?.pair?.b?.rail;
  if (!metrics || !camera || aRail?.length < 5 || bRail?.length < 5) return [];

  const aAnchors = resampleRailToAnchors(aRail, metrics);
  const bAnchors = resampleRailToAnchors(bRail, metrics);
  if (aAnchors.length !== 4 || bAnchors.length !== 4) return [];

  const triangleOrder = [0, 1, 2, 0, 2, 3];
  return Array.from({ length: 3 }, (_, index) => {
    const corners = [
      aAnchors[index],
      bAnchors[index],
      bAnchors[index + 1],
      aAnchors[index + 1],
    ];
    const positions = [];
    const uvs = [];
    triangleOrder.forEach((cornerIndex) => {
      const point = corners[cornerIndex];
      const world = projectedWorldPoint(point, metrics, camera);
      positions.push(world.x, world.y, world.z);
      uvs.push(point.u, point.v);
    });
    return { positions, uvs };
  });
}
```

- [ ] **Step 4: Run the geometry test and verify it passes**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
```

Expected: all geometry tests PASS, including exactly three facet buffers and unchanged projection, activation, fan scaling, damping, and tracking-loss behavior.

- [ ] **Step 5: Commit the geometry change**

```bash
git add components/WindowMode/facetedWindowGeometry.mjs components/WindowMode/facetedWindowGeometry.test.mjs
git commit -m "feat: render three fingertip facets"
```

---

### Task 2: Add Pure Motion-Energy Helpers

**Files:**
- Modify: `components/WindowMode/facetedWindowGeometry.mjs:128-150,276-323`
- Test: `components/WindowMode/facetedWindowGeometry.test.mjs:4-12,319-380`

**Interfaces:**
- Consumes: previous and current render anchors, `coverMetrics(...)`, elapsed seconds, and the existing `damp(...)` helper.
- Produces: `normalizedAnchorSpeed(previous, next, metrics, deltaSeconds) -> number`, `motionTargetForSpeed(speed) -> number`, and `dampMotionEnergy(current, target, deltaSeconds, options?) -> number`.

- [ ] **Step 1: Write failing motion-energy tests**

Replace the geometry import with:

```js
import {
  FINGERTIP_INDICES,
  assignHandPair,
  buildFacetBuffers,
  coverMetrics,
  dampMotionEnergy,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  motionTargetForSpeed,
  normalizedAnchorSpeed,
  resampleRailToAnchors,
  updateFacetedWindowState,
} from './facetedWindowGeometry.mjs';
```

Then add:

```js
describe('motion energy', () => {
  const metrics = {
    stageWidth: 300,
    stageHeight: 400,
    displayWidth: 600,
    displayHeight: 400,
    offsetX: -150,
    offsetY: 0,
  };

  function motionAnchors(x) {
    return Array.from({ length: 8 }, (_, index) => ({
      x,
      y: index / 10,
      z: 0,
      u: x,
      v: 1 - index / 10,
    }));
  }

  it('normalizes average anchor displacement by stage diagonal and time', () => {
    const speed = normalizedAnchorSpeed(
      motionAnchors(0.2),
      motionAnchors(0.3),
      metrics,
      0.5,
    );
    assert.ok(Math.abs(speed - 0.24) < 1e-9);
  });

  it('maps the approved speed range into zero-to-one motion', () => {
    assert.equal(motionTargetForSpeed(0.03), 0);
    assert.equal(motionTargetForSpeed(0.45), 1);
    assert.ok(motionTargetForSpeed(0.2) > 0);
    assert.ok(motionTargetForSpeed(0.2) < 1);
  });

  it('attacks faster than it releases and decays toward zero', () => {
    const attacked = dampMotionEnergy(0, 1, 0.1);
    const released = dampMotionEnergy(1, 0, 0.1);
    const decayed = dampMotionEnergy(released, 0, 0.5);

    assert.ok(attacked > 1 - released);
    assert.ok(decayed < released);
    assert.ok(decayed >= 0 && decayed <= 1);
  });

  it('returns zero for missing anchors or invalid elapsed time', () => {
    assert.equal(normalizedAnchorSpeed(null, motionAnchors(0.3), metrics, 0.5), 0);
    assert.equal(normalizedAnchorSpeed(motionAnchors(0.2), [], metrics, 0.5), 0);
    assert.equal(normalizedAnchorSpeed(
      motionAnchors(0.2),
      motionAnchors(0.3),
      metrics,
      0,
    ), 0);
  });
});
```

- [ ] **Step 2: Run the geometry test and verify the imports fail**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
```

Expected: FAIL because the three motion helpers are not exported.

- [ ] **Step 3: Implement normalized speed and asymmetric damping**

Add after `damp(...)`:

```js
export function normalizedAnchorSpeed(
  previousAnchors,
  nextAnchors,
  metrics,
  deltaSeconds,
) {
  if (
    !Array.isArray(previousAnchors)
    || !Array.isArray(nextAnchors)
    || previousAnchors.length === 0
    || previousAnchors.length !== nextAnchors.length
    || !metrics
    || metrics.stageWidth <= 0
    || metrics.stageHeight <= 0
    || metrics.displayWidth <= 0
    || metrics.displayHeight <= 0
    || !Number.isFinite(deltaSeconds)
    || deltaSeconds <= 0
  ) {
    return 0;
  }

  const averagePixels = previousAnchors.reduce((total, point, index) => {
    const next = nextAnchors[index];
    return total + Math.hypot(
      (next.x - point.x) * metrics.displayWidth,
      (next.y - point.y) * metrics.displayHeight,
    );
  }, 0) / previousAnchors.length;
  const stageDiagonal = Math.hypot(metrics.stageWidth, metrics.stageHeight);
  return averagePixels / Math.max(1, stageDiagonal) / deltaSeconds;
}

export function motionTargetForSpeed(speed) {
  return smoothstep(0.03, 0.45, Number.isFinite(speed) ? speed : 0);
}

export function dampMotionEnergy(
  current,
  target,
  deltaSeconds,
  optionsArg = {},
) {
  const options = {
    attackLambda: 14,
    releaseLambda: 5,
    ...optionsArg,
  };
  const safeCurrent = clamp(Number.isFinite(current) ? current : 0);
  const safeTarget = clamp(Number.isFinite(target) ? target : 0);
  const lambda = safeTarget > safeCurrent
    ? options.attackLambda
    : options.releaseLambda;
  return clamp(damp(safeCurrent, safeTarget, lambda, deltaSeconds));
}
```

- [ ] **Step 4: Run the geometry tests**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs
```

Expected: all geometry and motion tests PASS.

- [ ] **Step 5: Commit the motion helpers**

```bash
git add components/WindowMode/facetedWindowGeometry.mjs components/WindowMode/facetedWindowGeometry.test.mjs
git commit -m "feat: derive window motion energy"
```

---

### Task 3: Integrate Three Meshes, Motion Uniforms, and Pearl Seams

**Files:**
- Modify: `components/WindowMode/FacetedWindow.tsx:8-58,111-380`
- Test: `components/WindowMode/facetedWindowShaders.test.mjs:9-58`

**Interfaces:**
- Consumes: `resampleRailToAnchors`, `normalizedAnchorSpeed`, `motionTargetForSpeed`, and `dampMotionEnergy` from Task 2.
- Produces: three stable renderer modes `[0, 1, 2]`, shared `uMotion: number`, pearl seams, and motion history that clears on disable or tracking reset.

- [ ] **Step 1: Write the failing renderer-contract test**

Add this test group to `facetedWindowShaders.test.mjs`:

```js
describe('three-facet renderer contract', () => {
  it('creates three stable meshes with one shared motion uniform', () => {
    assert.match(componentSource, /const FACET_MODES = \[0, 1, 2\] as const/);
    assert.doesNotMatch(componentSource, /\[0, 1, 2, 3\] as const/);
    assert.match(componentSource, /uMotion: \{ value: number \}/);
    assert.match(componentSource, /uMotion: \{ value: 0 \}/);
    assert.match(componentSource, /material\.uniforms\.uMotion\.value = motionEnergyRef\.current/);
  });

  it('uses the pure motion helpers and expires stale motion samples', () => {
    assert.match(componentSource, /resampleRailToAnchors/);
    assert.match(componentSource, /normalizedAnchorSpeed/);
    assert.match(componentSource, /motionTargetForSpeed/);
    assert.match(componentSource, /dampMotionEnergy/);
    assert.match(componentSource, /sampleAgeMs > 100/);
    assert.match(componentSource, /useFrame\(\(frameState, deltaSeconds\) =>/);
  });

  it('uses the approved pearl seam and retains one video texture', () => {
    assert.match(componentSource, /const PEARL_SEAM = '#EAF5FF'/);
    assert.doesNotMatch(componentSource, /BLUSH|#F8BCB2/);
    assert.equal((componentSource.match(/new THREE\.VideoTexture/g) ?? []).length, 1);
  });
});
```

- [ ] **Step 2: Run the renderer/shader contract test and verify it fails**

Run:

```bash
node --test components/WindowMode/facetedWindowShaders.test.mjs
```

Expected: FAIL because the component still exposes four modes, no `uMotion`, and the blush seam.

- [ ] **Step 3: Add the renderer imports, constants, uniform, and motion refs**

Extend the geometry import to include:

```ts
import {
  buildFacetBuffers,
  coverMetrics,
  dampMotionEnergy,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  motionTargetForSpeed,
  normalizedAnchorSpeed,
  resampleRailToAnchors,
  updateFacetedWindowState,
} from './facetedWindowGeometry.mjs';
```

Replace the mode and seam constants, and extend the uniform type and factory:

```ts
const FACET_MODES = [0, 1, 2] as const;
const PEARL_SEAM = '#EAF5FF';

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
```

Add these refs beside the existing renderer refs:

```ts
const motionEnergyRef = useRef(0);
const motionTargetRef = useRef(0);
const previousMotionAnchorsRef = useRef<RenderAnchor[] | null>(null);
const lastMotionSampleMsRef = useRef<number | null>(null);
```

Change the seam material creation to `color: PEARL_SEAM`.

- [ ] **Step 4: Sample landmark motion and publish a decaying uniform**

Change the frame callback signature:

```ts
useFrame((frameState, deltaSeconds) => {
```

In the existing `!enabled` reset branch, add before returning:

```ts
motionEnergyRef.current = 0;
motionTargetRef.current = 0;
previousMotionAnchorsRef.current = null;
lastMotionSampleMsRef.current = null;
```

After `metricsRef.current` has been updated and before `buildFacetBuffers(...)`, add:

```ts
const motionMetrics = metricsRef.current;
if (
  resultChanged
  && handInputs.length >= 2
  && facetedState.pair
  && motionMetrics
) {
  const currentAnchors = [
    ...resampleRailToAnchors(facetedState.pair.a.rail, motionMetrics),
    ...resampleRailToAnchors(facetedState.pair.b.rail, motionMetrics),
  ] as RenderAnchor[];
  const previousAnchors = previousMotionAnchorsRef.current;
  const previousTimestamp = lastMotionSampleMsRef.current;
  if (previousAnchors && previousTimestamp !== null) {
    const speed = normalizedAnchorSpeed(
      previousAnchors,
      currentAnchors,
      motionMetrics,
      Math.max(0, elapsedMilliseconds - previousTimestamp) / 1000,
    );
    motionTargetRef.current = motionTargetForSpeed(speed);
  } else {
    motionTargetRef.current = 0;
  }
  previousMotionAnchorsRef.current = currentAnchors;
  lastMotionSampleMsRef.current = elapsedMilliseconds;
} else if (resultChanged) {
  motionTargetRef.current = 0;
  previousMotionAnchorsRef.current = null;
  lastMotionSampleMsRef.current = null;
} else if (dimensionsChanged && facetedState.pair && motionMetrics) {
  previousMotionAnchorsRef.current = [
    ...resampleRailToAnchors(facetedState.pair.a.rail, motionMetrics),
    ...resampleRailToAnchors(facetedState.pair.b.rail, motionMetrics),
  ] as RenderAnchor[];
  motionTargetRef.current = 0;
  lastMotionSampleMsRef.current = elapsedMilliseconds;
}

const sampleAgeMs = lastMotionSampleMsRef.current === null
  ? Number.POSITIVE_INFINITY
  : elapsedMilliseconds - lastMotionSampleMsRef.current;
if (sampleAgeMs > 100) motionTargetRef.current = 0;
motionEnergyRef.current = dampMotionEnergy(
  motionEnergyRef.current,
  motionTargetRef.current,
  deltaSeconds,
);
```

In the material update loop add:

```ts
material.uniforms.uMotion.value = motionEnergyRef.current;
```

Change seam opacity to:

```ts
if (seamMaterial) seamMaterial.opacity = renderOpacity * 0.55;
```

- [ ] **Step 5: Run focused tests and TypeScript**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs components/WindowMode/facetedWindowShaders.test.mjs
npx tsc --noEmit --incremental false
```

Expected: both test files PASS and TypeScript exits with code `0`.

- [ ] **Step 6: Commit the renderer integration**

```bash
git add components/WindowMode/FacetedWindow.tsx components/WindowMode/facetedWindowShaders.test.mjs
git commit -m "feat: drive window facets with hand motion"
```

---

### Task 4: Replace the Four Filters With Cryogenic Pearl Shaders

**Files:**
- Modify: `components/WindowMode/facetedWindowShaders.ts:18-160`
- Test: `components/WindowMode/facetedWindowShaders.test.mjs:14-58`

**Interfaces:**
- Consumes: existing `uVideo`, `uOpacity`, `uMode`, `uTime`, and `uViewport`, plus `uMotion` from Task 3 and existing vertex varyings.
- Produces: mode `0` frosted diffusion, mode `1` liquid mercury, and mode `2` interference membrane; one sampler and one shared optical foundation.

- [ ] **Step 1: Replace the old shader assertions with failing Cryogenic Pearl assertions**

Replace the existing `faceted window print shaders` group with:

```js
describe('Cryogenic Pearl shaders', () => {
  it('declares the approved palette and shared optical signals', () => {
    assert.match(shaderSource, /uniform float uMotion/);
    assert.match(shaderSource, /const vec3 OPTICAL_INK/);
    assert.match(shaderSource, /const vec3 ICE_WHITE/);
    assert.match(shaderSource, /const vec3 COOL_SILVER/);
    assert.match(shaderSource, /const vec3 PEARL/);
    assert.match(shaderSource, /const vec3 CYAN_INTERFERENCE/);
    assert.match(shaderSource, /const vec3 VIOLET_INTERFERENCE/);
    assert.match(shaderSource, /vec2 causticVector/);
    assert.match(shaderSource, /float grazing/);
  });

  it('implements exactly three phases of one material', () => {
    assert.match(shaderSource, /mode 0: frosted diffusion/);
    assert.match(shaderSource, /mode 1: liquid mercury/);
    assert.match(shaderSource, /mode 2: interference membrane/);
    assert.doesNotMatch(shaderSource, /mode 3:/);
    assert.doesNotMatch(shaderSource, /POLKA|INDIGO|BRICK|COOL_PAPER/);
    assert.doesNotMatch(shaderSource, /cyanotype|stipple|polka/i);
  });

  it('uses one clamped camera sampler pipeline', () => {
    assert.equal((shaderSource.match(/uniform sampler2D/g) ?? []).length, 1);
    assert.match(shaderSource, /vec2 safeUv/);
    assert.match(shaderSource, /1\.0 \/ max\(uViewport, vec2\(1\.0\)\)/);
    assert.match(shaderSource, /gl_FragColor = vec4\(color, uOpacity\)/);
    assert.match(componentSource, /\n\s+depthWrite\n/);
  });

  it('keeps the removed ASCII pipeline absent', () => {
    assert.doesNotMatch(shaderSource, /uAscii|ASCII|Ascii|ascii/);
    assert.doesNotMatch(componentSource, /uAscii|ASCII|Ascii|ascii/);
    assert.equal(
      existsSync(new URL('./facetedWindowVisuals.mjs', import.meta.url)),
      false,
    );
    assert.equal(
      existsSync(new URL('./facetedWindowVisuals.test.mjs', import.meta.url)),
      false,
    );
  });
});
```

- [ ] **Step 2: Run the shader test and verify the old treatments fail the contract**

Run:

```bash
node --test components/WindowMode/facetedWindowShaders.test.mjs
```

Expected: FAIL because the current shader still contains polka, cyanotype, liquid chrome, and brick stipple branches and has no `uMotion`.

- [ ] **Step 3: Replace the fragment shader with the three-phase optical pipeline**

Keep `FACET_VERTEX_SHADER` unchanged. Replace `FACET_FRAGMENT_SHADER` with:

```ts
export const FACET_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D uVideo;
  uniform float uOpacity;
  uniform float uMode;
  uniform float uTime;
  uniform float uMotion;
  uniform vec2 uViewport;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  const vec3 OPTICAL_INK = vec3(0.03137255, 0.05098039, 0.07450980);
  const vec3 ICE_WHITE = vec3(0.93725490, 0.98823529, 1.00000000);
  const vec3 COOL_SILVER = vec3(0.70588235, 0.77647059, 0.83137255);
  const vec3 PEARL = vec3(0.92549020, 0.91372549, 1.00000000);
  const vec3 CYAN_INTERFERENCE = vec3(0.44313725, 0.94509804, 0.95294118);
  const vec3 VIOLET_INTERFERENCE = vec3(0.50196078, 0.43137255, 1.00000000);

  float facetLuminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
  }

  vec2 safeUv(vec2 uv) {
    return clamp(uv, vec2(0.001), vec2(0.999));
  }

  float sampleLuma(vec2 uv) {
    return facetLuminance(texture2D(uVideo, safeUv(uv)).rgb);
  }

  vec2 causticVector(vec2 uv, float energy, float grazing) {
    float phase = uTime * 0.18;
    vec2 wave = vec2(
      sin(uv.y * 21.0 + phase * 1.7 + sin(uv.x * 8.0 + phase)),
      cos(uv.x * 18.0 - phase * 1.4 + sin(uv.y * 9.0 - phase))
    );
    vec2 pixel = 1.0 / max(uViewport, vec2(1.0));
    return wave * pixel * (0.85 + energy * 2.6 + grazing * 1.35);
  }

  void main() {
    if (uOpacity <= 0.001) discard;

    vec2 sourceUv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 pixel = 1.0 / max(uViewport, vec2(1.0));
    vec3 faceNormal = normalize(gl_FrontFacing ? vNormal : -vNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float facing = clamp(abs(dot(faceNormal, viewDirection)), 0.0, 1.0);
    float grazing = 1.0 - facing;
    float energy = clamp(uMotion, 0.0, 1.0);
    vec2 caustic = causticVector(sourceUv, energy, grazing);
    vec2 opticalUv = safeUv(sourceUv + caustic);
    vec3 centerColor = texture2D(uVideo, opticalUv).rgb;
    float luma = facetLuminance(centerColor);
    float leftLuma = sampleLuma(opticalUv - vec2(pixel.x * 1.5, 0.0));
    float rightLuma = sampleLuma(opticalUv + vec2(pixel.x * 1.5, 0.0));
    float downLuma = sampleLuma(opticalUv - vec2(0.0, pixel.y * 1.5));
    float upLuma = sampleLuma(opticalUv + vec2(0.0, pixel.y * 1.5));
    vec2 gradient = vec2(rightLuma - leftLuma, upLuma - downLuma);
    float edge = clamp(length(gradient) * 4.4, 0.0, 1.0);
    vec3 color;

    if (uMode < 0.5) {
      // mode 0: frosted diffusion
      float blurPixels = mix(0.8, 2.9, energy) * (1.0 + grazing * 0.55);
      vec2 blurStep = pixel * blurPixels;
      vec3 frostSample = (
        centerColor * 2.0
        + texture2D(uVideo, safeUv(opticalUv + vec2(blurStep.x, 0.0))).rgb
        + texture2D(uVideo, safeUv(opticalUv - vec2(blurStep.x, 0.0))).rgb
        + texture2D(uVideo, safeUv(opticalUv + vec2(0.0, blurStep.y))).rgb
        + texture2D(uVideo, safeUv(opticalUv - vec2(0.0, blurStep.y))).rgb
      ) / 6.0;
      float frostLuma = facetLuminance(frostSample);
      vec3 frost = mix(
        OPTICAL_INK,
        ICE_WHITE,
        smoothstep(0.04, 0.94, frostLuma)
      );
      frost = mix(
        frost,
        COOL_SILVER,
        (1.0 - smoothstep(0.22, 0.82, frostLuma)) * 0.34
      );
      float ridgeWave = sin(
        (sourceUv.x + sourceUv.y * 0.62) * 15.0 - uTime * 0.42
      );
      float ridge = pow(max(0.0, 1.0 - abs(ridgeWave)), 6.0);
      color = mix(frost, PEARL, ridge * (0.12 + grazing * 0.12));
    } else if (uMode < 1.5) {
      // mode 1: liquid mercury
      float reflectionBand = 0.5 + 0.5 * cos(
        (luma * 1.35 + opticalUv.y * 0.20 + caustic.y * uViewport.y * 0.014)
          * 19.0
      );
      reflectionBand = pow(reflectionBand, 1.75);
      vec3 mercury = mix(
        OPTICAL_INK,
        COOL_SILVER,
        smoothstep(0.04, 0.72, luma)
      );
      mercury = mix(
        mercury,
        ICE_WHITE,
        reflectionBand * (0.54 + grazing * 0.25)
      );
      mercury = mix(mercury, PEARL, edge * 0.20);
      float sweepPosition = fract(
        uTime * (0.045 + energy * 0.025) + grazing * 0.22
      ) * 1.55 - 0.25;
      float sweepCoordinate = opticalUv.x + opticalUv.y * 0.33
        + caustic.x * uViewport.x * 0.035 * (1.0 + energy);
      float specularSweep = 1.0 - smoothstep(
        0.035,
        0.11,
        abs(sweepCoordinate - sweepPosition)
      );
      color = mix(mercury, ICE_WHITE, specularSweep * (0.48 + grazing * 0.28));
    } else {
      // mode 2: interference membrane
      float separationPixels = mix(
        0.55,
        2.5,
        clamp(energy * 0.62 + grazing * 0.60, 0.0, 1.0)
      );
      vec2 gradientDirection = normalize(gradient + vec2(0.0001, 0.0));
      vec2 separation = gradientDirection * pixel * separationPixels;
      float positiveLuma = sampleLuma(opticalUv + separation);
      float negativeLuma = sampleLuma(opticalUv - separation);
      vec3 membrane = mix(
        OPTICAL_INK,
        PEARL,
        smoothstep(0.04, 0.90, luma)
      );
      membrane = mix(
        membrane,
        COOL_SILVER,
        (1.0 - smoothstep(0.28, 0.82, luma)) * 0.30
      );
      float cyanMask = clamp(
        max(positiveLuma - luma, 0.0) * 5.0
          + edge * (0.08 + energy * 0.30),
        0.0,
        0.72
      );
      float violetMask = clamp(
        max(negativeLuma - luma, 0.0) * 5.0
          + edge * grazing * 0.26,
        0.0,
        0.68
      );
      membrane = mix(membrane, CYAN_INTERFERENCE, cyanMask);
      membrane = mix(membrane, VIOLET_INTERFERENCE, violetMask);
      float film = 0.5 + 0.5 * sin(
        (sourceUv.x * 0.8 + sourceUv.y) * 18.0 + uTime * 0.30
      );
      color = mix(membrane, PEARL, film * 0.08);
    }

    vec3 lightDirection = normalize(vec3(-0.45, 0.58, 0.68));
    float faceLight = 0.88 + 0.12 * max(dot(faceNormal, lightDirection), 0.0);
    float depthLift = clamp(vWorldPosition.z * 0.015, -0.012, 0.012);
    color = max(OPTICAL_INK, color * (faceLight + depthLift));
    gl_FragColor = vec4(color, uOpacity);
  }
`;
```

- [ ] **Step 4: Run shader, geometry, and type checks**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs components/WindowMode/facetedWindowShaders.test.mjs
npx tsc --noEmit --incremental false
```

Expected: all focused tests PASS and TypeScript exits with code `0`.

- [ ] **Step 5: Run lint on the modified runtime files**

Run:

```bash
npx eslint components/WindowMode/FacetedWindow.tsx components/WindowMode/facetedWindowShaders.ts
```

Expected: ESLint exits with code `0` and reports no new warnings.

- [ ] **Step 6: Commit the Cryogenic Pearl shader**

```bash
git add components/WindowMode/facetedWindowShaders.ts components/WindowMode/facetedWindowShaders.test.mjs
git commit -m "feat: add Cryogenic Pearl window filters"
```

---

### Task 5: Full Regression and Live-Camera Verification

**Files:**
- Verify: `components/WindowMode/facetedWindowGeometry.mjs`
- Verify: `components/WindowMode/FacetedWindow.tsx`
- Verify: `components/WindowMode/facetedWindowShaders.ts`
- Verify: `app/reels/window/page.tsx`
- Verify: `app/reels/_components/ReelsWindowClient.tsx`

**Interfaces:**
- Consumes: the complete three-facet geometry, motion, renderer, and shader implementation from Tasks 1-4.
- Produces: evidence that automated regressions pass, the route shell remains intact, and the real permissioned camera interaction either passes or is explicitly reported as unverified.

- [ ] **Step 1: Run the focused window suite**

Run:

```bash
node --test components/WindowMode/facetedWindowGeometry.test.mjs components/WindowMode/facetedWindowShaders.test.mjs app/reels/_components/ReelsWindowLayout.test.mjs
```

Expected: every test passes; the layout test continues to prove `11 / 16` only for `/reels/window`.

- [ ] **Step 2: Run full static verification**

Run:

```bash
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

Expected: all four commands exit with code `0`. If `next build` fails only because the sandbox cannot fetch Google Fonts, rerun the same build with network permission and record that distinction.

- [ ] **Step 3: Verify the non-camera route shell in a browser**

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000/reels/window` at desktop and mobile widths and verify:

- one tall Mac-style window titled `camera`
- no additional moodboard or hidden secondary surface
- the stage remains `11 / 16`
- the enable-camera or honest camera-error state remains visible when permission is unavailable
- no React, shader compilation, WebGL, texture, or cleanup errors in the console

Expected: the shell and honest error/permission states render without console errors.

- [ ] **Step 4: Exercise the permissioned live-camera path with real hands**

With camera permission granted on `/reels/window`, verify in order:

1. Open hands alone do not arm the object.
2. Two tight pinches arm exactly three connected facets.
3. One pinched and one open hand creates the existing tapered fan using three broad facets.
4. Both open hands retain the existing enlarged fan response.
5. Slow movement produces restrained frost, mercury, and membrane changes.
6. Fast movement visibly increases diffusion, bends the mercury sweep, and increases cyan-violet separation.
7. Stopping movement returns the surface to a calm state while slow caustics remain.
8. Rotating the hands changes the specular and refractive response with facet angle.
9. The face and hands remain recognizable through all three phases.
10. The palette stays icy silver, pearl, cyan, and violet without becoming a full rainbow.
11. Brief tracking loss holds and fades; sustained loss resets and requires the two-pinch activation again.
12. The console remains free of shader, WebGL, camera, and cleanup errors.

Expected: all twelve observations pass. If the environment cannot grant camera permission or show real hands, report the permissioned interaction as unverified; do not substitute shell checks or synthetic landmarks for this gate.

- [ ] **Step 5: Confirm repository state and implementation commits**

Run:

```bash
git status --short --branch
git log -5 --oneline
```

Expected: only intentional implementation changes are present, the plan/spec remain committed, and Tasks 1-4 each have their scoped commit. Do not create a verification-only commit. If verification reveals a defect, return to the responsible task, add a failing regression test, fix it, rerun that task's checks, and commit the fix with the affected files only.
