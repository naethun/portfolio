# Faceted Fingertip Window Design

**Status:** Interaction and visual direction approved in conversation; written specification pending final review.

**Route:** `/reels/window`

**Reference:** [Instagram reel by wxll.hx](https://www.instagram.com/p/DZINqLuOhiD/)

## Summary

Replace the flat, rounded ASCII rectangle in `/reels/window` with a live, fingertip-anchored WebGL mesh. Each tracked hand contributes the positions of its five fingertips. Adjacent fingertip pairs form four connected faces between the hands. Pinching collapses one end of the mesh toward the thumb/index midpoint; opening the hand expands that end across all five fingertips. This produces the tapered cone, diamond, and folded-ribbon forms visible in the reference.

The mesh uses a hybrid material system: one face keeps the current dark ASCII treatment while the other three use cyanotype, green/cream duotone, and coral stipple treatments. The result must still feel like the existing `/reels/window` piece rather than a detached recreation of the reference.

## Goals

- Make the inner window visibly three-dimensional and directly attached to the user's fingertips.
- Make the signature one-pinched/one-open pose form a clear tapered cone or diamond.
- Keep the geometry live after activation so every hand movement continues to reshape it.
- Give each anatomical finger band a stable, distinct texture treatment.
- Preserve the existing route shell, camera stream, MediaPipe tracker, mirrored video, skeleton overlay, and camera/model error states.
- Keep gesture and projection math pure and testable outside React and WebGL.
- Avoid adding another camera stream or HandLandmarker instance.

## Non-goals

- Reproducing the reference reel pixel for pixel.
- Adding controls, settings, instructional UI, recording, or export behavior.
- Supporting a one-hand version of the mesh.
- Changing other `/reels` modes, `/portrait`, the shared hand tracker, or the outer Mac-style stage window.
- Persisting a created shape after both hands have left the camera.

## Existing behavior to replace

`components/WindowMode/WindowMode.tsx` currently reduces each hand to a thumb/index midpoint, pinch ratio, and open-palm flag. `components/WindowMode/windowGesture.mjs` turns those reduced inputs into a normalized rectangle. A 2D canvas then clips a mirrored webcam crop to that rectangle and redraws it as monochrome ASCII with a rounded, beveled shell.

That reduction discards the information required for the new behavior: individual fingertips, per-landmark depth, handedness, and the relationship between adjacent fingers. The flat rectangle renderer and its width/height state machine will no longer define the visible object.

## Chosen rendering approach

Use a transparent React Three Fiber canvas layered between the mirrored camera video and the existing skeleton overlay. The project already includes Three.js, React Three Fiber, and Drei, so no new rendering dependency is required.

This approach is preferred over two alternatives:

1. A Canvas 2D triangle warp could approximate the reference, but it would require manual depth ordering, affine triangle subdivision, seam management, and simulated lighting.
2. CSS 3D panels would be difficult to attach to ten independently moving vertices and would not provide reliable projective texturing.

The WebGL mesh provides perspective-correct texture mapping, depth-aware face shading, explicit face ordering, and a clean boundary between geometry and visual materials.

## Gesture lifecycle

### Idle

No mesh is visible until two hands are tracked and both hands enter a tight pinch. This preserves the current intentional activation gesture and prevents an object from appearing during incidental hand movement.

### Armed

The first valid two-hand pinch arms the mesh. From that point forward, both hands continuously control it; there is no locked phase.

- **Both hands pinched:** Each five-point fingertip rail collapses toward its own thumb/index midpoint. The mesh reads as a narrow live ribbon between two compact endpoints.
- **One hand pinched, one hand open:** The pinched rail converges toward one apex while the open rail follows all five fingertips. The four faces fan outward into the signature cone/diamond form.
- **Both hands open:** Both rails follow all five fingertips, producing a warped four-band window.
- **Intermediate poses:** Each rail continuously blends between its collapsed pinch point and its five measured fingertips. The shape does not jump between discrete pinch and open states.

### Tracking loss and reset

- A brief loss of either hand holds the last valid geometry to absorb normal detector flicker.
- The mesh then fades rather than snapping away.
- If two valid hands do not return within the reset window, the mesh returns to idle and requires another two-hand pinch to arm.
- Camera deactivation or model failure resets the mesh immediately and leaves the existing error or enable-camera UI responsible for guidance.

Initial tuning targets are a short hold of roughly 150 milliseconds followed by a fade/reset completed within roughly 600 milliseconds. These are implementation tuning values, not user-configurable settings.

## Geometry

### Fingertip rails

Each hand contributes the five MediaPipe fingertip landmarks in anatomical order:

1. thumb: landmark 4
2. index: landmark 8
3. middle: landmark 12
4. ring: landmark 16
5. pinky: landmark 20

The two hands are assigned stable roles across frames. Handedness is the primary signal, with previous-frame proximity as the continuity fallback so the mesh does not swap ends when hands approach or cross.

Each rail stores five three-dimensional points plus the thumb/index pinch midpoint. A continuous collapse weight is derived from pinch distance normalized by hand size. For each fingertip, the rendered point is the interpolation between the measured fingertip and the pinch midpoint. A tight pinch drives the weight toward the midpoint; an open hand drives it toward the measured fingertip.

### Face topology

Corresponding rails are connected into four anatomical bands:

| Face | Left edge | Right edge |
| --- | --- | --- |
| 0 | thumb to index | thumb to index |
| 1 | index to middle | index to middle |
| 2 | middle to ring | middle to ring |
| 3 | ring to pinky | ring to pinky |

Each band is a quadrilateral split into two triangles for rendering. The topology remains stable while vertices move. The mesh is intentionally open at the thumb and pinky boundaries; connecting pinky back to thumb would create a crossing cap across the palm and would not match the reference's ribbon-like construction.

### Mirroring, projection, and depth

- Screen positions must use the same mirrored, `object-cover` coordinate system as the visible webcam and skeleton.
- Source-video UV coordinates remain tied to the corresponding camera locations so the live image appears attached to the moving surface.
- The current cover metrics should be extracted into a reusable pure projection helper and shared by the renderer.
- MediaPipe landmark `z` is normalized and relative rather than a calibrated world distance. It must be centered relative to each wrist, normalized by hand size, clamped, and visually exaggerated within a conservative range.
- A perspective camera is used, but vertex unprojection must keep each fingertip's projected screen position anchored to the detected landmark. Depth changes the face orientation, perspective interpolation, shading, and overlap without pulling the mesh away from the user's fingers.

### Smoothing

Use time-based exponential damping rather than a fixed per-frame interpolation factor. Smooth x, y, z, and pinch-collapse weight independently. The response should feel immediate but elastic, with no visible detector chatter and no frame-rate-dependent lag. Stable hand assignment must happen before smoothing.

## Hybrid face treatments

Treatments are assigned anatomically, not by current screen order, so they travel with the same finger bands when the hands rotate.

| Finger band | Material treatment |
| --- | --- |
| thumb to index | dark live ASCII, retaining the current visual identity |
| index to middle | cobalt/chalk cyanotype threshold |
| middle to ring | green/cream duotone with restrained color separation |
| ring to pinky | warm coral stipple-halftone on a light ground |

All faces sample the same live camera texture and apply different processing. Their UV mapping follows the camera projection so the treatments remain aligned to the person rather than sliding independently across the mesh.

The ASCII face uses an offscreen canvas texture derived from the existing character ramp and mono typography. The other treatments use shader-based luminance mapping, quantization, and procedural dot/grain patterns. Materials share the same video texture and must not create separate video elements.

Fine warm-blush seams, subtle normal-based light variation, and restrained face opacity tie the colorful treatments back to the current black/rose window styling. The old rounded rectangle, bevel, and outer glow do not wrap the new object; the facets themselves become the window. The outer Mac-style route frame remains unchanged.

## Component architecture

### `components/WindowMode/WindowMode.tsx`

Retains ownership of:

- the existing video element and camera lifecycle
- the existing `useHandTracking` call
- the latest complete `HandLandmarkerResult` ref
- camera/model error presentation
- the skeleton overlay

It stops converting landmarks into a flat rectangle and stops running the current 2D window draw loop. It mounts the transparent faceted renderer between the video and skeleton layers.

### `components/WindowMode/FacetedWindow.tsx`

Owns:

- the transparent React Three Fiber canvas
- the shared `VideoTexture`
- four stable face meshes/materials
- per-frame geometry updates from the latest landmark result
- the offscreen ASCII texture
- depth sorting, fade opacity, and disposal of WebGL resources

It reads landmark data through refs and mutates buffer attributes directly. Normal video/landmark frames must not trigger React state renders.

### `components/WindowMode/facetedWindowGeometry.mjs`

Pure functions own:

- stable hand input normalization
- anatomical fingertip extraction
- pinch midpoint and collapse weight
- object-cover/mirrored projection
- depth normalization and clamping
- rail interpolation
- face vertex/index/UV generation
- time-based damping helpers
- tracking-loss lifecycle state

This module contains no DOM, React, Three.js, or MediaPipe runtime dependencies and is tested with synthetic landmarks.

### Existing gesture utilities

The rectangle-specific state machine in `windowGesture.mjs` is superseded for this route. Any generally useful crop or projection behavior should be moved or preserved only if another caller still needs it. Removal or narrowing must be driven by usage checks and tests rather than assumed.

## Data flow

1. The existing camera stream updates the mirrored `<video>` element.
2. The existing HandLandmarker produces complete two-hand results.
3. `WindowMode` stores the latest result without reducing it to rectangle inputs.
4. The renderer reads that result on its frame loop.
5. Pure geometry functions assign hands, extract rails, calculate pinch collapse and depth, smooth values, and produce four face buffers.
6. Four materials sample the shared live video texture with their anatomical treatment.
7. The skeleton continues to draw above the faceted mesh from the same landmark result.

## Performance constraints

- Remove the current full-screen ASCII canvas RAF when the faceted renderer replaces it, avoiding an additional permanent render loop.
- Use one shared `VideoTexture`; never duplicate the camera stream.
- Reuse geometries, buffers, shader materials, and the ASCII canvas rather than allocating them per frame.
- Cap renderer device-pixel ratio at a practical value for the narrow 9:16 stage.
- Update the ASCII canvas at a lower cadence than geometry if needed, while fingertip motion remains full-rate.
- Avoid per-frame React state and object churn.
- Dispose textures, materials, geometries, and animation work on unmount.

## Testing strategy

Implementation follows test-driven development for pure behavior.

### Geometry unit tests

- Extract all five fingertips in anatomical order.
- Mirror x coordinates correctly while retaining source UV correspondence.
- Produce exactly four stable face bands with valid triangle indices.
- Collapse a tightly pinched rail toward the thumb/index midpoint.
- Preserve measured fingertip positions for an open hand.
- Interpolate continuously for intermediate pinch ratios.
- Keep hand roles stable across ordering changes and near-crossing inputs.
- Normalize and clamp depth without invalid numbers or extreme projection.
- Produce frame-rate-independent damping for equivalent elapsed time.
- Hold, fade, and reset predictably when a hand disappears.
- Map source-video points through `object-cover` cropping into the visible stage.

### Project verification

- Existing focused WindowMode tests remain green or are deliberately replaced where the rectangle behavior is removed.
- ESLint passes.
- TypeScript passes without emitting incremental artifacts.
- The production Next.js build passes.
- Browser console contains no camera, shader, WebGL, or cleanup errors during the supported flow.

### Live interaction verification

On `/reels/window` with camera permission:

- incidental open hands do not arm the mesh
- a two-hand pinch arms a narrow live ribbon
- one pinched and one open hand creates a clear tapered cone/diamond
- both open hands create a warped four-band window
- every face remains anchored to the appropriate fingertips while moving and rotating
- depth and face overlap read as three-dimensional without excessive distortion
- each anatomical band keeps its assigned treatment
- the image and mesh align with the mirrored video and skeleton
- brief detector loss does not flicker, while sustained loss fades and resets
- denied camera and model-load failures retain the existing honest UI states

## Acceptance criteria

The feature is complete when the flat ASCII rectangle has been replaced by a smooth four-face fingertip mesh, the one-pinched/one-open gesture reliably produces the reference-inspired cone/diamond, the hybrid materials remain attached to their anatomical bands, the existing route shell and camera pipeline remain intact, automated geometry tests pass, and the live mirrored-camera interaction has been visually verified without console errors.
