# Flat-Grid Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third held gesture to the `/loop` Image Universe — two open hands with one palm and one back toward the camera lays every image into an even, camera-facing gallery-wall grid.

**Architecture:** Introduce one new independent "flatness" axis (`uFlat` uniform driven by a `flatTargetRef`) parallel to the existing globe↔helix `uShape` axis. Flat is a positional-only morph reusing the existing camera-facing (billboard) orientation, so globe/helix code is untouched. A pure grid-layout helper computes per-image cell centers; the vertex shader blends the grid target over the globe/helix result; the gesture state machine adds a `flat` state entered from `natural`.

**Tech Stack:** Next.js 16, React 19, Three.js 0.181 (raw WebGL, GLSL shaders), TypeScript, MediaPipe tasks-vision (hand landmarks), `node --test` for pure-logic unit tests.

## Global Constraints

- **Do not alter globe or helix** behavior, geometry, triggers, or the `uShape` axis. Flat is purely additive.
- **No spin on the flat grid** — it must stay still and readable (globe/helix spin; flat does not).
- **Instanced-planes mode only** (`USE_INSTANCED_PLANES = true`). Points mode stays scatter-only, exactly as it is for globe/helix today.
- **All gesture thresholds are empirical** — calibrated by eye, tuned per person/lighting.
- **Do NOT auto-commit.** This repo (`naethun/portfolio`) is committed by the user. Each task ends at a verified checkpoint; leave changes in the working tree for the user to review and commit.
- Pure-logic helpers are plain ESM `.mjs` with JSDoc types (matches the existing `scripts/lib/*.mjs` + `node --test` pattern); `tsconfig` `allowJs: true` + bundler resolution imports them typed into `.tsx`.

---

### Task 1: Pure flat-grid layout helper

Computes per-image grid-cell centers, centered on the world XY plane at `z = 0`. This is the one piece with real off-by-one/centering risk, so it is unit-tested in isolation.

**Files:**
- Create: `components/ImageUniverse/flatGrid.mjs`
- Test: `components/ImageUniverse/flatGrid.test.mjs`
- Modify: `package.json` (add a `universe:test` script)

**Interfaces:**
- Consumes: nothing.
- Produces: `computeFlatGrid(count: number, opts?: { columns?: number, spacingX?: number, spacingY?: number }): Float32Array` — length `count * 3`, `[x, y, z]` per image in instance order (left→right, top→bottom). `columns <= 0` or omitted → auto `ceil(sqrt(count))`. Defaults `spacingX = spacingY = 8`. All `z = 0`.

- [ ] **Step 1: Write the failing tests**

Create `components/ImageUniverse/flatGrid.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFlatGrid } from './flatGrid.mjs';

test('returns empty for count 0', () => {
  assert.equal(computeFlatGrid(0).length, 0);
});

test('single image sits at the origin', () => {
  assert.deepEqual([...computeFlatGrid(1, { spacingX: 8, spacingY: 8 })], [0, 0, 0]);
});

test('auto columns = ceil(sqrt(count)); fills left→right, top→bottom', () => {
  // 9 images → 3 columns, 3 rows. Last cell k=8 is col 2, row 2.
  const g = computeFlatGrid(9, { spacingX: 1, spacingY: 1 });
  assert.equal(g[8 * 3], 1); // col 2 → (2 - (3-1)/2) * 1 = 1
  assert.equal(g[8 * 3 + 1], -1); // row 2 → ((3-1)/2 - 2) * 1 = -1
});

test('2x2 grid is centered and symmetric', () => {
  const g = computeFlatGrid(4, { columns: 2, spacingX: 2, spacingY: 2 });
  assert.deepEqual([...g], [
    -1, 1, 0,
    1, 1, 0,
    -1, -1, 0,
    1, -1, 0,
  ]);
});

test('a full rectangular grid is centered on the origin', () => {
  const g = computeFlatGrid(6, { columns: 3, spacingX: 5, spacingY: 5 });
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < 6; k++) {
    sx += g[k * 3];
    sy += g[k * 3 + 1];
  }
  assert.ok(Math.abs(sx) < 1e-6);
  assert.ok(Math.abs(sy) < 1e-6);
});

test('z is always 0', () => {
  const g = computeFlatGrid(7, { columns: 3 });
  for (let k = 0; k < 7; k++) assert.equal(g[k * 3 + 2], 0);
});
```

