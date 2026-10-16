'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

import FinderWindow from '@/components/Finder/FinderWindow';
import FinderSidebar, { FolderTabs } from '@/components/Finder/FinderSidebar';
import { GridIcon, ListIcon } from '@/components/Finder/icons';
import ReadmePreview from '@/components/ReadmePreview';
import WorkGrid, { workItemId, type WorkView } from '@/components/Work/WorkGrid';
import CaseStudyDetail from '@/components/Work/CaseStudyDetail';
import { getHighlightMeta, nextWorkItemId } from '@/components/Work/workIndex.mjs';
import ContactCard from '@/components/ContactCard';
import StatusRail from '@/components/Home/StatusRail';
import IdentityHeader from '@/components/Home/IdentityHeader';
import DesktopIcons from '@/components/Home/DesktopIcons';

import { experiences, moodboardCover, projects } from '@/lib/data';
import type { Folder, WorkItem } from '@/types/portfolio';
import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableManifest } from '@/lib/shoppable/types';

// three.js + WebGL is client-only, so load the moodboard (image universe +
// gestures + shoppable breakdown, with its flat fallback) with SSR disabled.
const MoodboardPanel = dynamic(() => import('@/components/ImageUniverse/MoodboardPanel'), {
  ssr: false,
  loading: () => (
    <div role="status" className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
      Loading moodboard…
    </div>
  ),
});

const DESKTOP_LAYOUT = '(min-width: 1280px)';

