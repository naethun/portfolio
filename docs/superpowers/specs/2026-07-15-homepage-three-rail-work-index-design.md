# Homepage three-rail work index design

## Goal

Restructure the homepage around the visual rhythm of the supplied portfolio reference without copying its identity. Preserve the current left-side image and readme content, keep the Finder-style Mac window as the centered focal point, and add a narrow biographical status rail on the right.

The work tab inside the Mac window will distinguish four highlighted projects through imagery while presenting the rest of the portfolio as a compact dated index.

## Desktop composition

The homepage becomes a three-part layout:

1. The existing left identity column stays visually and functionally intact. The current `/logo.png` image remains in the top-left corner with its existing click behavior, source, dimensions, and content. `ReadmePreview` remains below it.
2. The Finder window occupies the center column and remains the main visual anchor. The outer columns should use balanced widths so the window reads as centered in the viewport rather than merely centered in the remaining space.
3. A new status rail sits on the right. Its typography follows the site's existing Helvetica Neue stack, black-on-white palette, and restrained border language.

The desktop layout should use a centered max-width container with equal or visually balanced outer rails and a flexible middle column. The Mac window keeps its existing title bar, sidebar, folder interactions, and detail overlay behavior.

## Visual hierarchy and polish

The composition must feel deliberately art-directed rather than like three unrelated columns placed beside each other.

The hierarchy is:

1. The centered Mac window is the primary focal point.
2. The existing top-left image anchors the identity of the page without competing with the window.
3. The age line and current-role blocks establish the right rail's reading path.
4. The two proof signals close the rail with emphasis but remain subordinate to the centered work surface.

The three columns should share intentional top and bottom relationships. Use optical centering where strict mathematical centering looks unbalanced, but keep the middle window centered in the viewport. Align major content starts where doing so strengthens the composition, and use a consistent vertical spacing rhythm within each rail.

Typography should use a limited, deliberate scale. The age line is the opening statement on the right; role titles are the next level; descriptions and metadata are quieter; the proof numbers are visually strong closing beats. Avoid arbitrary font-size changes, excessive tracking, all-caps labels, or decorative treatments that do not reinforce this order.

Within the Finder window, highlighted cards must have consistent 4:3 crops, equal dimensions, aligned metadata, and balanced whitespace. The `selected work` and `other work` labels should be quiet lowercase orientation cues. Other-work separators, dates, hover states, and focus states should feel like part of the same Finder system rather than a second visual language.

Polish must be checked at the rendered desktop and mobile sizes. Fix awkward empty space, crowding, uneven gaps, accidental misalignment, clipped copy, inconsistent corner radii, weak contrast, or elements that compete for attention. A green build alone is not sufficient acceptance for this change.

## Right status rail

The content is one uninterrupted vertical stack:

- `i'm a 22 year old...`
- `[01] Founding Engineer @ Aesthetic`
- `[02] Head of Growth @ storytolds ✸`
- `[03] Design + Interaction + CS @ UCSD`
- `50M+` with a short organic-social-views description
- `$350K+` with a short user-profit-by-age-17 description

There is no `currently` label, no divider below the age line, and no `selected signals` label. The age line, role blocks, and signals establish hierarchy through size, weight, and spacing only.

Role descriptions should use the supplied factual context:

- Aesthetic: changing how influencers monetize content; 100k+ MAU, $250k+ GMV, and 160k+ on Instagram.
- storytolds: creative studio work spanning music artists, startups, and fashion brands, with representative clients from the supplied list.
- UCSD: full-ride study in Design and Interaction plus Computer Science.

The rail may end with restrained location/year metadata if it fits without competing with the main content.

## Work tab

The work tab partitions the existing `WorkItem[]` into highlighted and secondary items while preserving the current item identities and click-through detail behavior.

### Highlighted work

Only these four items render as image cards:

- Aesthetic (`role-0`)
- EnergeX AI (`role-1`)
- LightningATC (`role-6`)
- Redacted CLI (`project-9`)

The cards appear in a two-column grid within the Finder content area. Each image uses a true 4:3 slot with `object-cover`; card widths should stay compact rather than stretching across the content pane. Each card includes its title and abbreviated date beneath the image. The entire card remains a button that opens the existing `CaseStudyDetail` surface.

### Other work

All remaining items appear under the lowercase label `other work` as single-line rows:

- `Software Engineer @ Daedastream` — `Jun 2025 - Dec 2025`
- `Data Engineer @ Viet Voices` — `Jan 2024 - Jul 2025`
- `Lead Developer & Instructor @ Code Ninjas` — `Dec 2022 - Sep 2025`
- `Chrome Extension @ Telios AIO` — `Dec 2022 - Apr 2023`

Each row places the role/title and workplace on the left and the date on the right. Long left-side text truncates safely before colliding with the date. The full row remains keyboard-accessible and opens the same detail surface as the current cards.

## Label and typography rule

All newly introduced interface labels are lowercase in both source text and rendered styling. This includes `selected work` and `other work`. Do not apply uppercase transforms or exaggerated letter spacing to these labels.

Proper names, role titles, dates, and metrics keep their normal capitalization. Existing Finder chrome can retain its current styling unless directly touched by this change.

## Responsive behavior

- Wide desktop: render the full left / centered Mac / right-rail composition.
- Narrow desktop and tablet: allow the outer rails to contract before the center window; do not let either rail force the Finder window off-center or create horizontal page overflow.
- Below the three-column breakpoint: stack the existing left content, Finder window, and status rail in that order. The Finder sidebar keeps its current horizontal mobile treatment.
- Highlighted work stays two columns where card text remains readable and collapses to one column only when the Finder content pane becomes too narrow for compact 4:3 cards.
- Other-work rows keep the date visible; on very narrow panes they may wrap into a two-line layout rather than overlap.

## Component boundaries and data flow

- `HomeClient` owns the page-level three-part composition and supplies the status rail beside the existing Finder state.
- A focused status-rail component owns biography and metric presentation so `HomeClient` does not become a large block of static copy.
- `WorkGrid` owns the highlighted/secondary split and continues to receive the existing `items` and `onSelect` contract.
- A small pure helper identifies highlighted items by stable `workItemId`, partitions the list, and derives row display metadata. This keeps ordering and classification testable without a browser.
- `CaseStudyDetail`, folder selection, moodboard behavior, contact behavior, and the current active-item state remain unchanged.

## Accessibility and interaction

- Image cards and other-work rows use semantic buttons with useful accessible labels.
- Existing visible focus styles remain available.
- Images retain meaningful alt text derived from the work title.
- The layout must not introduce horizontal page scrolling at the supported desktop and mobile viewports.
- Reduced-motion behavior and the existing detail-overlay transition remain unchanged.

## Verification

Implementation will follow test-driven development:

1. Add focused failing tests for highlighted-item classification, stable ordering, exclusion from the other-work list, and row metadata.
2. Implement the partition helper and mixed work-index rendering.
3. Run the focused Node tests, TypeScript, lint, and production build.
4. Verify the real homepage in the browser at desktop and 390 × 844 mobile sizes.
5. Confirm the left image remains unchanged, the Mac window is visually centered on desktop, labels render lowercase, highlighted images are 4:3, all eight work items remain reachable, and the page has no horizontal overflow or console errors.
6. Perform a visual hierarchy pass at each target viewport, checking focal order, optical balance, typography scale, spacing rhythm, card consistency, row alignment, and interaction polish before declaring the work complete.

## Out of scope

- Rewriting case-study content
- Changing the moodboard or contact tabs
- Replacing existing project imagery
- Editing `/logo.png` or the existing local change to `/aedemo1.gif`
- Adding new routes, animations, or data sources