- [ ] **Step 2: Add the `universe:test` script**

In `package.json` `scripts`, add after the `shoppable:generate` line:

```json
    "universe:test": "node --test \"components/ImageUniverse/**/*.test.mjs\""
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run universe:test`
Expected: FAIL — `Cannot find module './flatGrid.mjs'` (the module does not exist yet).

- [ ] **Step 4: Write the implementation**

Create `components/ImageUniverse/flatGrid.mjs`:

```js
/**
 * Grid-cell centers for the "flat" gallery-wall formation.
 * Cells fill left→right, top→bottom and are centered on the world XY plane (z = 0).
 *
 * @param {number} count number of images
 * @param {{ columns?: number, spacingX?: number, spacingY?: number }} [opts]
 *   columns <= 0 (or omitted) → auto = ceil(sqrt(count)).
 * @returns {Float32Array} length count*3, [x, y, z] per image (instance order)
 */
export function computeFlatGrid(count, opts = {}) {
  const n = Math.max(0, count | 0);
  const out = new Float32Array(n * 3);
  if (n === 0) return out;

  const spacingX = opts.spacingX ?? 8;
  const spacingY = opts.spacingY ?? 8;
  const cols =
    opts.columns && opts.columns > 0 ? opts.columns : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;

  for (let k = 0; k < n; k++) {
    const col = k % cols;
    const row = Math.floor(k / cols);
    out[k * 3] = (col - cx) * spacingX;
    out[k * 3 + 1] = (cy - row) * spacingY;
    out[k * 3 + 2] = 0;
  }
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run universe:test`
Expected: PASS — all 6 tests green.

- [ ] **Step 6: Checkpoint**

Leave the changes uncommitted for the user to review. Do not run `git commit`.

---

### Task 2: Renderer flat axis + shader blend + keyboard `F`

Wires the flatness axis end-to-end so the grid forms via the `F` keyboard fallback (no webcam). This is independently reviewable: press `F` on `/loop` → grid forms; press again → scatter; `G`/`H` (globe/helix) still work.

**Files:**
- Modify: `components/ImageUniverse/shaders.ts` (the `PLANE_VERTEX` string)
- Modify: `components/ImageUniverse/ImageUniverse.tsx`
- Modify: `app/loop/LoopClient.tsx`

**Interfaces:**
- Consumes: `computeFlatGrid` from Task 1.
- Produces:
  - `ImageUniverse` gains prop `flatTargetRef?: React.RefObject<number>` (0 = not flat, 1 = flat grid).
  - `PLANE_VERTEX` gains `attribute vec3 iGrid;` and `uniform float uFlat;`.
  - `LoopClient` declares `const flatTargetRef = useRef(0)` and drives it via the `F` key.
  - Renderer tunables: `FLAT_SPACING_X`, `FLAT_SPACING_Y`, `FLAT_COLUMNS`, `FLAT_EASE`.

- [ ] **Step 1: Extend `PLANE_VERTEX` with the flat target**

In `components/ImageUniverse/shaders.ts`, inside the `PLANE_VERTEX` template:

Add two lines to the instance-attribute / uniform declarations. After `attribute vec2 iHelix;` add:

```glsl
  attribute vec3 iGrid;       // per-instance flat gallery-grid center (z = 0)
```

After `uniform float uShape;` add:

```glsl
  uniform float uFlat;         // 0 = globe/helix shape, 1 = flat gallery grid
```

Then replace this existing block:

```glsl
    // Blend the formed shape (globe <-> helix), then scatter <-> formed.
    vec3 formedPos = mix(globePos, helixPos, uShape);
    vec3 tangent = mix(tanG, tanH, uShape);
    vec3 bitangent = mix(bitG, bitH, uShape);
    vec3 center = mix(iPosition, formedPos, uFormation);
```

