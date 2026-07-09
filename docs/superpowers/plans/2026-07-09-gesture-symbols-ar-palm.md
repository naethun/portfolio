# Gesture Symbols AR Palm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D gesture-symbols poster with a camera-first AR composition where a spinning 3D symbol emerges from the user's right palm while the user's left hand selects the active symbol.

**Architecture:** Keep the existing `/reels/gesture-symbols` and `/portrait/gesture-symbols` routes and shared `components/GestureSymbols` boundary. Replace the full-frame 2D canvas experience with a visible full-frame camera video plus a transparent Three.js overlay anchored to MediaPipe right-hand landmarks; left-hand raised-finger counts drive cross/ring/square/star selection. Use pure helpers for handedness splitting, finger-count mapping, palm-anchor projection, smoothing, and tests.

**Tech Stack:** Next.js App Router, React 19, MediaPipe `@mediapipe/tasks-vision`, existing `useCameraStream` and `useHandTracking`, Three.js, `@react-three/fiber`, `@react-three/drei`, node:test, TypeScript, ESLint.

## Global Constraints

- Preserve routes: `/reels/gesture-symbols` and `/portrait/gesture-symbols`.
- Do not add this to `/loop`; do not edit `/loop` files.
- The camera becomes the full visual background once enabled; no separate small HUD camera window in this mode.
- Right hand anchors the 3D symbol. The desired gesture is right palm facing up toward the sky; v1 should still anchor when the right palm is detected, even if palm-up confidence is imperfect.
- Left hand selects symbols: closed palm / zero / one raised finger -> cross, two -> ring, three -> square, four -> star.
- The symbol spins continuously 360 degrees while anchored.
- The symbol should appear to emerge out of the right palm with upward-rising particles.
- Keep keyboard fallback: `1` cross, `2` ring, `3` square, `4` star, arrows cycle.
- Keep camera-denied and unsupported states usable via keyboard fallback.
- No new heavyweight gesture library.
- Prefer small, pure helper modules with tests over piling logic into one React component.
- Existing 2D canvas modules may remain temporarily as fallback/internal dead code if that reduces risk, but the rendered experience must be camera-first AR.

---

## Current Repo Context

Relevant existing files:

- `app/reels/gesture-symbols/page.tsx` - thin route wrapper using `ReelsModeShell`.
- `app/portrait/gesture-symbols/page.tsx` - thin route wrapper using `PortraitModeShell`.
- `components/GestureSymbols/GestureSymbolsExperience.tsx` - current top-level gesture-symbols component.
- `components/GestureSymbols/useGestureSymbolState.ts` - current single-hand symbol state, keyboard fallback, touch/swipe fallback.
- `components/GestureSymbols/gestureClassifier.ts` - pure raised-finger count and facing helpers.
- `components/GestureSymbols/types.ts` - `SymbolKind`, `SymbolState`, `SYMBOL_ORDER`.
- `components/GestureSymbols/SymbolCanvas.tsx` - current 2D text-mask renderer. This should stop being the primary rendered experience.
- `components/GestureSymbols/textField.ts` and `symbolMasks.ts` - current 2D typographic texture and mask math. Reuse ideas only if useful for particles/texturing.
- `components/HandLoop/useHandTracking.ts` - existing MediaPipe hand-tracking hook.
- `components/ImageUniverse/useCameraStream.ts` - existing camera permission/stream hook.
- `components/HandLoop/HUD.tsx` - reusable camera-window HUD. Do not use it for the final AR view because the camera itself is now the full background.

Existing dependencies already include `three`, `@react-three/fiber`, `@react-three/drei`, and `@mediapipe/tasks-vision`. Do not add a dependency unless a task proves it is necessary.

---

## File Structure

Create or modify these files:

- Modify: `components/GestureSymbols/GestureSymbolsExperience.tsx`
  - Own the camera stream, hidden tracking state, visible full-frame camera backdrop, AR overlay, enable button, and debug readout.
