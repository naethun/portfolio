# Homepage Three-Rail Work Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved three-part homepage with the existing identity image on the left, the Finder window centered, a polished status rail on the right, and a mixed image/row work index inside the work tab.

**Architecture:** Keep `HomeClient` as the page-state owner, extract the static biography into a focused `StatusRail`, and let `WorkGrid` partition its existing `WorkItem[]` through a small pure helper. Preserve folder switching and `CaseStudyDetail`; change only presentation and item classification.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, `next/image`, Node's built-in test runner.

## Global Constraints

- Preserve `/logo.png`, its top-left placement, and its existing work-tab click behavior.
- Preserve the existing uncommitted resume-link change in `lib/data.ts`; do not stage or modify that file.
- Keep the Finder/Mac window visually centered on wide desktop through balanced outer grid tracks.
- New section labels are lowercase source text with no uppercase transform and no exaggerated tracking.
- Only Aesthetic, EnergeX AI, LightningATC, and Redacted CLI receive image cards.
- Highlight images use true 4:3 slots with `object-cover`.
- All remaining work stays reachable through dated, keyboard-accessible rows.
- Preserve moodboard, contact, folder selection, active-detail overlay, Escape close, focus styling, and reduced-motion behavior.
- Verify at desktop and 390 × 844 mobile; a successful build without visual QA is insufficient.

---

### Task 1: Add the tested work-index model

**Files:**
- Create: `components/Work/workIndex.test.mjs`
- Create: `components/Work/workIndex.mjs`

**Interfaces:**
- Consumes: existing `{ kind: 'role' | 'project', data }` work-item shape.
- Produces: `workItemId(item)`, `partitionWorkItems(items)`, and `getWorkRowMeta(item)`.

- [ ] **Step 1: Write the failing classification tests**

Create `components/Work/workIndex.test.mjs` with fixtures representing the eight current items and these assertions:

```js
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWorkRowMeta,
  partitionWorkItems,
  workItemId,
} from './workIndex.mjs';

const role = (id, role, company, date) => ({
  kind: 'role',
  data: { id, role, company, date },
});

const project = (id, title, category, date) => ({
  kind: 'project',
  data: { id, title, category, date },
});

const items = [
  role(0, 'Founding Engineer', 'Aesthetic', 'December 2025 - Present'),
  role(1, 'Software Engineer', 'EnergeX AI', 'September 2025 - April 2026'),
  role(2, 'Software Engineer', 'Daedastream', 'June 2025 - December 2025'),
  role(4, 'Data Engineer', 'Viet Voices', 'Jan 2024 - Jul 2025'),
  role(5, 'Lead Developer & Instructor', 'Code Ninjas', 'Dec 2022 - Sept 2025'),
  role(6, 'Software Developer', 'LightningATC', 'May 2022 - Jun 2023'),
  project(9, 'Redacted CLI', 'CLI Software', 'July 2022 - Jan 2023'),
  project(1, 'Telios AIO', 'Chrome Extension', 'Dec 2022 - April 2023'),
];

test('workItemId produces the stable kind-id identity', () => {
  assert.equal(workItemId(items[0]), 'role-0');
  assert.equal(workItemId(items[6]), 'project-9');
});

test('partitionWorkItems selects exactly the four approved highlights in source order', () => {
  const { highlights } = partitionWorkItems(items);
  assert.deepEqual(highlights.map(workItemId), [
    'role-0',
    'role-1',
    'role-6',
    'project-9',
  ]);
});

test('partitionWorkItems keeps every non-highlighted item in source order', () => {
  const { other } = partitionWorkItems(items);
  assert.deepEqual(other.map(workItemId), [
    'role-2',
    'role-4',
    'role-5',
    'project-1',
  ]);
});

test('getWorkRowMeta formats roles and projects without losing dates', () => {
  assert.deepEqual(getWorkRowMeta(items[2]), {
    label: 'Software Engineer @ Daedastream',
    date: 'June 2025 - December 2025',
  });
  assert.deepEqual(getWorkRowMeta(items[7]), {
    label: 'Chrome Extension @ Telios AIO',
    date: 'Dec 2022 - April 2023',
  });
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test components/Work/workIndex.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `workIndex.mjs`.

- [ ] **Step 3: Implement the minimal pure helper**

Create `components/Work/workIndex.mjs`:

```js
const HIGHLIGHT_IDS = new Set(['role-0', 'role-1', 'role-6', 'project-9']);

export function workItemId(item) {
  return `${item.kind}-${item.data.id}`;
}

