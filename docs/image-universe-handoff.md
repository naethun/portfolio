# 3D Image Universe + Hand Gestures — Handoff

_Last updated: 2026-07-01_

An immersive Three.js "image universe" on the portfolio's **`/loop`** route (and, passively, the
home page's **"moodboard"** Finder tab). Your images float as a scattered 3D cloud; optional
**MediaPipe hand gestures** morph the cloud into a **globe** or a **DNA double-helix**. It replaced
the old MediaPipe "HandLoop" mood board — those files are **kept intact** for reference and are no
longer wired into any route.

---

## 1. Where it lives

| File | Role |
|------|------|
| `lib/getUniverseMedia.ts` | **Server-side folder scan** — the Next-native "manifest". Scans `public/portfolio/loop-imgs/`, returns `{src, type, filename}[]`. Drop files in → they appear (no build step). |
| `components/ImageUniverse/ImageUniverse.tsx` | The renderer: scene/camera/OrbitControls/GSAP, scatter↔globe↔helix morph, picking, teardown. **All visual tunables at the top.** |
| `components/ImageUniverse/atlas.ts` | Packs all images into one canvas texture; records per-image UV rect + aspect. |
| `components/ImageUniverse/shaders.ts` | GLSL: `PLANE_VERTEX` (billboard + globe + helix blend), `PLANE_FRAGMENT`, points shaders, video shaders. |
| `components/ImageUniverse/useCameraStream.ts` | Opt-in `getUserMedia` + permission states. |
| `components/ImageUniverse/useUniverseGestures.ts` | **Gesture state machine + pose detection.** All gesture tunables at the top. |
| `components/ImageUniverse/README.md` | Base-universe (no-gesture) explainer: atlas/shader flow, tunables. |
| `app/loop/page.tsx` | Server component; scans media, renders `LoopClient`. |
| `app/loop/LoopClient.tsx` | **Orchestrator**: camera + hand tracking + gestures + HUD + guidance strip + debug panel + keyboard fallbacks. |
| `app/HomeClient.tsx` | Home page; renders `<ImageUniverse>` (passive, no camera) in the "moodboard" Finder tab. |
| `components/HandLoop/useHandTracking.ts` | **Reused as-is** — loads the MediaPipe HandLandmarker, fires `onResult` per camera frame. |
| `components/HandLoop/HUD.tsx`, `MacWindow.tsx` | **Reused as-is** — the draggable camera window + hand-skeleton overlay. |
| `docs/superpowers/specs/2026-07-01-image-universe-gestures-design.md` | Original design doc (pre-implementation; some gesture details evolved — this handoff is authoritative). |

Dependencies added: **`gsap`** (npm). `three` (0.181) was already present. MediaPipe WASM + model
load from CDN (`cdn.jsdelivr.net`, `storage.googleapis.com`) on camera enable.

---

## 2. How the render works (no gestures needed)

