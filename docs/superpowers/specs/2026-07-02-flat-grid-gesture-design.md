# Flat-Grid Gesture — Design

_Date: 2026-07-02_

## Goal

Add a third held gesture to the `/loop` Image Universe. When the viewer shows **two open
hands with one palm toward the camera and one back toward the camera** ("mixed facing"),
every image eases out of the scattered cloud and snaps into an even, camera-facing grid —
a readable gallery wall / contact sheet. The grid holds while the pose holds and eases back
to the scattered cloud when the pose is dropped or changed.

This sits alongside the two existing held formations:

| Formation | Trigger (today) |
|-----------|-----------------|
| **Globe** | Both hands pinch → open into an L (palms toward camera) |
| **Helix** | Backs of both open hands toward camera |
| **Flat** (new) | Two open hands, **one palm + one back** (mixed facing) |

The three triggers are mutually exclusive at any instant, so they never contend.

## Non-goals

- No spin. Globe and helix auto-rotate; the flat grid stays still so it is readable.
- No change to globe or helix behavior, geometry, or triggers.
- Not fixing click-picking to follow the morph — see Known Limitations.
- Points render mode (`USE_INSTANCED_PLANES = false`) stays scatter-only, exactly as it is
  today for globe/helix.

## Approach

Add **one new independent axis** — a "flatness" uniform `uFlat` (0 → 1) driven by a new
`flatTargetRef` — parallel to the existing globe↔helix `uShape` axis. Flat is a
**positional-only** morph: images move to grid slots but keep the same camera-facing
(billboard) orientation the scattered cloud already uses, so there is no orientation flip to
blend and no new render path. Globe/helix code is untouched.

Rejected alternatives:

- **Repurpose `shapeTargetRef` into a 3-way globe/helix/flat selector.** More invasive to the
  shader blend, and it breaks the clean binary meaning of the globe↔helix toggle (and the `H`
  keyboard shortcut). Higher regression risk.
- **Flat as a separate top-level formation with its own mesh/render path.** Duplicates the
  scatter↔formed morph plumbing for no benefit.

## Design

### 1. Gesture detection (`components/ImageUniverse/useUniverseGestures.ts`)

- Reuse the existing `isOpenHand` and `isDorsal` primitives — no new landmark math.
- New derived pose, evaluated per frame:
  `flatPose = twoHands && open0 && open1 && (dor0 !== dor1)`
  (two open hands, exactly one back-facing → mixed facing).
- Add `'flat'` to the `GestureState` union.
- New sustain/abandon timestamps `tFlat` / `tNoFlat`, mirroring the helix ones.

### 2. State machine

- **Enter:** only from `natural` (same "relax to change shape" rule as globe/helix). When
  `flatPose` holds for `FLAT_ENTER_MS`, go to `flat`.
- **`flat` state:** set `formationTargetRef = 1`, `flatTargetRef = 1`, `shapeTargetRef = 0`
  (the underlying globe/helix mix rests at globe; it is fully masked by `uFlat = 1`, so its
  value is cosmetic). Report `'flat'`.
- **Release:** when `flatPose` is lost for `EXIT_GRACE_MS`, return to `natural`
  (`formation = 0`, `flat = 0`).
- Every non-flat state sets `flatTargetRef = 0`.
- `FLAT_ENTER_MS` is a **new, slightly longer** enter threshold (~200ms vs the shared
  `ENTER_MS = 120`). Rationale: flipping both hands from palms→backs to reach helix passes
  transiently through mixed facing; a longer hold keeps a smooth two-hand flip from flickering
  into flat. Empirical — tune on a real person, like all gesture thresholds.

### 3. Renderer (`components/ImageUniverse/ImageUniverse.tsx`)

- New optional prop `flatTargetRef?: React.RefObject<number>` with an internal-ref fallback,
  matching the `formationTargetRef` / `shapeTargetRef` pattern.
- New uniform `uFlat = { value: 0 }`, eased toward `flatRef.current` each frame using
  `FLAT_EASE` (a new tunable; may equal `SHAPE_EASE = 2.5`), clamped 0..1 — same easing shape
  as `uShape`.
- Per-instance grid attribute `iGrid` (vec3 world position), computed once at mesh build in
  `createImageMesh`, in instanced-planes mode only:
  - `cols = FLAT_COLUMNS > 0 ? FLAT_COLUMNS : ceil(sqrt(n))`, `rows = ceil(n / cols)`.
  - For instance `k`: `col = k % cols`, `row = floor(k / cols)`.
  - `x = (col - (cols - 1) / 2) * FLAT_SPACING_X`
  - `y = ((rows - 1) / 2 - row) * FLAT_SPACING_Y`
  - `z = 0` (grid lives on the world XY plane, centered at origin).
