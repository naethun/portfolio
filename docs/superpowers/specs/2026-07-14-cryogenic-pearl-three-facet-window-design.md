# Cryogenic Pearl Three-Facet Window Design

**Status:** Visual and technical direction approved in conversation; written specification awaiting user review.

**Route:** `/reels/window`

**Relationship to earlier specifications:** This document supersedes the four-face topology and print-material system in `2026-07-09-faceted-window-gesture-design.md` and `2026-07-09-faceted-window-visual-iteration-design.md`. The existing camera lifecycle, MediaPipe tracking, two-hand pinch activation, stable hand assignment, collapse/open-fan behavior, time-based damping, projection, tracking-loss fade, error states, route shell, and stage aspect ratio remain unchanged.

## Summary

Replace the current four connected fingertip facets with three wider facets and replace the four unrelated print/chrome filters with one cohesive material family named **Cryogenic Pearl**.

The three facets are different phases of the same responsive optical material:

1. frosted diffusion
2. liquid mercury
3. interference membrane

All three sample the same live camera texture, derive their structure from the same camera luminance and image gradients, and use one shared procedural caustic field. Hand movement increases optical distortion; facet angle changes reflection and refraction; slow ambient motion keeps the surface alive when the hands are still. The camera subject remains recognizable but heavily transformed.

## Goals

- Render exactly three connected facets inside the existing single camera window.
- Preserve the influence of all five fingertips without arbitrarily dropping one.
- Make all three filters read as states of one material rather than unrelated effects.
- Keep faces and hands recognizable through each treatment.
- Drive intensity from hand movement and facet angle, with restrained idle motion.
- Preserve the current activation, hand-role, smoothing, projection, open-fan, tracking-loss, and route behavior.
- Retain one camera stream, one `VideoTexture`, one WebGL canvas, and stable reusable GPU resources.

## Non-goals

- Changing the two-hand pinch activation gesture or its thresholds.
- Changing MediaPipe options, hand assignment, damping, open-fan scaling, or tracking-loss timing.
- Adding controls, filter selection, recording, export, audio reactivity, or user tuning.
- Adding another video element, camera stream, HandLandmarker, CPU processing canvas, or texture source.
- Applying this material system to other `/reels` or `/portrait` routes.
- Reworking the outer Mac-style window or the route's `11 / 16` stage.

## Three-facet geometry

### Preserve five-point hand state

Each tracked hand continues to store the existing five-point anatomical rail in this order:

1. thumb
2. index
3. middle
4. ring
5. pinky

The five-point rails continue through hand assignment, pinch collapse, open-fan scaling, time-based damping, tracking hold, and fade. None of those systems are reduced to four points.

### Render-time resampling

`buildFacetBuffers` resamples each damped five-point rail into four render anchors. Three adjacent anchor pairs then produce exactly three quadrilateral facets.

Resampling uses cumulative two-dimensional polyline length in display space:

- Preserve the thumb and pinky endpoints exactly.
- Sample interior anchors at one-third and two-thirds of the total thumb-to-pinky polyline length.
- Interpolate `x`, `y`, `z`, `u`, and `v` with the same local segment weight.
- If the total polyline length is effectively zero, fall back to index-parametric interpolation at source positions `0`, `4/3`, `8/3`, and `4`.

Using display-space length keeps the three visible facets broadly balanced while avoiding depth-driven width changes. Interpolating UVs with the same weights keeps the camera image attached to the resampled geometry. Resampling after damping avoids introducing a second motion path or changing the current hand-state contract.

### Facet construction and assignment

The resampled rails produce three stable quadrilateral meshes using the existing two-triangle order.

| Anatomical position | Material phase |
| --- | --- |
| thumb-side facet | frosted diffusion |
| center facet | liquid mercury |
| pinky-side facet | interference membrane |

Assignment remains anatomical, not based on screen position. When the hands rotate, the material phases remain attached to the same part of the rail even if their apparent top-to-bottom order changes.

## Cryogenic Pearl material system

### Shared optical foundation

All three shader modes share:

- the same `VideoTexture`
- source camera luminance
- local horizontal and vertical luminance gradients
- a slow procedural caustic vector field
- smoothed motion energy
- front/back-corrected facet normal and view-angle response
- restrained normal lighting and depth lift

The shared palette is:

| Role | Color |
| --- | --- |
| deep optical ink | `#080D13` |
| ice white | `#EFFCFF` |
| cool silver | `#B4C6D4` |
| pearl | `#ECE9FF` |
| cyan interference | `#71F1F3` |
| violet interference | `#806EFF` |

The cyan and violet are accents derived from edges and refraction. They do not become a full rainbow wash.

### Facet 0: frosted diffusion

