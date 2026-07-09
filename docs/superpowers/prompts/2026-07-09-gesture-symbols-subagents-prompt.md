# Implementation Prompt - Gesture Symbols With Subagents

You are implementing the Gesture Symbols experience in the portfolio repo at:

`/Users/naethun/Desktop/past/portfolio`

Read this design spec first:

`docs/superpowers/specs/2026-07-09-gesture-symbols-design.md`

Do not modify `/loop` or the existing 3D Image Universe behavior. The new experience
must live only under:

- `/reels/gesture-symbols`
- `/portrait/gesture-symbols`

Use subagents for independent workstreams. Keep the main agent responsible for final
integration, visual judgment, and verification.

## Subagent 1 - Route And Shell Integration

Task:

- Inspect the existing `/reels` and `/portrait` route patterns.
- Confirm how `ReelsModeShell` and `PortraitModeShell` are used.
- Create thin route wrappers for:
  - `app/reels/gesture-symbols/page.tsx`
  - `app/portrait/gesture-symbols/page.tsx`
- Ensure both routes render the same shared `GestureSymbolsExperience` component.

Constraints:

- Do not touch `/loop`.
- Do not duplicate the experience logic in route files.
- Keep font/background treatment consistent with the existing route family.

Deliverable:

- A short report of files created/changed and any route-shell assumptions.

## Subagent 2 - Gesture State

Task:

- Build the gesture-to-symbol state layer.
- Reuse existing MediaPipe seams where practical:
  - `components/HandLoop/useHandTracking.ts`
  - `components/HandLoop/useHandShape.ts`
  - `components/HandLoop/usePinch.ts`
  - `components/HandLoop/useHandFacing.ts`
  - `components/HandLoop/useSwipeGesture.ts`
  - `components/ImageUniverse/useCameraStream.ts`
- Implement mapped gestures:
  - rest -> cross
  - open palm -> ring
  - closed fist -> square
  - pinch -> star
  - back-of-hand / facing flip -> polarity inversion
  - swipe -> manual symbol cycle

Constraints:

- Use debounce/hysteresis to prevent flicker.
- Keyboard fallback must work without camera.
- Camera-denied/unsupported states must still allow keyboard fallback.
- Keep state logic separate from canvas drawing.

Deliverable:

- A focused hook or state module plus a short report explaining gesture priority.

## Subagent 3 - Canvas Renderer And Mask Math

Task:

- Build the 2D canvas symbol renderer.
- Implement math-defined masks for cross, ring, square, and star.
- Draw dense repeated monospace text clipped to the interpolated shape.
- Add subtle transition jitter/reflow inspired by the reference video.
- Support black-on-white and white-on-black polarity.
- Respect reduced motion.

Constraints:

- Do not use image assets for the symbol shapes.
- Do not create a 3D scene.
- Keep mask math pure/testable where practical.
- Make the canvas responsive to the 9:16 frame.

Deliverable:

- Renderer component/module plus a short report with tunable constants and visual
  verification notes.

## Main Agent Integration Tasks

After subagents finish:

1. Review their diffs for overlap and conflicts.
2. Integrate into a shared `components/GestureSymbols/` component boundary.
3. Ensure the route wrappers stay thin.
4. Run:
   - `npx tsc --noEmit`
   - `npx eslint components/GestureSymbols app/reels/gesture-symbols app/portrait/gesture-symbols`
   - `npm run build`
5. Start the dev server and visually verify both routes.
6. Verify keyboard fallback:
   - initial cross
   - `2` ring
   - `3` square
   - `4` star
   - `i` invert polarity
   - arrows cycle shapes
7. Verify `/loop` still renders and no `/loop` files were edited.

## Acceptance Criteria

- `/reels/gesture-symbols` renders the new symbol animation inside the reels 9:16
  shell.
- `/portrait/gesture-symbols` renders the same animation inside the portrait shell.
- Initial state is the text-filled cross.
- Mapped gestures select ring, square, and star as specified.
- Swipe cycles cross -> ring -> square -> star.
- Polarity can invert without changing the current symbol.
- Keyboard fallback works without camera permission.
- Reduced-motion users get gentler animation.
- Typecheck, lint, and production build pass.
- `/loop` behavior and files remain untouched.

## Reporting Back

Report:

- Files changed.
- Verification commands and outcomes.
- Browser screenshots or concise visual observations for both new routes.
- Any tuning constants that may need live webcam adjustment.
- Explicit confirmation that `/loop` was not changed.