1. `getUniverseMedia()` (server) lists media in `public/portfolio/loop-imgs/`.
2. `buildAtlas()` (client) loads every image and draws them into **one** canvas texture in a
   square-ish grid, each "contained" with a transparent gutter (so mipmaps don't bleed between
   neighbors). Records each image's tight UV rect + aspect ratio. → **one draw call**, no dynamic
   `sampler2D[]` indexing (which isn't portable).
3. Default render mode is **instanced billboarded planes** (`USE_INSTANCED_PLANES = true`) — crisp,
   correct-aspect. A `Points` mode exists behind the flag (square sprites) but **does not support the
   globe/helix morph** (scatter only).
4. `PLANE_VERTEX` positions each instance as
   `center = mix(scatter, mix(globe, helix, uShape), uFormation)` and blends the quad orientation
   between camera-facing billboard (scatter) and surface-outward (formed). `uSpin` auto-rotates the
   formed shapes about Y, proportional to `uFormation`.
5. GSAP eased intro (camera dolly-in + reveal). Click-to-fly with an **`onSelect(media, index)`**
   hook — the intended integration point for AESTHETIC product recommendations later.
6. Everything is disposed on unmount (geometry, materials, textures, videos, listeners, RAF, GSAP,
   `renderer.forceContextLoss()`), so switching tabs / leaving `/loop` leaks no WebGL contexts.

Videos (`.mp4/.webm/.mov`) render as separate billboarded planes (not baked into the atlas); GIFs
render their first frame only (still image).

---

## 3. The gesture model

Camera is **opt-in** on `/loop` ("Enable hand gestures" button). Two **independent, held**
formations, both entered **from scattered**:

| Formation | Gesture | Held while | Release |
|-----------|---------|-----------|---------|
| **Globe** | Pinch both hands (thumb+index, others curled) → **open into an L** (palms toward camera). Formation pulls in continuously as you open (min of both hands' open-progress). | the L is held | relax the L → scatter |
| **Helix (DNA)** | Show the **backs of both open hands** (flat open hand, palm facing away). | the pose is held | lower / turn palms → scatter |

The two triggers are deliberately distinct poses (pinch/L vs. flat open hand) and distinguished by
**palm facing**. The shape is **not switchable while formed** — relax to scattered and re-form to
change shape.

### State machine (`useUniverseGestures.ts`)
```
natural ──both pinch (120ms)──▶ armed ──both L (120ms)──▶ globe ──L lost (350ms)──▶ natural
   │                              │
   │                        (pinch abandoned 600ms) ─▶ natural
   └──backs of both open hands (120ms)──▶ helix ──pose lost (350ms)──▶ natural
```
- Writes two refs the renderer eases toward: **`formationTargetRef`** (0=scatter, 1=formed) and
  **`shapeTargetRef`** (0=globe, 1=helix). No per-frame React re-renders.
- Reports `natural | armed | globe | helix` to the orchestrator for the guidance strip.

### Pose detection (landmark math, MediaPipe 21-point hands)
- **pinch**: `dist(thumbTip, indexTip) / dist(wrist, middleMCP) < PINCH_MAX`, others curled.
- **L**: thumb + index extended, other three curled, thumb⊥index (`|cos| < L_PERP_COS`).
- **open hand**: index/middle/ring/pinky all extended.
- **facing (`isDorsal`)**: palm normal from `(wrist→indexMCP) × (wrist→pinkyMCP)`. Its sign **flips
  with hand chirality**, so the palmar sign is chosen **per hand from the handedness label**
  (`Left` hands get the opposite sign). `PALMAR_SIGN` sets the global direction.
  ⚠️ **This was the #1 source of bugs** — a single fixed sign makes the two hands read facing
  oppositely, so backs-of-both-hands can never agree. Keep the per-handedness split.

---

## 4. Tunables

**Visual** — top of `components/ImageUniverse/ImageUniverse.tsx`:

| Const | Default | Meaning |
|-------|---------|---------|
| `USE_INSTANCED_PLANES` | `true` | planes (crisp, morph-capable) vs Points (scatter only) |
| `BACKGROUND_COLOR` | `#f4f2ee` | near-white gallery bg |
| `POSITION_SPREAD` / `SHELL_BIAS` | `60` / `0.35` | scatter cloud size / shell bias |
| `SIZE_BASE` / `SIZE_JITTER` | `7` / `0.5` | per-image base size ± jitter |
| `PLANE_WORLD_SCALE` / `POINT_SIZE_FACTOR` | `0.9` / `300` | plane world size / point-size factor |
| `DAMPING`, `MIN_ZOOM`, `MAX_ZOOM` | `0.08`, `8`, `210` | OrbitControls feel |
| `IDLE_DELAY_MS` / `IDLE_DRIFT_SPEED` | `3500` / `0.3` | idle camera auto-drift |
| `FOV`, `INTRO_DURATION`, `START_DISTANCE` | `55`, `2.2`, `90` | camera + intro |
| `GLOBE_RADIUS` / `GLOBE_SPIN_SPEED` / `FORMATION_EASE` | `16` / `0.25` / `3.0` | globe size / spin / morph speed |
| `HELIX_RADIUS` / `HELIX_HEIGHT` / `HELIX_TURNS` / `SHAPE_EASE` | `11` / `46` / `3` / `2.5` | helix geometry / morph speed |

**Gesture** — top of `components/ImageUniverse/useUniverseGestures.ts`:

| Const | Default | Meaning |
|-------|---------|---------|
| `PINCH_MAX` | `0.34` | pinch tightness threshold |
| `L_OPEN_RATIO` | `1.15` | thumb-index spread counted as a full open L |
| `EXTEND_RATIO` / `THUMB_EXTEND_RATIO` | `1.15` / `1.1` | finger-extended thresholds |
| `L_PERP_COS` | `0.6` | how perpendicular thumb/index must be for an L |
| `ARMED_FLOOR` | `0.1` | how much the cloud gathers at a bare pinch |
| `ENTER_MS` / `RELEASE_MS` / `EXIT_GRACE_MS` | `120` / `600` / `350` | pose-sustain / abandon / release timings |
| `PALMAR_SIGN` | `-1` | **global facing direction.** If globe/helix (or palms/backs) come out inverted, flip this. |
| `FACING_EPS` | `0.005` | edge-on facing dead-zone |

> ⚠️ **All gesture thresholds are empirical** — calibrated by eye, not against a dataset. Expect to
> tune them per person / lighting / camera. `PALMAR_SIGN` is the one most likely to need flipping.

---

## 5. Debug & dev tooling

- **On-screen gesture panel** (`/loop`, top-right, toggle with **`D`**): live readout of
  `camera`, `model`, `hands`, `handedness`, `pinch`, `L-shape`, `backs`, `open-hand`, `L-progress`,
  `formation`, `shape`, `state`. **This is the primary debugging tool** — it shows exactly where the
  camera→landmark→pose→state chain breaks. Built via a `debugRef` the gesture hook writes each frame;
  the panel polls it (~8 Hz) so it doesn't force React re-renders.
- **Keyboard fallbacks** (camera off): **`G`** toggles the globe on/off, **`H`** toggles globe↔helix.
  These write the same refs the gestures do, so they exercise the full render path without a webcam.
- **Reviewing a user screen-recording without ffmpeg**: this machine has no ffmpeg/cv2. Use the
  Swift + AVFoundation frame extractor at
  `…/scratchpad/extract.swift` — `swift extract.swift <video.mov> <outdir> <count> [startSec] [endSec]`
  dumps PNG frames, then `sips -Z 1280 -s format jpeg` to downscale for reading. Reading the debug
  panel per frame is how the helix bug was diagnosed.

---

## 6. Verification status

| Area | Status |
|------|--------|
| Build / `tsc` / `eslint` | ✅ clean |
| Scatter render, correct aspect, depth, intro, click-to-fly, teardown | ✅ verified live (headless preview) |
| Globe morph, auto-spin, reverse | ✅ verified live (keyboard + real webcam recording: globe forms perfectly with pinch→L) |
| Helix render | ✅ verified via keyboard toggle |
| **Facing detection** (palms vs backs, both hands agree) | ✅ verified in user recording |
| **Helix trigger** (open backs → helix) live via webcam | ⏳ **awaiting user confirmation** after the latest change (redesigned from "pinch→L with backs" to "open backs") |
| Gesture thresholds tuned to real hands | ⏳ empirical; needs on-person tuning |
| Video (`.mp4`) path | ⚠️ code-reviewed only — no video assets present to test live |

---

## 7. Known issues / next steps

- **Tune gesture thresholds on a real person** — especially `PINCH_MAX`, `L_OPEN_RATIO`,
  `EXTEND_RATIO`, and `PALMAR_SIGN` (flip if palms/backs read inverted).
- **Accidental helix**: "both open hands, backs out" is a fairly natural stretch — if it triggers by
  accident, make it more deliberate (brief hold, or fingers-together variant).
- **Points mode** (`USE_INSTANCED_PLANES = false`) has **no globe/helix morph** — scatter only. Add
  it there or leave documented.
- **GIFs** show first frame only; **videos** untested live.
- **AESTHETIC recommendations**: wire into the `onSelect(media, index)` callback on `ImageUniverse`
  (fires on click-to-fly) — the designated hook.
- The `g`/`h`/`d` **keyboard shortcuts and the debug panel are dev affordances** — decide whether to
  keep, gate behind a query param, or strip for production.
- `docs/superpowers/specs/2026-07-01-…-design.md` predates the final gesture model — this handoff
  supersedes it for gesture behavior.

---

## 8. Run / verify

```bash
cd ~/Desktop/past/portfolio   # this project's root (a standalone Next.js app)
npm run dev                   # http://localhost:3000/loop
npm run build                 # production build (both / and /loop prerender)
npx tsc --noEmit              # typecheck
npx eslint components/ImageUniverse app/loop
```
Add media by dropping image/video files into `public/portfolio/loop-imgs/` and refreshing.
Enable gestures with the on-screen button (needs a webcam + secure context / localhost).