- Modify: `components/GestureSymbols/useGestureSymbolState.ts`
  - Either split into AR-specific state or delegate to new helpers. It should support left-hand symbol selection and right-hand anchor output.
- Create: `components/GestureSymbols/handRoles.ts`
  - Pure helpers to split MediaPipe results into user-left and user-right hands, respecting the repo's selfie/mirrored convention.
- Create: `components/GestureSymbols/palmAnchor.ts`
  - Pure helpers to compute right-palm anchor, scale, and rotation hints from landmarks.
- Create: `components/GestureSymbols/cameraProjection.ts`
  - Pure helpers to convert MediaPipe normalized video landmarks into rendered 9:16 frame coordinates and then Three orthographic world coordinates.
- Create: `components/GestureSymbols/ARCameraBackdrop.tsx`
  - Visible mirrored camera video, object-cover, full-frame.
- Create: `components/GestureSymbols/ARSymbolOverlay.tsx`
  - Transparent `Canvas` overlay with orthographic camera, symbol mesh, lights, particles, and smoothing.
- Create: `components/GestureSymbols/SymbolMesh.tsx`
  - 3D mesh definitions for cross, ring, square, and star.
- Create: `components/GestureSymbols/PalmParticles.tsx`
  - Upward-rising particles emitted from palm anchor.
- Create tests:
  - `components/GestureSymbols/handRoles.test.mjs`
  - `components/GestureSymbols/palmAnchor.test.mjs`
  - `components/GestureSymbols/cameraProjection.test.mjs`

Keep existing tests:

- `components/GestureSymbols/gestureClassifier.test.mjs`
- `components/GestureSymbols/textField.test.mjs`
- `components/GestureSymbols/symbolMasks.test.mjs`

---

## Interfaces To Produce

Use these exact concepts unless the implementing agent finds a stronger local pattern.

```ts
// components/GestureSymbols/handRoles.ts
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { HandLandmarks } from './gestureClassifier';

export interface HandRoleState {
  userRight: HandLandmarks | null;
  userLeft: HandLandmarks | null;
  userRightLabel?: string;
  userLeftLabel?: string;
}

export function splitHandRoles(result: HandLandmarkerResult | null): HandRoleState;
```

Repo convention to preserve: under the mirrored selfie pipeline, MediaPipe label `"Right"` is treated as the user's right hand. This convention appears in `components/HandLoop/HandLoop.tsx` and should be kept unless live testing proves it inverted.

```ts
// components/GestureSymbols/palmAnchor.ts
import type { HandLandmarks } from './gestureClassifier';

export interface PalmAnchor {
  x: number;
  y: number;
  z: number;
  scale: number;
  roll: number;
  confidence: number;
}

export function computePalmAnchor(hand: HandLandmarks | null): PalmAnchor | null;
```

Anchor formula for v1:

- Palm center = average of wrist `0`, index MCP `5`, middle MCP `9`, ring MCP `13`, pinky MCP `17`.
- Scale = distance between index MCP `5` and pinky MCP `17`, clamped to a stable range.
- Roll = angle from index MCP `5` to pinky MCP `17` in screen space.
- Confidence = `1` when all required landmarks exist; otherwise `0`.

```ts
// components/GestureSymbols/cameraProjection.ts
export interface FrameSize {
  width: number;
  height: number;
}

export interface VideoSize {
  width: number;
  height: number;
}

export interface Point2 {
  x: number;
  y: number;
}

export function mediaPipeToCoveredFramePoint(
  point: Point2,
  video: VideoSize,
  frame: FrameSize,
  mirrored: boolean,
): Point2;

export function framePointToWorld(
  point: Point2,
  frame: FrameSize,
  worldHeight: number,
): Point2;
```

Projection rules:

- The visible camera uses CSS `object-cover`.
- The visible camera is mirrored horizontally for selfie feel.
- MediaPipe reads raw video coordinates, so displayed x is `1 - x` when `mirrored` is true.
- Match object-cover crop exactly when converting from normalized landmark coordinates to displayed pixel coordinates.
- Use an orthographic Three camera. `worldHeight` can be `10`, and `worldWidth = worldHeight * frame.width / frame.height`.