with (flat overrides globe/helix; its orientation reuses the camera billboard basis, so flat tiles always face the camera and never spin):

```glsl
    // Blend globe <-> helix, then let flat override that (grid slot, camera-facing).
    // At uFlat = 1 the tangent basis equals the camera basis, so shapeOffset ==
    // billboardOffset below and every flat tile faces the camera at any formation.
    vec3 shapePos = mix(globePos, helixPos, uShape);
    vec3 formedPos = mix(shapePos, iGrid, uFlat);
    vec3 tangent = mix(mix(tanG, tanH, uShape), uCamRight, uFlat);
    vec3 bitangent = mix(mix(bitG, bitH, uShape), uCamUp, uFlat);
    vec3 center = mix(iPosition, formedPos, uFormation);
```

- [ ] **Step 2: Add renderer tunables**

In `components/ImageUniverse/ImageUniverse.tsx`, after the helix tunables block (the `SHAPE_EASE` line), add:

```ts
/** Flat gallery-wall grid — the third formed shape (one palm + one back). */
const FLAT_SPACING_X = 8; // world-unit gap between grid columns
const FLAT_SPACING_Y = 8; // world-unit gap between grid rows
const FLAT_COLUMNS = 0; // 0 = auto (ceil(sqrt(n))); else force this many columns
const FLAT_EASE = 2.5; // scatter↔flat morph speed (matches SHAPE_EASE)
```

- [ ] **Step 3: Import the grid helper**

In `components/ImageUniverse/ImageUniverse.tsx`, after the `shaders` import block, add:

```ts
import { computeFlatGrid } from './flatGrid.mjs';
```

- [ ] **Step 4: Add the `flatTargetRef` prop and internal fallback**

In the `Props` interface, after the `shapeTargetRef?` doc+field, add:

```ts
  /**
   * Optional 0..1 target for the flat gallery-wall grid: 0 = globe/helix shape,
   * 1 = flat grid. Overrides the globe/helix shape while > 0.
   */
  flatTargetRef?: React.RefObject<number>;
```

In the component signature destructure, add `flatTargetRef` alongside `shapeTargetRef`:

```ts
  formationTargetRef,
  shapeTargetRef,
  flatTargetRef,
}: Props) {
```

After the `shapeRef` fallback lines, add:

```ts
  const flatTargetInternal = useRef(0);
  const flatRef = flatTargetRef ?? flatTargetInternal;
```

- [ ] **Step 5: Add the `uFlat` uniform and build the `iGrid` attribute**

In the uniforms section (after `const uShape = { value: 0 };`) add:

```ts
    const uFlat = { value: 0 };
```

In `createImageMesh`, inside the `if (USE_INSTANCED_PLANES) {` branch, after the `iHelix` typed array is declared (`const iHelix = new Float32Array(n * 2);`) add:

```ts
        const iGrid = computeFlatGrid(n, {
          columns: FLAT_COLUMNS,
          spacingX: FLAT_SPACING_X,
          spacingY: FLAT_SPACING_Y,
        });
```

After the existing `geo.setAttribute('iHelix', ...)` line add:

```ts
        geo.setAttribute('iGrid', new THREE.InstancedBufferAttribute(iGrid, 3));
```

In the same branch's `ShaderMaterial` `uniforms` object, add `uFlat` next to `uShape`:

```ts
            uShape,
            uFlat,
```

- [ ] **Step 6: Ease `uFlat` toward its target each frame**

In the `animate()` loop, inside `if (globeActive) {`, after the `uShape.value += ...` line add:

```ts
        const flatTarget = Math.max(0, Math.min(1, flatRef.current ?? 0));
        uFlat.value += (flatTarget - uFlat.value) * Math.min(1, dt * FLAT_EASE);
```

- [ ] **Step 7: Add `flatRef` to the effect dependency array**

Change the scene effect's dependency array from:

```ts
  }, [media, background, isEmpty, formationRef, shapeRef]);
```

to:

```ts
  }, [media, background, isEmpty, formationRef, shapeRef, flatRef]);
```

- [ ] **Step 8: Declare `flatTargetRef` in LoopClient and pass it to the renderer**

