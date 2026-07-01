# 3D Image Universe — MediaPipe Hand-Gesture Layer

**Date:** 2026-07-01
**Scope:** `/loop` full-screen experience only. The home "moodboard" Finder tab stays passive (no camera).

## Goal

Add optional hand-gesture control to the existing `ImageUniverse`: a two-handed
**pinch → L-shape** gesture morphs the scattered image cloud into a slowly
auto-spinning **globe**, held only while both L-shapes are maintained. A small
camera window shows the live webcam + hand skeleton.

## Interaction model

State machine (with per-hand hysteresis so it never flickers):

- **Natural** — the current scattered, slowly-rotating cloud. Mouse orbit/zoom/click still work.
- **Armed** — both hands in a *pinch pose* (thumb+index tips together, middle/ring/pinky curled). Anticipation cue: cloud gently gathers toward the sphere (a small partial formation ~0.18).
- **Globe** — from Armed, open both hands into an *L-shape* (thumb + index extended ~perpendicular, other three curled) → images ease onto a sphere surface, facing outward, auto-spinning.
- **Held** — globe persists only while both L-shapes hold. Relax hands / leave frame → ease back to Natural.

The **pinch is a required precursor**: a bare L from Natural won't trigger the globe (prevents accidents). Globe morph is implemented in the default instanced-planes path; Points mode stays scatter-only.

Detection reuses existing landmark math:
- pinch: `dist(thumbTip, indexTip) / dist(wrist, middleMCP) < ~0.32`
- finger extended: `dist(tip, wrist) > dist(mcp, wrist) · 1.15`
- L-shape: thumb + index extended, other three curled, ~perpendicular thumb↔index (|cosθ| < 0.6)

## Rendering: scatter ↔ globe morph

Each image instance gets a target direction on a **Fibonacci sphere** (even coverage).
A single `uFormation` uniform (0=scatter, 1=globe) drives the morph in the vertex shader:

- center = `mix(scatteredPos, rotateY(sphereDir · radius, uSpin), uFormation)`
- billboard offset (camera-facing, world space) vs globe surface-tangent offset, blended by `uFormation`
- `uSpin` advances proportional to `uFormation` (spins up as the globe forms), rotation about Y
- camera-basis uniforms (`uCamRight`, `uCamUp`) updated each frame for the billboard term

At `uFormation = 0` this is identical to the current billboard behavior. On the globe,
images fix to the surface facing outward (so it reads as a spinnable object) and are
gently translucent (back-hemisphere images sensed through the gaps).

## Architecture (clean seams, ref-bridged — no per-frame React re-renders)

- **`ImageUniverse`** (renderer) — gains one optional prop `formationTargetRef: RefObject<number>`. Its render loop eases `uFormation` toward it and advances `uSpin`. Knows nothing about hands. Also precomputes sphere directions and the extended shader.
- **`useCameraStream`** — `getUserMedia` + hidden `<video>` + permission states (idle/requesting/granted/denied/unsupported/insecure) + teardown. (Extracted from the HandLoop pattern.)
- **`useUniverseGestures`** — reads the hand-landmarks ref each frame, runs the state machine, writes `0 / ~0.18 / 1` into `formationTargetRef`, and reports the current state for the HUD label. Knows nothing about rendering.
- **Orchestrator** (`app/loop/LoopClient.tsx`) — owns the camera stream + `useHandTracking` (→ `landmarksRef`) + reused `HUD` (camera + skeleton window) + an opt-in "Enable gestures" affordance, and wires the ref bridge to `ImageUniverse`.

Reused as-is from `components/HandLoop/`: `useHandTracking`, `HUD`, `MacWindow`.
`HandLoop` itself remains untouched.

## Camera activation

Opt-in. `/loop` shows an "Enable gestures" control; clicking requests the webcam.
Nothing auto-prompts. Denied/unsupported/insecure states show a short status line and
the universe still works with mouse.
