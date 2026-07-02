# Shoppable Image Universe — Handoff

_Last updated: 2026-07-02_

Curated images in the `/loop` 3D Image Universe are now **shoppable, powered by AESTHETIC**.
Clicking a shoppable image opens a breakdown overlay: the image sits centered, its detected
garments carry AESTHETIC's mask-glow "shine," and **limbs branch radially outward** from each
item to a product card you can click through to the merchant.

This builds on the base universe documented in [`image-universe-handoff.md`](./image-universe-handoff.md)
and wires into the `onSelect(media, index)` hook that doc flagged as the AESTHETIC integration point.

- **Spec:** [`docs/superpowers/specs/2026-07-01-shoppable-image-universe-design.md`](./superpowers/specs/2026-07-01-shoppable-image-universe-design.md) (approved, with a post-launch iteration addendum)
- **Plan:** [`docs/superpowers/plans/2026-07-01-shoppable-image-universe.md`](./superpowers/plans/2026-07-01-shoppable-image-universe.md) (some inline code superseded by live fixes — repo files are authoritative)

---

## 1. How it works (two halves)

**Offline (data):** a script runs each curated image through the real AESTHETIC discovery
pipeline and bakes the results — detected items, product recommendations, cached thumbnails,
and SAM mask cutouts — into a static JSON manifest committed to this repo.

**Runtime (`/loop`, fully static):** the page loads the manifest server-side. Clicking an image
whose filename is in the manifest opens the `ShoppableBreakdown` DOM overlay. **No runtime API
calls, no keys, no latency** — every product came from your actual pipeline at build-prep time.

```
OFFLINE (re-run to scale)
  scripts/shoppable-images.json                 ← curated filename list (source of truth)
  scripts/generate-shoppable-manifest.mjs
    ├─ POST {AESTHETIC_API_BASE}/save-search-query  { searchQuery:<public img url>, userId, source }
    │     header x-api-key                             → shortCode  (idempotent: URL is UNIQUE server-side)
    ├─ poll GET /mobile/outfit/{shortCode}             until bounds+recs land (10s interval, 5min timeout)
    ├─ normalizeBox: rectify + normalize bound coords to 0–1
    ├─ download top product thumb  → public/portfolio/shoppable/thumbs/<boundId>.jpg
    ├─ download SAM mask cutout    → public/portfolio/shoppable/masks/<boundId>.png
    └─ rewrite lib/shoppable/manifest.json from scratch

RUNTIME (/loop)
  app/loop/page.tsx        getUniverseMedia() + getShoppable() → LoopClient
  app/loop/LoopClient.tsx  onSelect → filename in manifest? → <ShoppableBreakdown/>
```

---

## 2. Where it lives

| File | Role |
|------|------|
| `scripts/shoppable-images.json` | **The curated list.** `["c9c4f69557d717f8a59825628307b4a2.jpg"]` today. Append a filename → re-run → it's shoppable. |
| `scripts/generate-shoppable-manifest.mjs` | The generator: submit → poll → transform → cache thumbs+masks → rewrite manifest. Fails fast without env vars; skips images that time out or yield nothing usable (never writes a broken entry). |
| `scripts/lib/manifest-transform.mjs` | **Pure, dependency-free transforms** (unit-tested): `normalizeBox`, `transformProduct`, `buildManifestEntry`. Maps the `/mobile/outfit` payload → manifest shape. |
| `scripts/lib/manifest-transform.test.mjs` | `node --test` suite (9 tests). Run via `npm run shoppable:test`. |
| `lib/shoppable/types.ts` | `ShoppableManifest / ShoppableEntry / ShoppableItem / ShoppableProduct`. All coords normalized 0–1. |
| `lib/shoppable/manifest.json` | **The baked data**, keyed by `UniverseMedia.filename`. Committed. |
| `lib/shoppable/getShoppable.ts` | Server-side loader (companion to `getUniverseMedia`): static-imports the JSON, filters malformed/empty entries, returns `{}` if missing so `/loop` never breaks. |
| `components/ShoppableBreakdown/ShoppableBreakdown.tsx` | **The overlay.** Centered image, radial card placement, limb geometry, measurement, open/close. |
| `components/ShoppableBreakdown/MaskGlow.tsx` | The AESTHETIC "shine": canvas over the image content box painting each SAM mask cutout with a sweeping metallic glow (`mix-blend-mode: plus-lighter`). |
| `components/ShoppableBreakdown/Limbs.tsx` | SVG connector layer: edge-aware bezier per item, staggered stroke draw-in, hover dimming. |
| `components/ShoppableBreakdown/ProductCard.tsx` | One card per item — thumbnail (local→remote→text fallback), brand, name, price, merchant; whole card links out (`target=_blank rel=noopener noreferrer`). |
| `components/ShoppableBreakdown/geometry.ts` | `fitContain`, `rayExitDistance`, `limbPath`, `Rect`, `LimbEdge`. |
| `public/portfolio/shoppable/thumbs/` | Locally cached product images (merchant CDNs rot). |
| `public/portfolio/shoppable/masks/` | Locally cached SAM mask cutout PNGs for the glow. |
| `app/loop/page.tsx` | Loads the manifest, passes it to `LoopClient`. |
| `app/loop/LoopClient.tsx` | Owns `selected` state, renders the overlay, suppresses G/H/F/D shortcuts + gestures while open, and disables click-to-fly (see §5). |
| `components/ImageUniverse/ImageUniverse.tsx` | **One additive change:** optional `shouldFlyTo?(media,index):boolean` prop (defaults to fly). Everything else untouched. |

