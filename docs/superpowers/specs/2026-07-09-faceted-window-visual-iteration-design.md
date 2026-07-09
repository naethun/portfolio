# Faceted Window Visual Iteration Design

**Status:** Visual direction approved in conversation; written delta awaiting user review.

**Route:** `/reels/window`

**Relationship to the original spec:** This document supersedes only the open-hand sizing and hybrid face-treatment sections of `2026-07-09-faceted-window-gesture-design.md`. The existing camera, MediaPipe, hand assignment, activation, smoothing, projection, tracking-loss, and error-state contracts remain unchanged.

## Summary

Make the current four-face fingertip window easier to read while preserving its strongest print treatments. The thumb-to-index face becomes a clean violet-and-white camera-reactive polka halftone. The middle-to-ring face becomes futuristic liquid chrome whose reflections follow the live camera. Opening a hand still exaggerates its fingertip fan so the cone and diamond occupy more screen area.

## Goals

- Make the camera subject recognizable through violet dot-size variation on a white ground.
- Make the former green face feel reflective, metallic, and futuristic while remaining camera-reactive.
- Increase the fully open fingertip fan by 20% without changing the tight-pinch size or activation threshold.
- Preserve the indigo cyanotype and brick stipple faces.
- Preserve one shared `VideoTexture`, one camera stream, one hand tracker, and the existing four-face topology.
- Keep geometry changes pure and testable; verify shader and transparency behavior in a real browser.

## Non-goals

- Reworking hand assignment, projection, tracking-loss timing, or the two-hand activation gesture.
- Adding controls, material selectors, recording, export, or per-user tuning.
- Introducing a second camera texture, CPU image-processing canvas, or per-frame React state.
- Making the mesh uniformly larger while both hands are pinched.

## Camera-reactive violet polka

The thumb-to-index face is generated entirely in the fragment shader from live camera luminance. A staggered ten-pixel screen-space grid creates clean circular violet dots on a near-white ground. Dark camera regions grow the dots and light regions shrink them, preserving the subject without introducing a CPU canvas, glyph texture, or refresh cadence.

## Camera-reactive liquid chrome

The middle-to-ring face maps camera luminance into high-contrast dark, silver, and white reflection bands. Neighboring camera samples add restrained cyan-violet edge color, while one slow diagonal specular sweep gives the metal an animated futuristic sheen. The camera remains the structure of the effect; the animation only supplies the moving highlight.

## Open-hand size

Sizing is gesture-dependent rather than a uniform post-projection zoom.

- Tight pinch: scale `1.00`; the current small, non-degenerate apex is unchanged.
- Fully open hand: scale `1.20` around that hand's thumb/index pinch midpoint.
- Intermediate pose: scale continuously between `1.00` and `1.20` from the existing collapse weight.

Conceptually:

```text
openness = clamp(1 - collapse / maxCollapse, 0, 1)
fanScale = 1 + 0.20 * openness
```

The fan scale affects rendered fingertip positions in x and y, not depth. UV coordinates retain their current interpolated camera locations, which magnifies the same live camera region across the larger face instead of exposing unrelated background. Damping remains downstream of the target calculation so the enlargement inherits the current elastic motion.

## Route width

`/reels/window` uses an `11 / 16` stage instead of `9 / 16`, increasing usable width by roughly 22% while retaining the same viewport-height sizing, centered composition, full-window insets, and portrait orientation. `ReelsModeShell` exposes the aspect ratio as an optional prop whose default remains `9 / 16`; only `ReelsWindowClient` opts into `11 / 16`. Other reels routes must not change.

## Print face system

Treatments remain assigned by anatomical finger band.

| Finger band | Material treatment |
| --- | --- |
| thumb to index | violet-and-white camera-reactive polka halftone |
| index to middle | indigo/pearl cyanotype threshold with coarser riso grain |
| middle to ring | animated liquid chrome with cyan-violet edge reflections |
| ring to pinky | brick-red elliptical stipple on a cool paper ground |

### Indigo cyanotype

Keep the original luminance threshold structure, shifting cobalt to deep indigo and warm bone to pearl. Increase the grain cells slightly and use restrained paper-fiber modulation so the surface feels coarser without becoming noisy.

### Brick stipple

Keep the original luminance-driven halftone field, shifting coral to brick red and bone to a cool paper tone. Stretch the dot cells slightly horizontally and vary their radius with low-amplitude grain so the texture is recognizably stippled but not a direct copy.

Fine blush seams and normal-based light variation continue to unify the four materials.

## Architecture and data flow

- `facetedWindowGeometry.mjs` owns the openness-derived fan scale and applies it while creating smoothed target rails.
- `ReelsModeShell.tsx` owns the default `9 / 16` stage ratio and accepts a route-level override.
- `ReelsWindowClient.tsx` supplies the `11 / 16` override for `/reels/window` only.
- `FacetedWindow.tsx` owns one `VideoTexture`, four stable meshes, and resource cleanup. No secondary canvas texture remains.
- `facetedWindowShaders.ts` owns the violet polka, indigo cyanotype, liquid chrome, and brick stipple branches.
- `WindowMode.tsx`, `useHandTracking`, `SkeletonOverlay`, and route wrappers do not change.

No additional animation loop, video element, texture allocation per frame, or React render path is introduced.

## Error and transparency behavior

- If the video is not ready, materials remain invisible as they do now.
- Camera deactivation and model-load failure continue to reset the renderer immediately.
- All four solid faces write depth consistently.
- Shader compilation, texture updates, and teardown must produce no browser console or WebGL errors.

## Testing

### Geometry tests

- A tightly pinched rail retains its existing spread and scale.
- A fully open rail measures `1.20` times its unscaled distance from the pinch midpoint.
- Intermediate collapse produces a scale strictly between `1.00` and `1.20`.
- Fan enlargement leaves UV coordinates unchanged.
- Existing hand assignment, damping, projection, non-degenerate pinch, and tracking-loss tests remain green.

### Browser verification

- The violet polka face reconstructs the live camera through dot-size changes on white.
- The chrome face visibly tracks the camera subject and reads as reflective metal rather than flat grayscale.
- The fully open side is materially larger while the tight-pinch apex is unchanged.
- Indigo cyanotype and brick stipple remain recognizable as live camera-derived print treatments.
- Moving and rotating hands preserve anatomical material assignment and fingertip continuity.
- The console contains no shader, texture, WebGL, or cleanup errors.

### Project verification

- Focused geometry and legacy window-gesture tests pass.
- TypeScript passes without emitting incremental artifacts.
- ESLint passes.
- The production Next.js build passes.
- `git diff --check` passes and no files are staged or committed.
- `/reels/window` measures `11 / 16`; the other `ReelsModeShell` consumers remain `9 / 16` by default.

## Acceptance criteria

This iteration is complete when the first face reads as a camera-reactive violet-and-white polka halftone; the former green face reads as animated liquid chrome; a fully open hand produces a 20% broader fan without changing the pinched apex; `/reels/window` uses an `11 / 16` stage without changing other reels routes; the indigo and brick faces remain intact; and automated plus live-browser verification passes without WebGL errors.