---

## Task 1: Hand Role And Palm Anchor Pure Helpers

**Files:**

- Create: `components/GestureSymbols/handRoles.ts`
- Create: `components/GestureSymbols/handRoles.test.mjs`
- Create: `components/GestureSymbols/palmAnchor.ts`
- Create: `components/GestureSymbols/palmAnchor.test.mjs`

**Interfaces:**

- Consumes: `HandLandmarkerResult`, `HandLandmarks`.
- Produces: `splitHandRoles(result)`, `computePalmAnchor(hand)`.

- [ ] **Step 1: Write failing hand-role tests**

Create `components/GestureSymbols/handRoles.test.mjs`.

Test these cases:

- result is `null` -> both hands are `null`.
- result has one `"Right"` hand -> `userRight` is populated.
- result has one `"Left"` hand -> `userLeft` is populated.
- result has both labels -> both roles are populated.
- missing handedness label falls back to first hand as `userRight` only if no better label exists.

Run:

```bash
node --test components/GestureSymbols/handRoles.test.mjs
```

Expected before implementation: FAIL because `handRoles.ts` does not exist.

- [ ] **Step 2: Implement `handRoles.ts`**

Implement `splitHandRoles` with the existing selfie convention: `"Right"` means user right, `"Left"` means user left.

- [ ] **Step 3: Verify hand-role tests pass**

Run:

```bash
node --test components/GestureSymbols/handRoles.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Write failing palm-anchor tests**

Create `components/GestureSymbols/palmAnchor.test.mjs`.

Test these cases:

- `null` hand -> `null`.
- incomplete hand -> `null`.
- palm center equals average of landmarks `0`, `5`, `9`, `13`, `17`.
- scale increases when index/pinky MCP distance increases.
- roll is finite for a normal hand fixture.

Run:

```bash
node --test components/GestureSymbols/palmAnchor.test.mjs
```

Expected before implementation: FAIL because `palmAnchor.ts` does not exist.

- [ ] **Step 5: Implement `palmAnchor.ts`**

Implement `computePalmAnchor`. Keep constants named and easy to tune:

- `PALM_MIN_SCALE`
- `PALM_MAX_SCALE`
- `PALM_SCALE_MULTIPLIER`

Use simple math and return a stable, finite anchor object.

- [ ] **Step 6: Verify palm-anchor tests pass**

Run:

```bash
node --test components/GestureSymbols/palmAnchor.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/GestureSymbols/handRoles.ts components/GestureSymbols/handRoles.test.mjs components/GestureSymbols/palmAnchor.ts components/GestureSymbols/palmAnchor.test.mjs
git commit -m "Add AR gesture hand helpers"
```

---

## Task 2: Camera Projection Helpers

**Files:**

- Create: `components/GestureSymbols/cameraProjection.ts`
- Create: `components/GestureSymbols/cameraProjection.test.mjs`

**Interfaces:**

- Consumes: normalized MediaPipe point, raw video dimensions, rendered frame dimensions.
- Produces: frame pixel coordinates and orthographic world coordinates.

- [ ] **Step 1: Write failing projection tests**

Create tests covering:

- centered point `(0.5, 0.5)` maps to the frame center with and without mirroring.
- `mirrored: true` flips x.
- object-cover horizontal crop is handled for wide video into 9:16 frame.
- object-cover vertical crop is handled for tall video into 9:16 frame.
- `framePointToWorld` maps frame center to `(0, 0)` and top-left to negative x / positive y.

Run:

```bash
node --test components/GestureSymbols/cameraProjection.test.mjs
```

Expected before implementation: FAIL because `cameraProjection.ts` does not exist.

- [ ] **Step 2: Implement projection helpers**

Implement `mediaPipeToCoveredFramePoint` and `framePointToWorld` with no DOM access. Keep all math pure and deterministic.

- [ ] **Step 3: Verify projection tests pass**

Run:

```bash
node --test components/GestureSymbols/cameraProjection.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/GestureSymbols/cameraProjection.ts components/GestureSymbols/cameraProjection.test.mjs
git commit -m "Add AR camera projection helpers"
```

---

## Task 3: AR State Hook

**Files:**

- Modify: `components/GestureSymbols/useGestureSymbolState.ts`
- Possibly create: `components/GestureSymbols/useARHandState.ts`
- Test: extend `components/GestureSymbols/gestureClassifier.test.mjs` or add `components/GestureSymbols/arHandState.test.mjs` if logic is pure enough.

**Interfaces:**

- Consumes: `HandLandmarkerResult` from `useHandTracking`.
- Produces:
  - active `SymbolState`
  - `PalmAnchor | null`
  - hand debug state
  - latest `HandLandmarkerResult | null` for optional diagnostics

- [ ] **Step 1: Write failing tests for left-hand symbol selection**

Add tests that prove the symbol mapping is based on the left hand, not whichever hand is first in the MediaPipe result:

- right hand has four fingers and left hand has two -> active target should be ring.
- left hand absent -> keep/rest to cross unless keyboard selected.
- left hand closed or one finger -> cross.
- left hand two -> ring.
- left hand three -> square.
- left hand four -> star.

If this is easier as pure helper tests, create a helper such as:

```ts
export function symbolForLeftHand(result: HandLandmarkerResult | null): SymbolKind;
```

- [ ] **Step 2: Implement left-hand selection and right-hand anchor output**

Refactor the current state hook carefully:

- Keep keyboard fallback unchanged.
- Keep swipe fallback optional, but it should not conflict with left-hand held gestures.
- Use `splitHandRoles` to get `userLeft` and `userRight`.
- Use left hand `countExtendedFingers` for symbol selection.
- Use right hand `computePalmAnchor` for AR anchor.
- Smooth symbol changes with existing dwell timing.

- [ ] **Step 3: Verify tests**

Run:

```bash
node --test components/GestureSymbols/*.test.mjs
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/GestureSymbols
git commit -m "Wire AR hand state"
```

---

## Task 4: Full-Frame Camera Backdrop

**Files:**

- Create: `components/GestureSymbols/ARCameraBackdrop.tsx`
- Modify: `components/GestureSymbols/GestureSymbolsExperience.tsx`

**Interfaces:**

- Consumes: `videoRef`, `cameraEnabled`.
- Produces: visible mirrored full-frame camera layer.

- [ ] **Step 1: Create `ARCameraBackdrop.tsx`**

Component contract:

```tsx
export function ARCameraBackdrop({
  videoRef,
  cameraEnabled,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraEnabled: boolean;
}) {
  // Render the video full-frame when camera is enabled.
  // Render a quiet black/dark fallback when camera is not enabled.
}
```

Visual rules:

- Absolute inset `0`.
- `object-cover`.
- Mirrored with `scaleX(-1)`.
- Use the same `videoRef` that feeds MediaPipe.
- No separate small HUD camera window in this experience.

- [ ] **Step 2: Replace current `SymbolCanvas` first screen**

In `GestureSymbolsExperience.tsx`, render:

- `ARCameraBackdrop`
- `ARSymbolOverlay` placeholder can be added in Task 5
- enable button when camera is idle/requesting
- optional dev debug text only in development

Remove `HUD` usage from this experience. Do not edit `components/HandLoop/HUD.tsx`.

- [ ] **Step 3: Verify route loads**

Run:

```bash
npx tsc --noEmit
npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/GestureSymbols/GestureSymbolsExperience.tsx components/GestureSymbols/ARCameraBackdrop.tsx
git commit -m "Make gesture symbols camera first"
```

---

## Task 5: 3D Symbol Overlay

**Files:**

- Create: `components/GestureSymbols/ARSymbolOverlay.tsx`
- Create: `components/GestureSymbols/SymbolMesh.tsx`
- Modify: `components/GestureSymbols/GestureSymbolsExperience.tsx`

**Interfaces:**

- Consumes: active `SymbolState`, `PalmAnchor | null`, video/frame size.
- Produces: transparent Three.js overlay with spinning symbol.

- [ ] **Step 1: Build `SymbolMesh.tsx`**

Implement one mesh group per symbol:

- Cross: two beveled/extruded rectangular bars as a group.
- Ring: `torusGeometry`.
- Square: square frame made from four rectangular bars, not a cube.
- Star: `THREE.Shape` star extruded with `ExtrudeGeometry`, or a flat `ShapeGeometry` with visible thickness simulated by material and rotation if extrusion is too slow.

Material v1:

- White/translucent on camera feed.
- Slight emissive glow.
- Metalness low, roughness medium.
- Use stable geometry creation with `useMemo`.

- [ ] **Step 2: Build `ARSymbolOverlay.tsx`**

Use `@react-three/fiber`:

- Transparent canvas.
- Orthographic camera.
- Ambient light plus one directional/point light.
- A group positioned at the projected right-palm anchor.
- Continuous rotation:
  - primary spin around Y axis.
  - subtle X wobble.
  - optional roll alignment from palm anchor.
- Smooth anchor position/scale with refs and lerp inside `useFrame`.
- When no right hand is detected, fade the symbol out rather than snapping.

- [ ] **Step 3: Wire overlay into `GestureSymbolsExperience.tsx`**

Pass:

- current symbol state
- palm anchor
- video dimensions from `videoRef.current.videoWidth/videoHeight`
- frame dimensions from the container

If frame/video dimensions are not ready, render no 3D object.

- [ ] **Step 4: Verify compile**

Run:

```bash
npx tsc --noEmit
npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/GestureSymbols
git commit -m "Add palm anchored 3D symbols"
```

---

## Task 6: Palm Emergence Particles

**Files:**

- Create: `components/GestureSymbols/PalmParticles.tsx`
- Modify: `components/GestureSymbols/ARSymbolOverlay.tsx`

**Interfaces:**

- Consumes: `PalmAnchor | null`, active `SymbolKind`.
- Produces: particles rising from the palm into the spinning symbol.

- [ ] **Step 1: Add particle design constants**

Suggested constants:

- `PARTICLE_COUNT = 90`
- `PARTICLE_LIFETIME = 1.8`
- `PARTICLE_RISE = 1.4`
- `PARTICLE_SPREAD = 0.45`
- `PARTICLE_SIZE = 0.035`

- [ ] **Step 2: Implement particles**

Use either:

- `points` with `bufferGeometry` and `pointsMaterial`, or
- instanced small planes/spheres if points look too flat.

Behavior:

- Particles originate near palm anchor.
- Particles rise upward in world y.
- Particles fade near end of lifetime.
- Particles inherit active symbol color/texture mood.
- Emission resets or pulses on symbol change.

- [ ] **Step 3: Integrate particles**

Render `PalmParticles` behind and below `SymbolMesh`, so it reads as emerging from the palm and feeding the object.

- [ ] **Step 4: Verify compile**

Run:

```bash
npx tsc --noEmit
npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/GestureSymbols/PalmParticles.tsx components/GestureSymbols/ARSymbolOverlay.tsx
git commit -m "Add palm emergence particles"
```

---

## Task 7: Browser QA And Tuning

**Files:**

- Modify only tuning constants if needed.
- Do not change route wrappers unless a shell bug appears.

**Interfaces:**

- Consumes: complete AR implementation.
- Produces: verified local behavior and documented tuning notes.

- [ ] **Step 1: Run full verification commands**

Run:

```bash
node --test components/GestureSymbols/*.test.mjs
npx tsc --noEmit
npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols
npm run build
```

Expected:

- tests pass
- typecheck passes
- lint passes
- build passes

Note: `npm run build` may need network access because Next font fetching can fail under restricted network.

- [ ] **Step 2: Start dev server**

Run:

```bash
npm run dev -- -p 3000
```

- [ ] **Step 3: Browser-check no-camera fallback**

Routes:

- `http://localhost:3000/portrait/gesture-symbols`
- `http://localhost:3000/reels/gesture-symbols`

Verify:

- enable-camera button is reachable
- no framework overlay
- no console errors
- keyboard `1`, `2`, `3`, `4`, arrows still update symbol state

- [ ] **Step 4: Browser-check live camera**

With camera permission granted:

- Camera fills the 9:16 frame.
- No separate small camera HUD appears.
- Right hand detected -> 3D symbol appears above palm.
- Symbol spins continuously.
- Particles rise upward from palm into symbol.
- Left hand closed/0/1 -> cross.
- Left hand two fingers -> ring.
- Left hand three fingers -> square.
- Left hand four fingers -> star.
- Removing right hand fades symbol out.
- Removing left hand returns/rests to cross unless keyboard hold-off is active.

- [ ] **Step 5: Tune constants**

Tune only after live camera verification:

- symbol size multiplier
- palm y-offset above anchor
- particle count
- particle rise speed
- smoothing factor
- symbol rotation speed
- dwell timing

- [ ] **Step 6: Final commit**

```bash
git add components/GestureSymbols docs/superpowers/plans/2026-07-09-gesture-symbols-ar-palm.md
git commit -m "Implement AR palm gesture symbols"
```

---

## Acceptance Criteria

- `/portrait/gesture-symbols` renders a full-camera AR view inside `PortraitModeShell`.
- `/reels/gesture-symbols` renders the same full-camera AR view inside `ReelsModeShell`.
- No `/loop` files are modified.
- No separate small camera HUD appears in the final AR experience.
- The right palm anchors the 3D object.
- The object appears to emerge from the palm using upward particles.
- The object spins continuously 360 degrees.
- Left-hand raised-finger count selects the symbol:
  - closed/0/1 -> cross
  - 2 -> ring
  - 3 -> square
  - 4 -> star
- Keyboard fallback still works without camera permission.
- Camera denied/unsupported states still render a usable fallback with the enable/status UI.
- `node --test components/GestureSymbols/*.test.mjs`, `npx tsc --noEmit`, targeted ESLint, and `npm run build` pass.
- Browser QA includes both new routes and at least one live-camera pass.

---

## Known Risks And Notes For The Implementer

- True hand/object occlusion is out of scope for v1. The symbol may draw over the hand. Make it feel anchored with position, scale, emergence particles, and slight shadow/glow.
- "Palm facing up toward the sky" is harder than simple palmar/dorsal facing-camera detection. Do not block v1 on perfect palm-up classification. Anchor when the user's right palm is present, and use live testing to tune orientation.
- MediaPipe handedness may appear inverted depending on browser/camera mirroring. The repo currently treats label `"Right"` as the user's right hand under selfie input. Keep that convention unless live camera verification proves otherwise.
- Mapping normalized landmarks to a CSS `object-cover` video is the easiest place to get subtle drift. Keep projection helpers pure and tested.
- If `@react-three/fiber` canvas layout conflicts with the 9:16 shells, keep the canvas absolute inset `0` inside the shell and use a transparent background.
- If particles affect performance, reduce count before simplifying the concept.

---

## Suggested Subagent Split

Use subagent-driven development:

1. **Subagent A: Math and State**
   - `handRoles.ts`, `palmAnchor.ts`, `cameraProjection.ts`, tests, and state hook changes.
2. **Subagent B: Camera Composition**
   - full-frame camera backdrop and top-level `GestureSymbolsExperience` composition.
3. **Subagent C: Three.js Overlay**
   - `ARSymbolOverlay.tsx`, `SymbolMesh.tsx`, `PalmParticles.tsx`.
4. **Main Agent: Integration and QA**
   - resolve seams, run all tests/build, live camera tune, verify both routes, confirm `/loop` untouched.
