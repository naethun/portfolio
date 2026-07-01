# 3D Image Universe

A galaxy of your images (and optional videos) scattered through 3D space as
textured sprites. Nearer ones look bigger, farther ones smaller. Drag to orbit,
scroll to zoom, pan around the cloud. Click a sprite to fly to it.

Built with vanilla **three.js** + **GSAP**, wired into the Next.js portfolio as a
client component (no bundler gymnastics — three is already a dependency).

## How to add your own media

Drop files into **`public/portfolio/loop-imgs/`** and refresh. That's it — there
is no manifest step. The server component (`app/loop/page.tsx` and the home page)
scans that folder with `lib/getUniverseMedia.ts` and hands the list to the
component. Supported: `.jpg .jpeg .png .webp .avif .gif` (images) and
`.mp4 .webm .mov` (videos).

- **`/loop`** → full-screen universe.
- **Home → "moodboard" folder** in the Finder window → the same universe, framed.

Run the site the normal way: `npm run dev`.

## Where it lives

| File | Role |
|------|------|
| `lib/getUniverseMedia.ts` | Server-side folder scan (the "manifest", Next-native). |
| `components/ImageUniverse/ImageUniverse.tsx` | Scene, camera, controls, GSAP, interaction, teardown. **Tunables are at the top.** |
| `components/ImageUniverse/atlas.ts` | Packs every image into one canvas texture + records UV rects. |
| `components/ImageUniverse/shaders.ts` | GLSL for Points, instanced planes, and video planes. |

## The technique (single draw call)

The naive approach — an array of `sampler2D` indexed per-particle — does **not**
compile portably (WebGL1) and is unreliable on WebGL2. So instead:

1. **Atlas.** `atlas.ts` loads every image and draws them into one big canvas in a
   square-ish grid, each "contained" in its cell with a transparent gutter (the
   gutter stops mipmaps from bleeding a neighbor's colors at distance). For each
   image it records the **tight UV rect** it occupies plus its **aspect ratio**.
2. **One texture, per-particle UVs.** That canvas becomes a single
   `CanvasTexture`. Each particle carries `uvOffset` / `uvScale` attributes and
   samples `atlas` at `uvOffset + localUV * uvScale`. One texture bind, one draw.

## Two render modes (`USE_INSTANCED_PLANES`)

Both share the same atlas and per-particle data.

- **Instanced planes (default).** One instanced draw of camera-facing quads,
  each scaled to its image's aspect ratio. Crisp (mipmapped, not point-size
  capped) and correct-aspect — best for a photo gallery. Billboarding happens in
  the vertex shader: the instance center is placed in view space, then the quad
  corners are offset in view space so it always faces the camera.
- **Points (`USE_INSTANCED_PLANES = false`).** The classic `THREE.Points` +
  `gl_PointSize = size * (300.0 / -mvPosition.z)` from the brief. Point sprites
  are always square and GPU-capped (~1024px), so the fragment shader remaps
  `gl_PointCoord` by the image aspect and discards the leftover margin (no crop,
  no stretch — just transparent letterboxing inside the square).

Videos are handled separately (not baked into the atlas): each is a single
billboarded plane wrapping a muted, looped, autoplaying `THREE.VideoTexture`.

## Interaction

- **OrbitControls** — drag to rotate, scroll to dolly, right-drag/two-finger to
  pan, `enableDamping` for inertia, sensible min/max zoom.
- **GSAP intro** — camera dollies in from far while sprites scale/fade up
  (`uReveal` 0→1).
- **Click-to-fly** — click a sprite and the camera eases to frame it. Picking is
  done in screen space (mode-agnostic) so it works for both Points and planes.
  Pass an `onSelect(media, index)` prop to hook into clicks (e.g. open a product,
  show details — this is where AESTHETIC recommendations could plug in later).
- **Idle drift** — after a few seconds of stillness the camera slowly auto-rotates;
  any input stops it immediately.

## Tuning

All knobs are named constants at the top of `ImageUniverse.tsx`:
`USE_INSTANCED_PLANES`, `BACKGROUND_COLOR`, `POSITION_SPREAD`, `SHELL_BIAS`,
`SIZE_BASE`, `SIZE_JITTER`, `POINT_SIZE_FACTOR`, `PLANE_WORLD_SCALE`, `DAMPING`,
`MIN_ZOOM` / `MAX_ZOOM`, `IDLE_DELAY_MS`, `IDLE_DRIFT_SPEED`, `FOV`,
`INTRO_DURATION`, `START_DISTANCE`.

## Notes / known limits

- Animated **GIFs** render their first frame only (they go through the atlas as
  still images). Use `.mp4`/`.webm` for motion.
- The atlas is capped at 4096px and cell size scales down as you add more images,
  so hundreds of images still fit in one texture (individual images just get
  lower-res as the count climbs).
- Everything (geometry, materials, textures, videos, listeners, RAF, GSAP tweens)
  is disposed on unmount, so switching folders / leaving `/loop` leaks nothing.