- Add `uFlat` to the plane material uniforms; register `iGrid` as an
  `InstancedBufferAttribute`.

### 4. Shader (`components/ImageUniverse/shaders.ts`, `PLANE_VERTEX`)

Add `attribute vec3 iGrid;` and `uniform float uFlat;`, then extend the existing blend so
flat overrides the globe/helix result:

```glsl
// flat target: grid slot, camera-facing (reuse the billboard basis, no spin)
vec3 formedPos  = mix(mix(globePos, helixPos, uShape), iGrid,      uFlat);
vec3 tangent    = mix(mix(tanG,     tanH,     uShape), uCamRight,  uFlat);
vec3 bitangent  = mix(mix(bitG,     bitH,     uShape), uCamUp,     uFlat);
vec3 center     = mix(iPosition, formedPos, uFormation);
```

At `uFlat = 1`: position is the grid slot, and tangent/bitangent equal the camera basis so
`shapeOffset == billboardOffset` — every tile faces the camera regardless of `uFormation`.
`uSpin` still bakes into `globePos`/`helixPos`, but those are mixed out at `uFlat = 1`, so the
flat grid does not spin. (A small spin bleed exists only during the brief flat transition;
acceptable.)

### 5. Wiring & dev affordances (`app/loop/LoopClient.tsx`)

- Add `flatTargetRef = useRef(0)`; pass it to both `useUniverseGestures` and `<ImageUniverse>`.
- **Keyboard fallback:** `F` toggles flat without a webcam (mirrors `G`/`H`). On engage:
  `formationTargetRef = 1`, `flatTargetRef = 1`, `shapeTargetRef = 0`. On disengage:
  `formationTargetRef = 0`, `flatTargetRef = 0`. Gated the same as `G`/`H`
  (`!cameraEnabled && !selected`).
- **Guidance strip (`gestureHint`):** add a `flat` case ("FLAT · RELAX HANDS TO RELEASE") and
  extend the `natural` hint to mention the pose ("… · ONE PALM + ONE BACK = FLAT").
- **Debug panel:** extend `GestureDebug` with a `flat` number and render a `flat` row; the
  existing `backs` / `open-hand` per-hand flags already make the mixed pose legible, and the
  `state` row already prints `flat`.

### 6. Tunables (documented at the tops of their files, matching the existing tables)

| Const | File | Meaning |
|-------|------|---------|
| `FLAT_ENTER_MS` (~200) | gestures | sustain the mixed pose this long before flat engages |
| `FLAT_SPACING_X` / `FLAT_SPACING_Y` | renderer | world-unit gap between grid cells |
| `FLAT_COLUMNS` (0 = auto √n) | renderer | force a column count, or auto |
| `FLAT_EASE` (≈ `SHAPE_EASE`) | renderer | scatter↔flat morph speed |

## Known limitations (inherited, not introduced)

- **Click-picking uses each image's scattered position, not its morphed position.** So
  clicking a specific tile while formed is imprecise. This is already true for globe and helix
  today; flat inherits the same behavior. Making picking follow the morph is a separate change,
  out of scope here.
- **Gesture thresholds are empirical.** `FLAT_ENTER_MS` in particular may need tuning so the
  palms→backs (helix) flip doesn't transiently trigger flat.

## Verification

- `npx tsc --noEmit`, `npx eslint components/ImageUniverse app/loop`, `npm run build` — clean;
  `/` and `/loop` still prerender static.
- **Keyboard `F`** (no webcam): flat grid forms — verifiable headless (screenshot / sampled
  render) — and `F` again returns to scatter.
- **Globe/helix unaffected:** `G` and `H` still behave exactly as before.
- **Live gesture (webcam):** mixed-facing open hands → flat; both backs → helix (no accidental
  flat during the flip); relax → scatter. Empirical, needs on-person confirmation (like helix).

## Files touched

- `components/ImageUniverse/useUniverseGestures.ts` — pose, state, `flatTargetRef`, `GestureState`/`GestureDebug`.
- `components/ImageUniverse/ImageUniverse.tsx` — `flatTargetRef` prop, `uFlat`, `iGrid`, easing.
- `components/ImageUniverse/shaders.ts` — `PLANE_VERTEX` flat blend.
- `app/loop/LoopClient.tsx` — ref wiring, `F` key, guidance hint, debug row.
- `docs/image-universe-handoff.md` — document the new gesture (update after implementation).
