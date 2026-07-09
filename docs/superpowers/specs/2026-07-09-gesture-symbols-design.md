# Gesture Symbols - Design

_Date: 2026-07-09_

## Goal

Create a new camera-driven typographic symbol animation inspired by the Instagram
reference discussed in-thread: a dense field of small monospace text is clipped into
a 2D shape, then morphs between symbolic silhouettes in response to mapped hand
gestures.

The experience must live in two route families:

- `/reels/gesture-symbols`
- `/portrait/gesture-symbols`

It must not be added to `/loop`, and the existing `/loop` image-universe behavior
must remain untouched.

## Experience

The first frame is a quiet 2D cross made from dense, repeated text. The canvas sits
inside the existing 9:16 recording/portrait frame and feels like a living poster:
minimal, black-and-white, typographic, slightly unstable, and readable as a symbol
from a distance.

Gestures are mapped, not sequential:

| Gesture | Result |
| --- | --- |
| Rest / closed palm / no confident gesture | Cross |
| One raised finger | Cross |
| Two raised fingers | Ring |
| Three raised fingers | Square |
| Four raised fingers | Star |
| Back-of-hand / facing flip | Invert black/white polarity for the current shape |
| Swipe left/right | Manual cycle through cross -> ring -> square -> star |

The shape change should not feel like a clean logo tween. It should briefly smear,
jitter, and reflow like text being recomposed into a new mask, then settle into a
sharp silhouette.

## Non-Goals

- Do not change `/loop`, `UniverseExperience`, or the 3D Image Universe gesture
  behavior.
- Do not build a new 3D scene. This is a 2D canvas experience.
- Do not use mock camera data as the production path. Keyboard/touch fallbacks are
  acceptable as dev and mobile affordances.
- Do not create a landing page or explanatory screen. The animation is the first
  screen.
- Do not introduce a large new gesture library. Reuse the MediaPipe hand-tracking
  seams that already exist in this repo.

## Routes

### `/reels/gesture-symbols`

Use the existing `ReelsModeShell` from `app/reels/_components/ReelsModeShell.tsx`.
The route should be centered on a white browser background, with the symbol
experience filling the 9:16 frame.

### `/portrait/gesture-symbols`

Use the existing `PortraitModeShell` from
`app/portrait/_components/PortraitModeShell.tsx`. The route should match the
single-window portrait pattern already used by `/portrait`.

Both routes should render the same shared component so behavior does not drift.

## Proposed File Shape

- `components/GestureSymbols/GestureSymbolsExperience.tsx`
  - Owns camera state, hand-tracking state, gesture classification, canvas rendering,
    and UI affordances.
- `components/GestureSymbols/useGestureSymbolState.ts`
  - Converts MediaPipe landmarks plus keyboard/touch fallback events into the current
    target symbol and polarity.
- `components/GestureSymbols/gestureClassifier.ts`
  - Pure hand classifier for raised-finger counts and hand-facing polarity.
- `components/GestureSymbols/symbolMasks.ts`
  - Pure math mask helpers for cross, ring, square, and star.
- `components/GestureSymbols/textField.ts`
  - Text-grid generation, jitter/noise parameters, and density tuning.
- `app/reels/gesture-symbols/page.tsx`
  - Wraps the shared experience in `ReelsModeShell`.
- `app/portrait/gesture-symbols/page.tsx`
  - Wraps the shared experience in `PortraitModeShell`.

The exact module split may change during implementation, but keep the boundaries:
route wrappers stay thin, gesture classification stays separate from canvas drawing,
and mask math stays pure/testable.

## Gesture Classification

Reuse existing hooks and concepts from `components/HandLoop` where practical:

- `useHandTracking` for MediaPipe hand-landmarker timing.
- `useCameraStream` from `components/ImageUniverse` if it remains the cleanest
  camera state seam.
- Raised-finger counting for index/middle/ring/pinky.
- `useHandFacing` or equivalent palmar/dorsal classification for polarity inversion.
- `useSwipeGesture` for manual symbol cycling.

Priority should be deterministic when multiple readings are active:

1. Swipe is an event, not a held state. It manually cycles the target symbol and then
   returns control to held gestures after the debounce window.
2. Four raised fingers map to star.
3. Three raised fingers map to square.
4. Two raised fingers map to ring.
5. One raised finger, closed palm, and no confident held gesture map to cross.
6. Hand-facing inversion is orthogonal: it changes polarity but does not choose a
   symbol.

Use hysteresis/debounce so the symbol does not flicker during tracking noise. The
initial target is always cross.

## Canvas Rendering

Render a full-frame `<canvas>` sized to its parent and scaled by device pixel ratio.
The canvas should draw every frame while visible.

Recommended rendering model:

1. Generate a stable grid of text cells across the viewport.
2. For each cell, evaluate whether its normalized point is inside the interpolated
   current mask.
3. Draw a short text fragment only for included cells.
4. Add subtle per-cell jitter, row drift, and density fluctuation during transitions.
5. Ease the current symbol toward the target symbol over roughly 700-1100ms.
6. Use polarity to switch between black-on-white and white-on-black.

The cross/ring/square/star should be math-defined masks, not image assets. This
makes them responsive, crisp, and easy to test.

## Motion Language

- Cross: stable default, slow breathing scale.
- Ring: expands from the cross center into a hollow halo.
- Square: compresses into a dense architectural block.
- Star: pulls sharp points outward with a slightly faster attack.
- Polarity inversion: hard but elegant black/white flip, with a very short text
  shimmer.
- Swipe cycle: more lateral smear than the mapped held gestures, so manual cycling
  feels distinct.

All text should stay legible enough to read as texture, not as primary copy. Each
symbol should have its own font stack and character pool so cross, ring, square,
and star feel typographically distinct.

## UI Affordances

Keep visible UI minimal:

- Initial enable-camera button if camera permission is not granted.
- Optional tiny status/debug readout in development or behind a keyboard toggle.
- No instructional card overlay in the final view.
- Keyboard fallback:
  - `1` cross
  - `2` ring
  - `3` square
  - `4` star
  - `i` invert polarity
  - arrow keys cycle shapes

On coarse-pointer devices, use touch swipe to cycle shapes and tap/long-press to
toggle polarity if practical.

## Accessibility And Reduced Motion

- Respect `prefers-reduced-motion` by shortening morphs, reducing jitter, and using
  direct fades or gentler interpolation.
- The enable-camera button must be reachable by keyboard and have clear accessible
  text.
- Camera-denied and unsupported states should still allow keyboard/touch fallback.

## Verification

Minimum verification for the implementing agent:

- `npx tsc --noEmit`
- `npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols`
- `npm run build`
- Browser verification at:
  - `/reels/gesture-symbols`
  - `/portrait/gesture-symbols`
- Verify keyboard fallback without camera:
  - initial cross
  - `2` ring
  - `3` square
  - `4` star
  - `i` polarity inversion
  - arrows cycle
- Verify no changes to `/loop` behavior by checking the route still renders and no
  `/loop` files were edited unless an import-only type reuse is explicitly justified.

## Open Tuning Notes

- Exact symbol thickness, text density, and morph duration should be tuned visually.
- Gesture thresholds may need one live webcam pass after the basic implementation is
  working.
- If canvas text becomes too expensive on lower-end devices, reduce cell density
  before changing the visual concept.
