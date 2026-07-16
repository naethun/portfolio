# Homepage three-rail design QA

## Evidence

- Source visual truth: `/var/folders/q8/h79pf6g12pn70zp359tblz840000gn/T/TemporaryItems/NSIRD_screencaptureui_uzHkG0/Screenshot 2026-07-15 at 4.05.43 PM.png`
- Approved layout mock: `/Users/naethun/Desktop/past/portfolio/.superpowers/brainstorm/72830-1784156985/content/layout-work-index-v4.html`
- Desktop implementation: `/private/tmp/homepage-three-rail-desktop-reconstructed.png`
- Mobile implementation: `/private/tmp/homepage-three-rail-mobile-cards-v2.png`
- Mobile work/status continuation: `/private/tmp/homepage-three-rail-mobile-work-v1.png`
- Full-view comparison input: `/private/tmp/homepage-three-rail-design-comparison.png`
- Focused right-rail evidence: `/private/tmp/homepage-three-rail-right-v1.png`
- Desktop viewport/state: 1440 × 900, `/`, work folder selected, no detail open.
- Mobile viewport/state: 390 × 844, `/`, work folder selected, no detail open.

The reference is an editorial hierarchy source rather than a pixel-identical content target. The implementation intentionally preserves the existing left identity/readme and Finder window while adapting the reference's age → roles → signals rhythm into the right rail.

## Full-view comparison

The combined comparison shows the intended focal order: the centered Finder/Mac window is primary, the preserved logo/readme column anchors the left, and the biography rail is a narrower supporting column. Browser geometry confirms the Finder midpoint is 720px on a 1440px viewport. The two outer tracks are both 274px wide.

The desktop page width is contained at 1440px with no horizontal overflow. The mobile page is contained at 390px and stacks left identity → Finder → status rail in the approved order.

## Focused fidelity review

### Fonts and typography

- The site retains its existing Helvetica Neue stack, which closely matches the reference's narrow modern grotesk tone.
- The right rail has a controlled hierarchy: age line, 14–15px role titles, quiet support copy, then the two large proof signals.
- `selected work` and `other work` are lowercase, low-contrast orientation cues without uppercase transforms or tracking-heavy styling.
- Mobile card metadata now stacks vertically, preserving full titles and dates instead of forcing cramped single-line competition.

### Spacing and layout rhythm

- Desktop grid tracks are balanced around a 780px Finder surface, with 32px gaps and aligned 32px top/bottom margins.
- Finder cards use equal 4:3 frames, consistent 10px radii, aligned captions, and even two-column gaps.
- Other-work rows use one consistent separator and spacing rhythm. Dates align right on wider panes and wrap below on mobile.
- The right rail uses spacing rather than divider labels to separate the age, role, and signal groups.

### Colors and visual tokens

- The implementation stays within the existing black, white, neutral-gray, and restrained macOS chrome palette.
- Borders and shadows remain quiet enough that the project imagery and biography hierarchy carry the page.
- Focus and hover states reuse the existing black/neutral system.

### Image quality and asset fidelity

- The existing `/logo.png` remains unchanged.
- Aesthetic, EnergeX AI, LightningATC, and Redacted CLI reuse their real existing source imagery.
- All four highlighted image boxes measure at a 1.333 width/height ratio and use `object-cover`.
- No placeholder art, generated substitute, custom SVG, or CSS illustration was introduced.

### Copy and content

- The rail begins with `i'm a 22 year old...` and contains no `currently` or `selected signals` heading.
- The three approved current roles and the `50M+` / `$350K+` signals appear in the requested order.
- The work index contains exactly four image highlights and four dated other-work rows. All eight items remain reachable.

### Interaction and accessibility

- Browser-tested one highlighted card and one other-work row through open and close of `CaseStudyDetail`.
- Browser-tested contact → work navigation.
- Browser-tested moodboard loading to its live canvas/video surface, then returned to work.
- Buttons retain semantic accessible names, images retain title-derived alt text, and visible focus styling remains global.
- Final browser console check returned no warnings or errors.

## Comparison history

### Iteration 1

- [P2] Highlight card titles and dates competed for the same narrow line at 390px.
  - Evidence: `/private/tmp/homepage-three-rail-mobile-v1.png` showed truncated `Aesthe...` and `En...` titles.
  - Fix: changed highlight metadata to a vertical base layout and an inline `sm` layout.
  - Post-fix evidence: `/private/tmp/homepage-three-rail-mobile-cards-v2.png`; browser metrics report `flex-direction: column` and equal 143px title/date widths for all four mobile cards.

- [P2] Above-the-fold highlighted images produced Next.js LCP console warnings.
  - Evidence: the first browser pass logged warnings for `/aedemo1.gif` and the LightningATC image.
  - Fix: set the four approved highlighted images to load eagerly.
  - Post-fix evidence: a fresh browser tab at 1440 × 900 returned an empty warning/error log.

## Findings

No actionable P0, P1, or P2 findings remain.

## Open questions

None.

## Implementation checklist

- [x] Existing top-left image remains unchanged.
- [x] Finder window is centered on desktop.
- [x] Right rail has the approved uninterrupted hierarchy.
- [x] Four highlighted works use compact 4:3 imagery.
- [x] Four remaining items use dated single-line/stacked rows.
- [x] New section labels are lowercase.
- [x] Desktop and mobile layouts have no horizontal overflow.
- [x] Primary work, detail, contact, and moodboard interactions remain functional.
- [x] Console warnings and errors are clear.

## Follow-up polish

No P3 follow-up is required for this pass.

final result: passed
