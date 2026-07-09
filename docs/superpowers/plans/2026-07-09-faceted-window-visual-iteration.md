# Faceted Window Visual Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enlarge the fully open fingertip fan by 20%, render the first face as a camera-reactive violet-and-white polka halftone, render the former green face as futuristic liquid chrome, preserve the indigo cyanotype and brick stipple faces, and widen `/reels/window` to `11 / 16`.

**Architecture:** Preserve the single-camera, single-`VideoTexture`, four-mesh React Three Fiber architecture. Keep openness scaling in the pure geometry module and run every visual treatment directly from `uVideo` in the existing GPU fragment shader. Remove the secondary canvas-processing and texture pipeline entirely.

**Tech Stack:** Next.js 16, React 19, React Three Fiber, Three.js GLSL, MediaPipe HandLandmarker, Node test runner, TypeScript, ESLint.

## Global Constraints

- Do not stage or commit any files; the user explicitly prohibited commits unless requested.
- Preserve the existing camera stream, HandLandmarker instance, skeleton overlay, activation gesture, smoothing, tracking-loss timing, and error UI.
- Use exactly one shared `VideoTexture`; do not add a video element, camera stream, CPU image canvas, animation loop, or per-frame React state.
- Tight pinch scale remains `1.00`; fully open fan scale is `1.20`; fan scaling changes rendered x/y only and leaves z and UVs unchanged.
- All four faces remain camera-reactive and keep depth testing and depth writing.
- `ReelsModeShell` defaults to `9 / 16`; only `/reels/window` opts into `11 / 16`.
- Verify no shader, texture, WebGL, or cleanup errors in a browser.

---

### Task 1: Preserve the openness-derived fan scale

**Files:**
- Modify: `components/WindowMode/facetedWindowGeometry.mjs`
- Test: `components/WindowMode/facetedWindowGeometry.test.mjs`

**Interfaces:**
- Produces: `fanScaleForCollapse(collapse, maxCollapse, openFanBoost): number`.
- Preserves: x/y fan scaling around the pinch midpoint without changing z/u/v.

- [ ] **Step 1: Run the focused geometry regression**

Run `node --test components/WindowMode/facetedWindowGeometry.test.mjs` and verify the 20% fully open fan test passes.

- [ ] **Step 2: Confirm legacy gesture behavior**

Run `node --test components/WindowMode/windowGesture.test.mjs` and verify all existing gesture tests pass.

---

### Task 2: Replace ASCII with camera-reactive violet polka

**Files:**
- Modify: `components/WindowMode/FacetedWindow.tsx`
- Modify: `components/WindowMode/facetedWindowShaders.ts`
- Test: `components/WindowMode/facetedWindowShaders.test.mjs`
- Delete: `components/WindowMode/facetedWindowVisuals.mjs`
- Delete: `components/WindowMode/facetedWindowVisuals.test.mjs`

**Interfaces:**
- Consumes: `uVideo`, `uViewport`, and camera luminance.
- Produces: mode `0 = camera-reactive violet polka`.

- [ ] **Step 1: Write and verify the failing removal/polka contract**

Assert that mode 0 contains `POLKA_VIOLET`, `POLKA_WHITE`, and a luminance-derived dot radius. Assert that `uAscii`, the canvas-processing code, and both visual helper files are absent. Run `node --test components/WindowMode/facetedWindowShaders.test.mjs` and confirm failure against the existing ASCII implementation.

- [ ] **Step 2: Remove the secondary texture pipeline**

Remove the canvas, context, glyph mapping, refresh timer, `CanvasTexture`, `uAscii` uniform, and related cleanup. Retain only the existing `VideoTexture` resource.

- [ ] **Step 3: Implement the violet polka shader**

Use a staggered ten-pixel screen-space grid. Map `1.0 - luma` to a dot radius from `0.08` to `0.47`, then mix a near-white ground with rich violet through the circular dot mask.

- [ ] **Step 4: Verify GREEN**

