# Shoppable Image Universe — Design

_Date: 2026-07-01_
_Status: approved (design review with Nathan, 2026-07-01)_

Make curated images in the `/loop` 3D Image Universe **shoppable, powered by AESTHETIC**.
Clicking a shoppable image opens a breakdown view: the image sits on the left, and
"limbs" branch out to the right, each pointing from a detected clothing item to a
shoppable product card.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Result freshness | **Precomputed manifest** — a script runs the real AESTHETIC pipeline offline and bakes results into JSON in this repo. No runtime API calls. |
| Breakdown granularity | **Per-item bounds via SAM3** (full pipeline). Each detected garment = one limb = one product card. |
| Product card action | **Open merchant product page in a new tab.** |
| Surface | **`/loop` only.** Home moodboard stays passive. |
| Interaction | **Mouse click only** for now. MediaPipe gesture actuation is explicitly out of scope (future work via the same `onSelect` path). |
| Backend stage | **dev** stage of `aesthetic-serverless-apis` (isolated for testing; base URL committed in that repo). Switchable via env. |
| Image hosting for ingestion | The deployed Vercel portfolio serves the jpgs; production domain to be looked up via the Vercel integration when first running the script. |
| First image | `public/portfolio/loop-imgs/c9c4f69557d717f8a59825628307b4a2.jpg` |

## Non-goals

- No changes to any AESTHETIC repo (the existing public API is sufficient).
- No changes to `components/ImageUniverse/ImageUniverse.tsx` (its `onSelect(media, index)`
  hook already fires on click-to-fly and is the designated integration point).
- No live/lazy fetching, no checkout, no cart — cards link out to merchants.
- No gesture-based selection.

## Architecture & data flow

```
OFFLINE (re-run to scale)
  scripts/shoppable-images.json            ← curated list of filenames
  scripts/generate-shoppable-manifest.mjs
    ├─ for each filename:
    │    POST {AESTHETIC_API_BASE}/save-search-query
    │         { searchQuery: "https://<portfolio-domain>/portfolio/loop-imgs/<file>", userId, source }
    │         header: x-api-key: {AESTHETIC_API_KEY}
    │         → returns shortCode  (idempotent: original_url is UNIQUE server-side,
    │           resubmitting the same URL resumes/returns the cached search)
    │    poll GET {AESTHETIC_API_BASE}/mobile/outfit/{shortCode}
    │         until bounds + recommendations present (interval ~10s, timeout 5 min)
    │    normalize bound coords to 0–1 using the local jpg's dimensions
    │    download top product image per item → public/portfolio/shoppable/thumbs/
    └─ write lib/shoppable/manifest.json

RUNTIME (/loop, fully static)
  app/loop/page.tsx        server: getUniverseMedia() + getShoppable() → LoopClient
  app/loop/LoopClient.tsx  onSelect → filename in manifest? → <ShoppableBreakdown/>
```

### How the AESTHETIC pipeline ingests a bare jpg (verified in code)

`save-search-query` creates the `searches` row and invokes the decision gateway; a
non-Instagram URL routes to the generic handler, whose media-type fast path detects the
`.jpg` extension and adopts the URL directly as the image (Firecrawl is never invoked
for direct images). It uploads to S3 and enqueues the image processor, which runs SAM3
bounds detection and per-bound SERP/Lens enrichment. Results land in the
`mobile_content_*` read models served by `GET /mobile/outfit/{shortCode}`.

## Components

### 1. `scripts/generate-shoppable-manifest.mjs`

- **Input:** `scripts/shoppable-images.json` — `["c9c4f69557d717f8a59825628307b4a2.jpg"]`.
  Scaling = append a filename, re-run the script.
- **Env (required, script fails fast if missing):**
  - `AESTHETIC_API_BASE` — e.g. the dev API Gateway invoke URL
  - `AESTHETIC_API_KEY` — API Gateway key (`x-api-key` header)
  - `PORTFOLIO_BASE_URL` — deployed portfolio origin the pipeline fetches images from
- **Per image:** submit → poll → transform → thumbnail-cache. Sequential (small N,
  avoids hammering SERP/Firecrawl; matches known-safe concurrency guidance).
- **Coordinate handling:** the outfit endpoint returns pixel-derived bound coordinates;
  the script normalizes to 0–1 using the **local file's** width/height (same jpg the
  pipeline ingested). Dependency: `image-size` (devDependency only — never shipped to
  the client bundle).
- **Products per item:** keep top 5 in the manifest (UI shows the first); download the
  **first** product's image to `public/portfolio/shoppable/thumbs/<boundId>.jpg` and
  record both `image` (remote) and `localImage` (cached) — UI prefers `localImage`.
- **Merge semantics:** the script processes the **full list every run** and rewrites
  `manifest.json` from scratch. This is cheap (the backend caches by URL) and means the
  list file is the single source of truth — no stale entries, no partial-merge logic.
- **Failure handling:** per-image timeout (5 min), 0 bounds, or 0 recommendations →
  log a clear warning and **omit that image** from the manifest. Never write a partial
  or broken entry. Script exit code 0 if at least one image succeeded.

### 2. Manifest — `lib/shoppable/manifest.json` (+ `lib/shoppable/types.ts`)

Keyed by filename to join with `UniverseMedia.filename`:

```jsonc
{
  "c9c4f69557d717f8a59825628307b4a2.jpg": {
    "shortCode": "abc123",
    "generatedAt": "2026-07-01T00:00:00Z",
    "items": [
      {
        "boundId": "…",
        "label": "knee high boots",        // productInfo.label
        "category": "boots",               // productInfo.category
        "anchor": { "x": 0.62, "y": 0.71 },   // normalized bound center
        "box": { "x": 0.48, "y": 0.42, "w": 0.34, "h": 0.55 }, // normalized bbox
        "products": [
          {
            "name": "Studded leather over-knee boot",
            "brand": "…",
            "price": 240, "currency": "USD",
            "url": "https://merchant.com/…",     // opens in new tab
            "image": "https://cdn.merchant.com/…",
            "localImage": "/portfolio/shoppable/thumbs/<boundId>.jpg",
            "merchant": "merchant.com"
          }
          // …up to 5
        ]
      }
    ]
  }
}
```

`lib/shoppable/getShoppable.ts` — server-side loader (same pattern as
`getUniverseMedia`): imports/reads the JSON, validates shape lightly, returns
`Record<filename, ShoppableEntry>`; returns `{}` if the manifest is missing so `/loop`
never breaks.

### 3. `components/ShoppableBreakdown/` (new)

DOM overlay rendered by `LoopClient` above the WebGL canvas. Files:
`ShoppableBreakdown.tsx` (layout + open/close), `Limbs.tsx` (SVG connector layer),
`ProductCard.tsx`.

- **Open transition:** the existing camera fly-to plays untouched; the overlay fades in
  (~300ms) over it. Universe keeps rendering, dimmed behind a translucent near-white
  scrim consistent with the `#f4f2ee` gallery background.
- **Left pane (~42% width):** the selected image (`object-fit: contain`). Anchor dots
  at each item's normalized `anchor`, positioned against the **rendered image content
  box** (account for contain letterboxing). Hovering a product card traces that item's
  `box` outline on the image (shaped highlight — no floating label chips).
- **Right pane:** one `ProductCard` per item — thumbnail (`localImage` with `image`
  fallback), brand, name, price + currency, merchant domain. Entire card is an
  `<a target="_blank" rel="noopener noreferrer">`.
- **Limbs:** one full-overlay `<svg>`; a cubic bezier from each anchor dot to its
  card's left edge; staggered stroke draw-in (stroke-dashoffset), recomputed on
  resize via refs + `ResizeObserver`.
- **Styling:** mono uppercase micro-labels, existing neutral palette. No new fonts or
  colors. Small "POWERED BY AESTHETIC" mark in the overlay header.
- **Close:** ✕ button, `Esc`, or backdrop click. Overlay unmounts; universe untouched
  (camera stays where the fly-to left it, same as non-shoppable clicks today).
- **Responsive (< ~768px):** single column — image on top, cards stacked below,
  limbs omitted (anchor dots remain).

### 4. Wiring (`app/loop/`)

- `page.tsx`: `const shoppable = getShoppable();` → `<LoopClient media={…} shoppable={…} />`.
- `LoopClient.tsx`:
  - `const [selected, setSelected] = useState<UniverseMedia | null>(null);`
  - `onSelect={(m) => shoppable[m.filename] && setSelected(m)}` passed to `<ImageUniverse>`.
  - Renders `<ShoppableBreakdown media={selected} entry={shoppable[selected.filename]} …/>`
    when open; overlay captures all pointer events; the G/H/D keyboard shortcuts and
    gesture-driven formation changes are suppressed while open.
  - Non-shoppable images: identical behavior to today (fly-to only).

## Error handling summary

| Failure | Behavior |
|---|---|
| Script: poll timeout / 0 bounds / 0 recs | Warn + omit image from manifest; other images unaffected |
| Runtime: manifest missing/empty | `/loop` works exactly as today (all images non-shoppable) |
| Runtime: product thumb 404 | `localImage` → `image` remote fallback → text-only card |
| Overlay open + resize | Limbs recomputed via ResizeObserver |

## Verification

1. **Data:** run the script against the first image; inspect `manifest.json` (expect
   items like boots / cardigan / top / tights / sunglasses); if results are thin, check
   the dev Supabase read models (`mobile_content_bounds`, `mobile_bound_recommendations`)
   before touching UI.
2. **Static checks:** `npx tsc --noEmit`, `npx eslint`, `npm run build`.
3. **Live:** dev server → `/loop` → click the shoppable image → overlay, anchors, limb
   draw-in, card hover-highlight, merchant link opens in new tab; `Esc`/✕/backdrop
   close; a non-shoppable image still just flies-to; narrow viewport stacks correctly.

## Known risks

- **Per-bound SERP quality is uneven** (Lens can struggle on isolated crops). The
  curated-list approach is the mitigation: only images that demo well stay in the list.
- Merchant links/images rot over time → thumbnails cached locally; re-run the script to
  refresh stale entries.
- The first script run requires the jpg to be live on the deployed portfolio **before**
  submission (it's committed under `public/`, so any current deployment already serves it).

## Future hooks (explicitly deferred)

- Gesture-based selection (MediaPipe) through the same `onSelect` path.
- Multiple products per limb (manifest already carries 5).
- Home moodboard shoppability.