The thumb-side facet remains the softest and most camera-readable phase.

- Use a five-tap cross sample of the live video rather than a separate blur texture.
- Offset the taps with the shared caustic vector.
- Increase the offset from a subtle idle value toward a stronger frosted displacement as motion energy rises.
- Preserve low-frequency facial luminance under an ice-white and pale-silver tint.
- Add a narrow pearl caustic ridge whose position drifts slowly and responds to facet angle.

The result should resemble translucent cold glass, not a conventional CSS blur or an opaque white panel.

### Facet 1: liquid mercury

The center facet is the strongest facial anchor and the highest-contrast phase.

- Remap live luminance into deep ink, cool silver, and ice-white reflection bands.
- Use local camera gradients to keep eyes, nose, mouth, and silhouette edges legible.
- Drive the brightness and width of the specular band primarily from the facet's grazing angle.
- Let motion energy bend and slightly accelerate the band rather than replacing the camera structure.
- Keep one very slow ambient sweep so the material does not freeze when the hands stop.

The result should read as reflective liquid metal whose reflections are structured by the camera image, not a flat grayscale or generic chrome gradient.

### Facet 2: interference membrane

The pinky-side facet is the most chromatic phase while remaining part of the same pearl material.

- Begin from a pearl-and-silver camera reconstruction.
- Use local camera gradients to introduce restrained cyan and violet edge refraction.
- Increase channel separation with motion energy and grazing angle.
- Clamp the maximum screen-space separation so facial features do not split into unreadable RGB copies.
- Reuse the shared caustic field so its waves visually continue from the other facets.

The result should resemble a thin cryogenic interference film, not an oil-slick rainbow or a standalone glitch effect.

## Motion and angle response

### Shared motion energy

The renderer calculates one global motion-energy value for the whole three-facet object. A shared value makes the three phases intensify together and reinforces that they are one connected material.

On each new landmark result:

1. Compare the current resampled anchors with the previous valid anchors.
2. Measure average two-dimensional displacement as a fraction of the stage diagonal.
3. Divide by elapsed seconds to produce normalized screen speed.
4. Map speed through `smoothstep(0.03, 0.45, speed)` into `[0, 1]`.
5. Smooth rising energy with an attack lambda of `14` and falling energy with a release lambda of `5`.

When no new landmark result arrives, the value continues decaying toward zero on the render loop. This prevents energy from freezing at the last detected speed.

### Facet angle

The fragment shader derives grazing angle from the corrected face normal and view direction. Facing the camera produces the calmest surface; rotating toward edge-on increases the specular and refractive response. The absolute facing calculation must treat front and back faces consistently because the meshes remain double-sided.

### Idle motion

`uTime` drives only the slow caustic drift and a restrained specular sweep. Idle animation must not move the geometry, obscure the camera subject, or make the surface look equally energetic at rest and during a gesture.

## Seams and depth

- Replace the existing warm blush seam with pearl white `#EAF5FF`.
- Keep seams fine, translucent, and slightly dimmer than the material highlights.
- Retain the existing depth test and depth write behavior on all solid facets.
- Retain double-sided rendering with corrected normals for back faces.
- Continue to reuse each facet's geometry for its line segments and dispose all line resources on teardown.

## Component architecture

### `components/WindowMode/facetedWindowGeometry.mjs`

- Add a pure five-point-to-four-anchor rail resampler.
- Add pure helpers for normalized anchor speed and attack/release motion-energy damping so the response is testable without React or WebGL.
- Preserve the existing hand-state pipeline unchanged.
- Update `buildFacetBuffers` to construct three facets from the resampled anchors.
- Continue returning plain position and UV arrays without React, DOM, MediaPipe runtime, or Three.js dependencies.

### `components/WindowMode/FacetedWindow.tsx`

- Change the stable facet mode list from four entries to three.
- Retain one `VideoTexture`, one Canvas, and one material and geometry per facet.
- Calculate and smooth global motion energy through refs and the pure geometry helpers, without React state.
- Add a shared `uMotion` uniform to all three materials.
- Continue updating time and drawing-buffer size uniforms on the frame loop.
- Change seam color and preserve cleanup of textures, materials, geometries, indices, and line objects.

### `components/WindowMode/facetedWindowShaders.ts`

- Replace the polka, cyanotype, chrome, and stipple branches with the three Cryogenic Pearl branches.
- Add the shared optical sampling, caustic, gradient, angle, and motion calculations once before the material branches.
- Keep viewport-dependent pixel offsets resolution-aware.
- Clamp UV offsets, denominators, channel separation, and output values to avoid invalid shader results.

### Unchanged boundaries

The following remain unchanged unless a narrow type or test import adjustment is required:

- `components/WindowMode/WindowMode.tsx`
- shared hand-tracking hooks and MediaPipe configuration
- route wrappers and `ReelsWindowClient`
- `ReelsModeShell` and `ReelsStageWindow`
- camera/model error presentation
- skeleton overlay

## Data flow

1. The existing camera updates the mirrored video element.
2. The existing HandLandmarker produces complete results for two hands.
3. The existing state pipeline assigns hand roles, collapses or opens each five-point rail, and damps the result.
4. The renderer resamples each five-point rail into four display anchors.
5. Three stable facet buffers are updated from those anchors and aligned UVs.
6. Anchor displacement updates one smoothed motion-energy value.
7. Each shader samples the shared live video and interprets the same luminance, gradient, caustic, motion, and angle signals as frost, mercury, or membrane.
8. The existing skeleton overlay remains above the transparent WebGL canvas.

## Error and lifecycle behavior

- Before the video has current data and nonzero dimensions, all materials remain invisible.
- Camera deactivation resets the existing faceted state and motion-energy history immediately.
- A model or camera error remains owned by the existing `WindowMode` UI.
- Brief tracking loss retains the existing hold and fade behavior; motion energy decays during the hold instead of freezing.
- A sustained loss resets the object and requires the existing two-hand pinch to arm again.
- No additional fallback image, mock camera data, or alternate material is introduced.
- Shader, material, geometry, seam, and texture resources are disposed on unmount.

## Performance constraints

- Keep one camera stream and one `VideoTexture`.
- Keep the existing capped device-pixel ratio.
- Reuse three geometries, three materials, their typed arrays, and seam line objects.
- Do not allocate arrays, textures, canvases, or React state per frame.
- Limit frosted diffusion to a small fixed sample kernel.
- Calculate motion from existing anchor updates rather than running a second tracking loop.
- Keep all idle animation inside the existing render loop.

## Testing

### Geometry unit tests

- Resampling returns exactly four anchors from five source fingertips.
- Thumb and pinky endpoints are preserved exactly.
- Interior anchors fall at one-third and two-thirds of cumulative display-space length.
- `z`, `u`, and `v` use the same interpolation weights as `x` and `y`.
- A near-zero-length rail uses the index-parametric fallback and returns finite values.
- `buildFacetBuffers` returns exactly three facets with valid position and UV array lengths.
- The three facets remain connected along shared anchor boundaries.
- Existing activation, hand-role continuity, open-fan scaling, damping, projection, and tracking-loss tests remain green after updating four-facet count assertions.

### Motion tests

- Stationary anchors converge toward zero motion energy.
- Fast anchor displacement produces greater energy than slow displacement.
- Attack is faster than release.
- Missing landmark updates decay energy rather than retaining the previous value.
- Resetting or disabling the camera clears previous anchors and motion history.

### Shader source tests

- The shader exposes exactly three material modes.
- All three modes consume the shared motion and angle signals.
- Cryogenic Pearl palette constants are present and the old polka, cyanotype, and brick treatment constants are absent.
- Channel offsets are viewport-aware and clamped.
- The shared camera texture remains the only sampler.

### Live browser verification

On `/reels/window` with camera permission:

- Two tight pinches arm the existing object.
- One pinched and one open hand produce three connected broad facets.
- Both open hands retain the existing full-fan response.
- Slow motion creates a restrained response; fast motion visibly strengthens diffusion, mercury bending, and membrane separation.
- After movement stops, the surface returns to the calm state while retaining subtle idle caustics.
- Rotating a facet changes its specular and refraction response.
- The subject remains recognizable in all three phases.
- Cyan-violet accents remain restrained and do not expand into a full rainbow.
- Material assignment stays attached to thumb-side, center, and pinky-side positions through rotation and crossing.
- Brief and sustained tracking loss retain the existing hold, fade, and reset behavior.
- Desktop and mobile layouts retain the current single tall camera window.
- The browser console contains no shader compilation, WebGL, camera, or cleanup errors.

### Project verification

- Focused geometry and shader tests pass.
- The complete existing test suite passes.
- TypeScript passes without emitting incremental artifacts.
- ESLint passes.
- The production Next.js build passes.
- `git diff --check` passes.

## Acceptance criteria

This iteration is complete when `/reels/window` renders exactly three connected facets influenced by all five fingertips; the facets read as frosted diffusion, liquid mercury, and cyan-violet interference phases of one Cryogenic Pearl material; motion and facet angle amplify the shared optical response while a subtle idle drift remains; the camera subject stays recognizable; the existing gesture, tracking, loss, route, and camera behavior remain intact; and automated plus live-browser verification passes without WebGL errors.