export function partitionWorkItems(items) {
  const highlights = [];
  const other = [];

  for (const item of items) {
    (HIGHLIGHT_IDS.has(workItemId(item)) ? highlights : other).push(item);
  }

  return { highlights, other };
}

export function getWorkRowMeta(item) {
  if (item.kind === 'role') {
    return {
      label: `${item.data.role} @ ${item.data.company}`,
      date: item.data.date,
    };
  }

  return {
    label: `${item.data.category} @ ${item.data.title}`,
    date: item.data.date,
  };
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run: `node --test components/Work/workIndex.test.mjs`

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add components/Work/workIndex.mjs components/Work/workIndex.test.mjs
git commit -m "test: define highlighted portfolio work"
```

---

### Task 2: Render compact highlighted cards and other-work rows

**Files:**
- Modify: `components/Work/WorkCard.tsx`
- Modify: `components/Work/WorkGrid.tsx`
- Create: `components/Work/WorkRow.tsx`

**Interfaces:**
- Consumes: `partitionWorkItems(items)`, `getWorkRowMeta(item)`, `workItemId(item)` from Task 1.
- Produces: the existing `WorkGrid({ items, onSelect })` contract and the same work-item IDs passed to `onSelect`.

- [ ] **Step 1: Re-run the model tests before integration**

Run: `node --test components/Work/workIndex.test.mjs`

Expected: 4 tests pass.

- [ ] **Step 2: Convert `WorkCard` into the approved 4:3 highlight**

Keep its existing button and `next/image` behavior, but derive `{ title, image, date }` and render:

```tsx
<button
  type="button"
  onClick={onClick}
  className="group min-w-0 text-left"
  aria-label={`Open ${title}`}
>
  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-neutral-100 ring-1 ring-black/[0.08] transition duration-300 group-hover:ring-black/25 group-focus-visible:ring-black/40">
    <Image
      src={image}
      alt={title}
      fill
      sizes="(max-width: 767px) 42vw, 280px"
      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
    />
  </div>
  <div className="mt-2 flex min-w-0 items-baseline justify-between gap-3">
    <p className="truncate text-[13px] font-medium tracking-[-0.02em] text-neutral-900 md:text-sm">
      {title}
    </p>
    <p className="shrink-0 text-[10px] text-neutral-500 md:text-[11px]">
      {date}
    </p>
  </div>
</button>
```

Remove the tint rotation, generic rounded outer card, decorative arrow SVG, category subtitle, and large card padding.

- [ ] **Step 3: Add the accessible row component**

Create `WorkRow.tsx` that calls `getWorkRowMeta(item)` and renders a full-width button:

```tsx
export default function WorkRow({ item, onClick }: WorkRowProps) {
  const { label, date } = getWorkRowMeta(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full min-w-0 flex-col gap-1 border-t border-black/10 py-3 text-left last:border-b sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
      aria-label={`Open ${label}`}
    >
      <span className="min-w-0 truncate text-[12px] tracking-[-0.01em] text-neutral-800 transition-colors group-hover:text-black md:text-[13px]">
        {label}
      </span>
      <span className="shrink-0 text-[10px] text-neutral-500 md:text-[11px]">
        {date}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Partition and render both WorkGrid sections**

Update `WorkGrid` to compute `const { highlights, other } = partitionWorkItems(items)` and render:

```tsx
<div className="h-full overflow-y-auto px-5 py-6 md:px-7 md:py-7">
  <section aria-labelledby="selected-work-heading">
    <h2 id="selected-work-heading" className="mb-3 text-[11px] text-neutral-500">
      selected work
    </h2>
    <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-x-5 md:gap-y-6">
      {highlights.map((item) => (
        <WorkCard
          key={workItemId(item)}
          item={item}
          onClick={() => onSelect(workItemId(item))}
        />
      ))}
    </div>
  </section>

  <section className="mt-8" aria-labelledby="other-work-heading">
    <h2 id="other-work-heading" className="mb-2 text-[11px] text-neutral-500">
      other work
    </h2>
    <div>
      {other.map((item) => (
        <WorkRow
          key={workItemId(item)}
          item={item}
          onClick={() => onSelect(workItemId(item))}
        />
      ))}
    </div>
  </section>
</div>
```

Use complete props in the actual implementation. Do not add uppercase transforms or tracking utilities to either heading.

- [ ] **Step 5: Run focused and static checks**

Run:

```bash
node --test components/Work/workIndex.test.mjs
npx tsc --noEmit
npm run lint
```

Expected: focused tests pass; TypeScript and lint exit 0.

- [ ] **Step 6: Commit the mixed work index**

```bash
git add components/Work/WorkCard.tsx components/Work/WorkGrid.tsx components/Work/WorkRow.tsx
git commit -m "feat: add selected and compact work index"
```

---

### Task 3: Add the status rail and balanced page shell

**Files:**
- Create: `components/Home/StatusRail.tsx`
- Modify: `app/HomeClient.tsx`

**Interfaces:**
- Consumes: no new runtime data; the supplied biography is static presentation copy.
- Produces: an `aside` that remains separate from Finder state and a balanced three-column desktop shell.

- [ ] **Step 1: Add the focused static status rail**

Create a component with one age line, three ordered role blocks, and two proof signals. Use lowercase source text only for new labels; there is no `currently` or `selected signals` heading.

```tsx
const roles = [
  {
    index: '01',
    title: 'Founding Engineer @ Aesthetic',
    details: [
      'changing how influencers monetize content',
      '100k+ MAU · $250k+ GMV · 160k+ on Instagram',
    ],
  },
  {
    index: '02',
    title: 'Head of Growth @ storytolds ✸',
    details: [
      'creative studio across music, startups, and fashion',
      'clients include Posh, Molly Santana, Jägermeister, and more',
    ],
  },
  {
    index: '03',
    title: 'Design + Interaction + CS @ UCSD',
    details: ['full ride'],
  },
];

const signals = [
  { value: '50M+', copy: 'organic views across social content' },
  { value: '$350K+', copy: 'profit generated for users by age 17' },
];

export default function StatusRail() {
  return (
    <aside
      aria-label="Current status"
      className="min-w-0 border-t border-black/[0.07] pt-8 xl:sticky xl:top-8 xl:flex xl:h-[calc(100vh-4rem)] xl:max-h-[900px] xl:flex-col xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0"
    >
      <p className="text-[clamp(1.65rem,2.1vw,2.25rem)] leading-none tracking-[-0.055em]">
        i&apos;m a 22 year old...
      </p>

      <ol className="mt-10 space-y-7">
        {roles.map((role) => (
          <li key={role.index}>
            <h2 className="text-[14px] font-semibold leading-[1.2] tracking-[-0.025em] text-neutral-950">
              <span className="mr-2">[{role.index}]</span>
              {role.title}
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-[1.45] text-neutral-600 md:text-xs">
              {role.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-11 space-y-7">
        {signals.map((signal) => (
          <div key={signal.value}>
            <p className="text-[clamp(2.35rem,3.2vw,3.25rem)] font-semibold leading-[0.88] tracking-[-0.07em]">
              {signal.value}
            </p>
            <p className="mt-2 max-w-[24ch] text-[11px] leading-snug text-neutral-500 md:text-xs">
              {signal.copy}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-between gap-4 text-[10px] text-neutral-500 xl:mt-auto">
        <span>Los Angeles, CA</span>
        <span>© 2026</span>
      </div>
    </aside>
  );
}
```

Render the age at `text-[clamp(1.65rem,2.1vw,2.25rem)]`, role titles around 14–15px, supporting copy around 11–12px, and signals around 36–42px. Use spacing and weight—not divider labels—to create hierarchy.

- [ ] **Step 2: Convert HomeClient to the three-part layout**

Use equal outer grid tracks around a bounded center track:

```tsx
<main className="min-h-screen w-full overflow-x-hidden px-5 py-6 md:px-8 md:py-8 xl:px-6">
  <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-y-8 xl:grid-cols-[minmax(240px,1fr)_minmax(620px,780px)_minmax(240px,1fr)] xl:gap-x-8 2xl:gap-x-10">
    <section className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:border-r xl:border-black/[0.07] xl:pr-8">
      <button
        type="button"
        onClick={() => selectFolder('work')}
        className="self-start transition-opacity hover:opacity-80"
        aria-label={`${Bio.name} — go to work`}
      >
        <Image
          src="/logo.png"
          alt={Bio.name}
          width={2172}
          height={937}
          priority
          className="h-auto w-full max-w-[420px]"
        />
      </button>
      <ReadmePreview />
    </section>

    <section className="min-w-0 xl:sticky xl:top-8 xl:self-start">
      <div className="h-[calc(100svh-3rem)] min-h-[560px] md:h-[calc(100vh-4rem)] md:min-h-[680px] xl:max-h-[900px]">
        <FinderWindow
          title={titlebar}
          sidebar={<FinderSidebar active={folder} onSelect={selectFolder} />}
        >
          {folder === 'work' && (
            <>
              <WorkGrid items={workItems} onSelect={setActiveId} />
              <AnimatePresence>
                {activeItem && (
                  <CaseStudyDetail
                    key={activeId ?? 'detail'}
                    item={activeItem}
                    onClose={() => setActiveId(null)}
                  />
                )}
              </AnimatePresence>
            </>
          )}

          {folder === 'moodboard' && (
            <div className="relative h-full w-full">
              <UniverseExperience
                media={media}
                shoppable={shoppable}
                className="relative h-full w-full"
              />
            </div>
          )}

          {folder === 'contact' && <ContactCard />}
        </FinderWindow>
      </div>
    </section>

    <StatusRail />
  </div>
</main>
```

Keep the `Image` source, intrinsic width/height, alt text, priority, and click handler. Allow it to scale down within the narrower left rail without changing the asset.

Use an approximately viewport-height Finder container on desktop with a minimum height that fits the work grid, while retaining the existing mobile minimums. Ensure the equal outer tracks—not manual transforms—keep the Mac window centered.

- [ ] **Step 3: Verify existing interaction wiring remains unchanged**

Confirm in code that:

- `selectFolder` still clears `activeId`.
- `workItemId` still finds every active item.
- `AnimatePresence` still wraps `CaseStudyDetail`.
- Moodboard and contact branches are unchanged.
- The logo button still selects `work`.

- [ ] **Step 4: Run static verification**

Run:

```bash
node --test components/Work/workIndex.test.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Expected: every command exits 0; the build route list still includes `/` and all existing routes.

- [ ] **Step 5: Commit the page composition**

```bash
git add app/HomeClient.tsx components/Home/StatusRail.tsx
git commit -m "feat: add balanced homepage status rail"
```

---

### Task 4: Browser verification and design QA

**Files:**
- Create: `design-qa.md`
- Potential P0-P2 fix scope after the QA report names a concrete mismatch: `app/HomeClient.tsx`, `components/Home/StatusRail.tsx`, `components/Work/WorkCard.tsx`, `components/Work/WorkGrid.tsx`, `components/Work/WorkRow.tsx`

**Interfaces:**
- Consumes: the approved reference screenshot, final browser-companion mock, and local rendered homepage.
- Produces: desktop/mobile screenshots and a blocking `design-qa.md` with `final result: passed` or `final result: blocked`.

- [ ] **Step 1: Start the local Next.js server**

Run: `npm run dev -- -p 3000`

Expected: Next.js reports the local server is ready.

- [ ] **Step 2: Verify desktop composition in the browser**

At 1440 × 900 on `/`, capture the full homepage and inspect:

- unchanged top-left logo asset and work-tab click
- center window's midpoint versus viewport midpoint
- age → role blocks → signals hierarchy
- absence of `currently` and `selected signals`
- lowercase `selected work` and `other work`
- four and only four image cards
- card image aspect ratios near 4:3
- four other-work rows with visible dates
- no horizontal overflow or console errors

- [ ] **Step 3: Verify mobile composition and primary interactions**

At 390 × 844:

- confirm left → Finder → status order
- confirm horizontal Finder navigation remains usable
- confirm cards and rows do not clip or overlap
- open one highlighted card and one other-work row, then close each detail view
- switch to moodboard and contact and back to work
- check console errors

- [ ] **Step 4: Compare source and implementation in one visual input**

Build a same-canvas comparison of the supplied desktop reference/final mock and the 1440 × 900 implementation capture. Review full composition plus focused center/right crops for typography, spacing, colors, image quality, and copy.

- [ ] **Step 5: Write and iterate the blocking QA report**

Create `design-qa.md` with source paths, implementation screenshot paths, viewports, tested interactions, console result, full-view and focused comparison evidence, findings, iteration history, and the exact line:

```text
final result: passed
```

Use `blocked` instead if any P0/P1/P2 issue remains. Fix every P0/P1/P2 finding, recapture at the same viewport, and compare again before changing the result to `passed`.

- [ ] **Step 6: Run final fresh verification**

Run:

```bash
node --test components/Work/workIndex.test.mjs
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: all commands exit 0 and `design-qa.md` ends with `final result: passed`.

- [ ] **Step 7: Commit verified implementation and QA evidence**

```bash
git add app/HomeClient.tsx components/Home/StatusRail.tsx components/Work/WorkCard.tsx components/Work/WorkGrid.tsx components/Work/WorkRow.tsx components/Work/workIndex.mjs components/Work/workIndex.test.mjs design-qa.md
git commit -m "feat: polish homepage portfolio hierarchy"
```

Do not stage the user's `lib/data.ts` resume-link edit.