Run `node --test components/WindowMode/facetedWindowShaders.test.mjs` and verify the polka and pipeline-removal assertions pass.

---

### Task 3: Turn the former green face into liquid chrome

**Files:**
- Modify: `components/WindowMode/facetedWindowShaders.ts`
- Test: `components/WindowMode/facetedWindowShaders.test.mjs`

**Interfaces:**
- Consumes: `uVideo`, `uTime`, `uViewport`, and `sourceUv`.
- Produces: mode `2 = camera-reactive liquid chrome`.

- [ ] **Step 1: Write and verify the failing chrome contract**

Require dark, silver, white, cyan, and violet chrome constants plus a time-driven `specularSweep`. Confirm the test fails against the viridian branch.

- [ ] **Step 2: Implement camera-derived metal reflections**

Map live luminance into dark/silver/white reflection bands, derive edge strength from neighboring camera samples, tint edges cyan and violet, and add one slow diagonal specular sweep. Keep the camera image as the structure of the reflection.

- [ ] **Step 3: Verify GREEN**

Run `node --test components/WindowMode/facetedWindowShaders.test.mjs` and verify all shader contracts pass.

---

### Task 4: Verify production and the live gesture

**Files:**
- Verify only; modify implementation only after reproducing a failure and adding a focused failing regression test.

**Interfaces:**
- Consumes: completed Tasks 1-3.
- Produces: automated and live evidence for the approved visual delta.

- [ ] **Step 1: Run static verification**

Run:

```bash
node --test components/WindowMode/facetedWindowShaders.test.mjs
node --test components/WindowMode/facetedWindowGeometry.test.mjs
node --test components/WindowMode/windowGesture.test.mjs
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
git diff --check
```

Expected: every command exits 0.

- [ ] **Step 2: Run the production build**

Run `npm run build`. Expect a successful Next.js build listing `○ /reels/window`. If sandbox networking alone blocks configured Google Fonts, rerun with approved network access without changing font code.

- [ ] **Step 3: Verify the permissioned camera route**

On `/reels/window`, enable the camera, arm with a two-hand pinch, and open the fan. Confirm violet dot size follows the camera subject, chrome reflections follow live luminance and carry a moving highlight, indigo and brick faces remain intact, and no shader/WebGL error appears.

- [ ] **Step 4: Audit the repository**

Run:

```bash
git diff --check
git status --short
git diff --cached --name-only
git rev-parse --short HEAD
```

Expected: only intended unstaged/untracked files appear, the cached diff is empty, and HEAD remains unchanged.

---

### Task 5: Widen only the camera-window route

**Files:**
- Modify: `app/reels/_components/ReelsModeShell.tsx`
- Modify: `app/reels/_components/ReelsWindowClient.tsx`
- Create: `app/reels/_components/ReelsWindowLayout.test.mjs`

**Interfaces:**
- Produces: `ReelsModeShell({ children, aspectRatio? })` with `aspectRatio = '9 / 16'` by default.
- Consumes: `aspectRatio="11 / 16"` from `ReelsWindowClient` only.

- [ ] **Step 1: Write the failing route-width contract**

Read both component sources and assert that `ReelsModeShell` exposes a `9 / 16` default, uses the received value in its style, and `ReelsWindowClient` passes `11 / 16`.

- [ ] **Step 2: Verify RED**

Run `node --test app/reels/_components/ReelsWindowLayout.test.mjs`. Expect failure because the shell has no aspect-ratio prop and the window client has no override.

- [ ] **Step 3: Implement the route-only override**

Add `aspectRatio?: string` to the shell props, default it to `'9 / 16'`, and use it in the stage style. Pass `aspectRatio="11 / 16"` from `ReelsWindowClient`. Do not modify other consumers or window insets.

- [ ] **Step 4: Verify GREEN and render dimensions**

Run the focused test, TypeScript, ESLint, and the production build. In a browser, verify `/reels/window` remains height-bound and centered but is approximately 22% wider than its previous 9:16 stage.