In `app/loop/LoopClient.tsx`, after `const shapeTargetRef = useRef(0);` add:

```ts
  const flatTargetRef = useRef(0);
```

In the `<ImageUniverse ... />` props, after `shapeTargetRef={shapeTargetRef}` add:

```tsx
        flatTargetRef={flatTargetRef}
```

- [ ] **Step 9: Add the `F` keyboard fallback**

In `app/loop/LoopClient.tsx`, in the keyboard-fallback effect (the one with `G`/`H`), add an `else if` branch after the `h`/`H` branch:

```ts
      } else if (e.key === 'f' || e.key === 'F') {
        // Toggle the flat grid. It needs both formation (scatter→formed) and the
        // flat override; turning it off returns to the scattered cloud.
        const on = flatTargetRef.current > 0.5;
        flatTargetRef.current = on ? 0 : 1;
        formationTargetRef.current = on ? 0 : 1;
        shapeTargetRef.current = 0;
      }
```

- [ ] **Step 10: Typecheck, lint, build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint components/ImageUniverse app/loop`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; `/` and `/loop` prerender static.

- [ ] **Step 11: Verify the flat grid forms via keyboard (headless preview)**

Start the dev server (preview tooling): start the `portfolio-dev` server, open `http://localhost:3000/loop`, and wait until the "ASSEMBLING UNIVERSE" overlay clears (poll the page until the loading text is gone).

Baseline: take a screenshot — confirm the scattered cloud.

Drive the flat grid (the handler listens on `window` and is gated to camera-off, which is the default):

```js
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
```

Wait ~1s for the ease, then screenshot.
Expected: images are arranged in an even, roughly-square grid of upright, camera-facing tiles centered in the viewport (no spin, no depth scatter).

Regression check — globe and helix still work:

```js
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' })); // back to scatter
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' })); // globe forms
```
Screenshot → sphere. Then:
```js
window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })); // globe→helix
```
Screenshot → double helix. Confirm both behave exactly as before.

- [ ] **Step 12: Checkpoint**

Leave the changes uncommitted for the user to review. Do not run `git commit`.

---

### Task 3: Flat gesture detection + state machine + guidance/debug + docs

Adds the actual hand pose (two open hands, one palm + one back → `flat`) and surfaces it in the guidance strip and debug panel. Completes the feature.

**Files:**
- Modify: `components/ImageUniverse/useUniverseGestures.ts`
- Modify: `app/loop/LoopClient.tsx`
- Modify: `docs/image-universe-handoff.md`

**Interfaces:**
- Consumes: `flatTargetRef` (declared in LoopClient, Task 2); `uFlat`/`iGrid` render path (Task 2).
- Produces:
  - `GestureState` gains `'flat'`.
  - `GestureDebug` gains `flat: number`.
  - `useUniverseGestures` `Options` gains required `flatTargetRef: RefObject<number>`.
  - Gesture tunable `FLAT_ENTER_MS`.

- [ ] **Step 1: Extend the gesture types and tunable**

In `components/ImageUniverse/useUniverseGestures.ts`:

Change the state type export:

```ts
export type GestureState = 'natural' | 'armed' | 'globe' | 'helix' | 'flat';
```

In the `GestureDebug` interface, after `open: [boolean, boolean];` add:

```ts
  /** current flat-grid target (0 = off, 1 = flat gallery grid). */
  flat: number;
```

In the tunables block, after `EXIT_GRACE_MS`, add:

```ts
// Flat gallery-wall grid: one palm + one back (mixed facing) of two open hands.
// A slightly longer enter hold than ENTER_MS so a smooth two-hand palms→backs
// flip (on the way to helix) doesn't transiently trigger flat.
const FLAT_ENTER_MS = 200;
```

- [ ] **Step 2: Add `flatTargetRef` to the hook options and lifecycle**

In the `Options` interface, after the `shapeTargetRef` field, add:

```ts
  /** 0 = globe/helix shape, 1 = flat gallery grid; set from the mixed-facing pose. */
  flatTargetRef: RefObject<number>;
```