`package.json`: added `shoppable:test`, `shoppable:generate`, and `image-size` (devDependency, used only by the generator — never in the client bundle).

---

## 3. The overlay (runtime behavior)

Opened by `LoopClient` above the WebGL canvas when a manifest-listed image is clicked. The
universe keeps rendering behind a translucent `rgba(244,242,238,0.88)` gallery scrim.

- **Centered composition.** The image sits centered in the viewport (desktop) / on top (mobile).
- **Mask-glow shine** (`MaskGlow.tsx`, ported from the creators `MaskGlowCanvas`, scan variant):
  a canvas sized to the rendered image content box paints each item's SAM mask cutout with a
  soft ellipse sweeping top→bottom, metallic gradient, `plus-lighter` blend. Idle masks sweep for
  3s of a 7s phase-staggered cycle then rest; hovering a product card isolates that item with a
  uniform glow. Honors `prefers-reduced-motion`.
- **Radial limbs.** Each card is pushed outward along the ray from the image center through its
  item's anchor — glasses (top-left of frame) branch out top-left and off the image; boots
  (low-right) exit toward the bottom-right. Limbs connect to whichever card edge faces the image.
  Cards clamp to the viewport, de-overlap vertically, and slide off the image if clamping would
  park them on top of it.
- **Cards** show the top recommendation; the manifest carries up to 5 per item for later.
- **Close:** ✕ button, `Esc`, or backdrop click. Small "POWERED BY AESTHETIC" mark in the header.
- **Mobile (< 768px):** image on top, cards stacked below, limbs omitted (glow still runs).

Positioning math lives in one `measure()` in `ShoppableBreakdown.tsx`: anchors + glow content
box are image-pane-relative; card positions + limb endpoints are overlay-root-relative. A
`ResizeObserver` re-measures on resize; a layout signature guards against re-measure loops.

---

## 4. Scaling to more images

1. Get the image live at a **public URL** the pipeline can fetch (see §6 for how the demo image is hosted).
2. Add its filename to `scripts/shoppable-images.json`.
3. Run the generator (§6). It rewrites the whole manifest — idempotent, the backend caches by URL.
4. Commit the updated `manifest.json` + new files under `public/portfolio/shoppable/{thumbs,masks}/`.

Images that time out, detect no bounds, or yield no recommendations are **skipped with a warning** —
they just won't be shoppable. Curate the list to whatever demos well.

---

## 5. The click-to-fly / camera-lock change

The base universe's click-to-fly set the OrbitControls **target** onto the clicked image, which
pinned it centered and made everything orbit around it — you couldn't "unfocus." This is now
disabled for **every** image: `LoopClient` passes `shouldFlyTo={() => false}`.

- Clicking an image no longer moves or re-centers the camera.
- Shoppable images still open the overlay (via `onSelect`, a separate path).
- Non-shoppable clicks are camera no-ops. Free-orbit around the scene center is preserved.

To restore focus-on-click, change `shouldFlyTo` in `app/loop/LoopClient.tsx` (return `true`, or a
predicate). The `ImageUniverse` default is still "fly," so other consumers (home moodboard) are
unaffected.

---

## 6. Running the generator (ops)

Env (all required; the script fails fast without them):

```bash
AESTHETIC_API_BASE="https://fw0gm3j6hf.execute-api.us-east-1.amazonaws.com/dev"   # dev stage
AESTHETIC_API_KEY="<x-api-key>"          # dev API Gateway key, see below
PORTFOLIO_BASE_URL="<public origin serving the jpgs>"
npm run shoppable:generate
```