const itemCount = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`;

interface Props {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
}

export default function HomeClient({ media, shoppable }: Props) {
  const [folder, setFolder] = useState<Folder>('work');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [forwardId, setForwardId] = useState<string | null>(null);
  const [view, setView] = useState<WorkView>('icons');
  const [caseStudyOpener, setCaseStudyOpener] = useState<HTMLElement | null>(null);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef(0);

  const workItems = useMemo<WorkItem[]>(
    () => [
      ...experiences.map((data) => ({ kind: 'role' as const, data })),
      ...projects.map((data) => ({ kind: 'project' as const, data })),
    ],
    []
  );

  const findItem = useCallback(
    (id: string | null) => (id ? workItems.find((item) => workItemId(item) === id) ?? null : null),
    [workItems]
  );

  const activeItem = findItem(activeId);
  const activeTitle = activeItem ? getHighlightMeta(activeItem).title : null;
  const nextItem = findItem(activeId ? nextWorkItemId(workItems, activeId) : null);
  const forwardItem = findItem(forwardId);

  const cover = useMemo(
    () =>
      media.find((item) => item.type === 'image' && item.filename === moodboardCover) ??
      media.find((item) => item.type === 'image') ??
      null,
    [media]
  );

  const selectFolder = (next: Folder) => {
    setFolder(next);
    setActiveId(null);
    setForwardId(null);
  };

  const openItem = (id: string, opener?: HTMLElement | null) => {
    if (!activeId) gridScrollRef.current = contentRef.current?.scrollTop ?? 0;
    setCaseStudyOpener(
      opener !== undefined ? opener : document.activeElement instanceof HTMLElement ? document.activeElement : null
    );
    setActiveId(id);
    setForwardId(null);
    contentRef.current?.scrollTo({ top: 0 });
    // Below the desktop layout the window grows with its content, so bring its top into view.
    if (!window.matchMedia(DESKTOP_LAYOUT).matches) {
      document.getElementById('portfolio-workspace')?.scrollIntoView({ block: 'start' });
    }
  };

  const closeItem = useCallback(() => {
    if (!activeId) return;
    setForwardId(activeId);
    setActiveId(null);
    requestAnimationFrame(() => {
      contentRef.current?.scrollTo({ top: gridScrollRef.current });
      if (!window.matchMedia(DESKTOP_LAYOUT).matches) {
        caseStudyOpener?.scrollIntoView({ block: 'center' });
      }
    });
  }, [activeId, caseStudyOpener]);

  const workCount = workItems.length;
  const title = folder === 'work' && activeTitle ? activeTitle : folder;
  const path = ['naethun.dev', folder, ...(folder === 'work' && activeTitle ? [activeTitle] : [])];
  const status =
    folder === 'work'
      ? activeItem
        ? `${workItems.indexOf(activeItem) + 1} of ${workCount}`
        : itemCount(workCount)
      : folder === 'moodboard'
        ? itemCount(media.length)
        : undefined;

  const toolbarActions = (
    <>
      {folder === 'work' && !activeItem && (
        <div role="group" aria-label="View" className="hidden rounded-lg bg-black/5 p-0.5 md:flex">
          {(['icons', 'list'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-label={mode === 'icons' ? 'Icons' : 'List'}
              aria-pressed={view === mode}
              className={`relative flex h-[26px] w-8 items-center justify-center rounded-md transition-colors before:absolute before:-inset-y-[9px] before:inset-x-0 before:content-[''] ${
                view === mode
                  ? 'bg-white text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.14)]'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              {mode === 'icons' ? <GridIcon /> : <ListIcon />}
            </button>
          ))}
        </div>
      )}
      {/* The moodboard renders its hand-gesture toggle in here. */}
      <div ref={setToolbarSlot} className="contents" />
    </>
  );

  return (
    <main className="desktop-canvas min-h-svh w-full overflow-x-clip px-5 pb-12 pt-6 md:px-8 md:pt-8 xl:flex xl:items-center xl:py-8">
      <a
        href="#portfolio-workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:left-5 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:p-3 focus:shadow-lg"
      >
        Skip to portfolio
      </a>
      {/* Desktop: the window is 720px at 1440 wide, giving 288px side columns; it gives
          up width first on smaller laptops (600px at 1280) so the side columns stay readable. */}
      <div className="mx-auto grid w-full max-w-[760px] grid-cols-1 gap-y-8 xl:h-[calc(100svh-4rem)] xl:min-h-[720px] xl:max-h-[1000px] xl:max-w-[1560px] xl:grid-cols-[minmax(0,1fr)_clamp(600px,calc(100vw-720px),760px)_minmax(0,1fr)] xl:grid-rows-[auto_auto_minmax(0,1fr)_auto] xl:gap-x-10 xl:gap-y-0">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <IdentityHeader onHome={() => selectFolder('work')} />
        </div>

        <section
          id="portfolio-workspace"
          aria-label="Portfolio workspace"
          tabIndex={-1}
          className="min-w-0 scroll-mt-6 xl:col-start-2 xl:row-span-4 xl:row-start-1 xl:min-h-0"
        >
          <FinderWindow
            title={title}
            sidebar={<FinderSidebar active={folder} onSelect={selectFolder} />}
            mobileNav={<FolderTabs active={folder} onSelect={selectFolder} />}
            back={{ enabled: Boolean(activeItem), label: 'Back to work', onClick: closeItem }}
            forward={{
              enabled: folder === 'work' && !activeItem && Boolean(forwardItem),
              label: forwardItem ? `Forward to ${getHighlightMeta(forwardItem).title}` : 'Forward',
              onClick: () => forwardId && openItem(forwardId),
            }}
            actions={toolbarActions}
            path={path}
            status={status}
            contentRef={contentRef}
          >
            {folder === 'work' && (
              <>
                {/* Kept mounted while a case study is open so focus can return to the card. */}
                <div hidden={Boolean(activeItem)}>
                  <WorkGrid items={workItems} onSelect={openItem} view={view} />
                </div>
                {activeItem && (
                  <CaseStudyDetail
                    key={activeId}
                    item={activeItem}
                    returnFocusTo={caseStudyOpener}
                    onClose={closeItem}
                    next={
                      nextItem
                        ? {
                            title: getHighlightMeta(nextItem).title,
                            onOpen: () => openItem(workItemId(nextItem), caseStudyOpener),
                          }
                        : null
                    }
                  />
                )}
              </>
            )}

            {folder === 'moodboard' && (
              <div className="h-[min(72svh,620px)] min-h-[420px] xl:h-full xl:min-h-0">
                <MoodboardPanel media={media} shoppable={shoppable} toolbarSlot={toolbarSlot} />
              </div>
            )}

            {folder === 'contact' && <ContactCard />}
          </FinderWindow>
        </section>

        <div className="min-w-0 xl:col-start-1 xl:row-start-2 xl:mt-8">
          <ReadmePreview />
        </div>

        <div className="min-w-0 xl:col-start-3 xl:row-span-4 xl:row-start-1 xl:min-h-0">
          <StatusRail cover={cover} onOpenMoodboard={() => selectFolder('moodboard')} />
        </div>

        <div className="min-w-0 xl:col-start-1 xl:row-start-4 xl:pt-6">
          <DesktopIcons />
        </div>
      </div>
    </main>
  );
}