Add `flatTargetRef` to the destructured params in `useUniverseGestures({ ... })` (after `shapeTargetRef`).

In the `if (!enabled)` early-return block, after `shapeTargetRef.current = 0;` add:

```ts
      flatTargetRef.current = 0;
```

After the `shapeTargetRef.current = 0;` that follows (the "start from scattered natural state" init), add:

```ts
    flatTargetRef.current = 0;
```

In the cleanup return, after its `shapeTargetRef.current = 0;` add:

```ts
      flatTargetRef.current = 0;
```

Add `flatTargetRef` to the effect dependency array (alongside `shapeTargetRef`):

```ts
  }, [enabled, landmarksRef, formationTargetRef, shapeTargetRef, flatTargetRef, debugRef]);
```

- [ ] **Step 3: Set all three targets in every `setState` branch**

Replace the entire `setState` function body with (each branch now also sets `flatTargetRef`):

```ts
    const setState = (s: typeof state) => {
      if (s === state) return;
      state = s;
      if (s === 'globe') {
        formationTargetRef.current = 1;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('globe');
      } else if (s === 'helix') {
        formationTargetRef.current = 1;
        shapeTargetRef.current = 1;
        flatTargetRef.current = 0;
        report('helix');
      } else if (s === 'flat') {
        // grid forms; the globe/helix mix rests at globe underneath but is fully
        // masked by uFlat = 1, so its value is cosmetic.
        formationTargetRef.current = 1;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 1;
        report('flat');
      } else if (s === 'armed') {
        // globe pull-in; formation is written continuously below from progress
        formationTargetRef.current = ARMED_FLOOR;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('armed');
      } else {
        formationTargetRef.current = 0;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('natural');
      }
    };
```

Also extend the local `state` variable's type annotation to include `'flat'`:

```ts
    let state: 'natural' | 'armed' | 'globe' | 'helix' | 'flat' = 'natural';
```

- [ ] **Step 4: Detect the mixed-facing pose and add its timestamps**

In `useUniverseGestures.ts`, add two timestamp locals next to the helix ones (`tHelix` / `tNoHelix`):

```ts
    let tFlat = -1;
    let tNoFlat = -1;
```

In `tick`, after the `bothBacks` computation, add:

```ts
      // flat trigger: two OPEN hands with mixed facing (exactly one back-facing).
      const flatPose = twoHands && open0 && open1 && dor0 !== dor1;
```

After the existing `tHelix` / `tNoHelix` assignment lines, add:

```ts
      tFlat = flatPose ? (tFlat < 0 ? now : tFlat) : -1;
      tNoFlat = !flatPose ? (tNoFlat < 0 ? now : tNoFlat) : -1;
```

- [ ] **Step 5: Wire the state transitions**

In the `state === 'natural'` branch, append a final `else if` (after the helix trigger line):

```ts
        else if (tFlat > 0 && now - tFlat >= FLAT_ENTER_MS) setState('flat');
```

After the `} else if (state === 'helix') { ... }` block, add a new branch:

```ts
      } else if (state === 'flat') {
        // held while the mixed-facing pose holds; relax / change pose to scatter
        if (tNoFlat > 0 && now - tNoFlat >= EXIT_GRACE_MS) setState('natural');
```

- [ ] **Step 6: Emit `flat` in the debug telemetry**

In the `if (debugRef) { debugRef.current = { ... } }` object, after `open: [open0, open1],` add:

```ts
          flat: flatTargetRef.current,
```

- [ ] **Step 7: Pass `flatTargetRef` to the hook and surface it in the UI**

In `app/loop/LoopClient.tsx`, in the `useUniverseGestures({ ... })` call, after `shapeTargetRef,` add:

```ts
    flatTargetRef,
```

Update `gestureHint` — add a `flat` case and mention the pose in the default:

```ts
function gestureHint(state: GestureState): string {
  switch (state) {
    case 'armed':
      return 'NOW OPEN BOTH HANDS INTO AN L →';
    case 'globe':
      return 'GLOBE · RELAX HANDS TO RELEASE';
    case 'helix':
      return 'HELIX · RELAX HANDS TO RELEASE';
    case 'flat':
      return 'FLAT · RELAX HANDS TO RELEASE';
    default:
      return 'PINCH→L = GLOBE · BOTH BACKS = HELIX · PALM+BACK = FLAT';
  }
}
```