- **API key:** `aws apigateway get-api-keys --name-query "aesthetic-serverless-apis-dev-key" --include-values --profile aesthetic --query 'items[0].value' --output text` — pipe it straight into the command, don't echo it to a file.
- **Image hosting for the demo image:** the deployed portfolio's production domain wasn't findable
  under the Aesthetic Vercel team, so the one demo image was uploaded to the dev S3 bucket under a
  publicly-readable prefix: `s3://aesthetic-search-images-dev/scraped/portfolio/loop-imgs/…` (the
  bucket policy exposes `scraped/*`, `bounds/*`, etc.). Hence `PORTFOLIO_BASE_URL=https://aesthetic-search-images-dev.s3.amazonaws.com/scraped`.
  For future images, either deploy the portfolio and point `PORTFOLIO_BASE_URL` at its domain, or
  re-use the S3 `scraped/` prefix.
- **Stage:** dev. Prod's invoke URL isn't committed in the backend repo; switch by changing `AESTHETIC_API_BASE` + key.

The demo search is `shortCode tzUIKArGJt` in the **dev** Supabase project (`aesthetic-supabase-dev` MCP).

---

## 7. Known issues / next steps

- **Per-bound SERP quality is uneven** (Google Lens struggles on isolated garment crops). On this
  image SAM detected 4 items but only **Shoes** and **Eyewear** got usable recommendations;
  **Outerwear** and **Bottoms** returned 0 (the backend category filter rejected every Lens match).
  This is a backend recommendation-quality issue, out of scope for the portfolio. The curated-list
  approach is the mitigation — keep images that demo well.
- **Manual curation was applied to the demo data:** 5 mis-categorized recommendation rows (a
  cardigan fronting Eyewear, hair barrettes, an auction lot, a costume set, a handbag) were deleted
  from the dev DB for `shortCode tzUIKArGJt` so the cards lead with real matches. Re-running the
  generator regenerates from whatever's in the pipeline, so thin/odd results can reappear if the
  backend re-enriches those bounds.
- **Deferred UI polish:** limbs can occasionally cross if item order doesn't match top-to-bottom
  card order (radial placement mostly avoids it); mobile below-fold backdrop-click doesn't close
  (Esc/✕ do); `formatPrice` hardcodes `$` for malformed non-USD currencies (never hit by current data).
- **Multiple products per limb:** the manifest already carries up to 5 per item — the UI shows the
  first. A carousel / "more like this" is a natural next step.
- **Gesture actuation:** clicking is mouse-only for now. The same `onSelect` path is where MediaPipe
  gesture selection would wire in later (see the base universe handoff).
- **Home moodboard** stays passive — shoppability is `/loop` only by design.

---

## 8. Verification status

| Area | Status |
|------|--------|
| `npm run shoppable:test` (transform units) | ✅ 9/9 passing |
| `tsc --noEmit`, `eslint`, `npm run build` | ✅ clean; `/` and `/loop` prerender static |
| Overlay: open / ✕ / Esc / backdrop / reopen | ✅ verified live (headless preview) |
| Mask-glow sweep animates; hover → uniform isolate + limb dim | ✅ verified (sampled canvas pixels over time) |
| Radial card placement (glasses top-left off-image, boots bottom-right), letterbox math | ✅ verified live |
| Mobile stacked layout, limbs hidden, glow present | ✅ verified at 375px |
| No camera lock on click (all images) | ✅ verified: 4,788-click sweep, every image logged fly-to suppressed |
| Real manifest from dev pipeline (Shoes + Eyewear, 5 products each, thumbs+masks cached) | ✅ generated |

---

## 9. Run / verify

```bash
cd ~/Desktop/past/portfolio
npm run dev                 # http://localhost:3000/loop
npm run shoppable:test      # transform unit tests
npm run build               # production build (static prerender)
npx tsc --noEmit
npx eslint app/loop components/ShoppableBreakdown components/ImageUniverse
```

On `/loop`: click the girl-on-bollard image → the breakdown opens; hover a card to shine its
garment and trace its limb; click a card to open the merchant; ✕/Esc/backdrop to close. Clicking
any image no longer locks the camera onto it.

> All work is **uncommitted** in the working tree (per preference — you commit). New dirs:
> `lib/shoppable/`, `components/ShoppableBreakdown/`, `scripts/` + `scripts/lib/`,
> `public/portfolio/shoppable/`, plus the two docs and small edits to `app/loop/*`,
> `components/ImageUniverse/ImageUniverse.tsx`, and `package.json`.