In `GestureDebugPanel`, after the `open-hand` row, add a `flat` row:

```tsx
      {row('flat', snap ? snap.flat.toFixed(2) : '0.00')}
```

- [ ] **Step 8: Typecheck, lint, build**

Run: `npx tsc --noEmit`
Expected: no errors (notably, all `useUniverseGestures` callers now pass `flatTargetRef`).

Run: `npx eslint components/ImageUniverse app/loop`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds; `/loop` prerenders static.

- [ ] **Step 9: Re-verify the keyboard path still forms the grid (headless)**

Start/refresh the `portfolio-dev` preview at `/loop`, wait for load, then dispatch `F` as in Task 2 Step 11 and screenshot.
Expected: flat grid forms (Task 2 behavior intact); the debug panel (top-right) shows `state: flat` is reachable and a `flat` row is present.

- [ ] **Step 10: Live gesture verification (webcam — empirical, user-confirmed)**

On `/loop`, click **ENABLE HAND GESTURES**, allow the camera, wait for the hand model to load. Then, watching the debug panel:
- Show **two open hands, one palm + one back** → `backs` reads `✓ ·` (or `· ✓`), `open-hand` reads `✓ ✓`, `state` → `flat`, `flat` → `1.00`; images ease into the grid.
- Show **backs of both open hands** → `state` → `helix` (confirm a smooth two-hand flip does not linger in `flat`; if it does, raise `FLAT_ENTER_MS`).
- **Pinch → open L** → `state` → `globe` (unchanged).
- **Relax** → `state` → `natural`, cloud scatters.

This is empirical and needs on-person confirmation (same status as helix). If the palm/back read is inverted, flip `PALMAR_SIGN` (documented tunable) — it affects globe/helix/flat together.

- [ ] **Step 11: Update the handoff doc**

In `docs/image-universe-handoff.md`:

In the §3 formations table, add a row after the Helix row:

```markdown
| **Flat** | Show **two open hands, one palm + one back** (mixed facing). All images snap into an even, camera-facing gallery-wall grid (no spin). | the pose is held | change pose / lower hands → scatter |
```

In the §3 state-machine diagram, add a line under the helix branch:

```
   └──two open hands, one palm + one back (200ms)──▶ flat ──pose lost (350ms)──▶ natural
```

Add to the "Writes … refs" note that the renderer also eases toward **`flatTargetRef`** (0 = globe/helix shape, 1 = flat grid).

In the §4 gesture tunables table, add:

```markdown
| `FLAT_ENTER_MS` | `200` | sustain the mixed (palm+back) pose this long before flat engages |
```

In the §4 visual tunables table, add:

```markdown
| `FLAT_SPACING_X` / `FLAT_SPACING_Y` / `FLAT_COLUMNS` / `FLAT_EASE` | `8` / `8` / `0` (auto √n) / `2.5` | flat grid cell gaps / forced columns / morph speed |
```

In §5, note the new keyboard fallback: **`F`** toggles the flat grid on/off (camera off), mirroring `G`/`H`.

- [ ] **Step 12: Checkpoint**

Leave all changes uncommitted for the user to review and commit. Do not run `git commit`.

---

## Notes for the implementer

- **Picking is unchanged and follows scatter positions.** Clicking a specific tile while formed (globe, helix, or flat) is imprecise because `pickables` store scattered centers — this is pre-existing and out of scope. Do not attempt to "fix" it here.
- **Points mode** (`USE_INSTANCED_PLANES = false`) has no globe/helix/flat morph. The `iGrid` attribute and `uFlat` uniform live only in the instanced branch — do not add them to the Points path.
- **Grid overlap:** with varying image aspects, very wide tiles can touch at the default spacing. That is acceptable for a first pass (globe/helix overlap too); `FLAT_SPACING_X/Y` are the tuning knobs.
