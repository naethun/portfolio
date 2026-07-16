'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { AnimatePresence } from 'framer-motion';

import FinderWindow from '@/components/Finder/FinderWindow';
import FinderSidebar from '@/components/Finder/FinderSidebar';
import ReadmePreview from '@/components/ReadmePreview';
import WorkGrid, { workItemId } from '@/components/Work/WorkGrid';
import CaseStudyDetail from '@/components/Work/CaseStudyDetail';
import ContactCard from '@/components/ContactCard';
import StatusRail from '@/components/Home/StatusRail';

import { Bio, experiences, projects } from '@/lib/data';
import type { Folder, WorkItem } from '@/types/portfolio';
import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableManifest } from '@/lib/shoppable/types';

// three.js + WebGL is client-only, so load the full universe experience
// (image universe + gestures + shoppable breakdown) with SSR disabled.
const UniverseExperience = dynamic(
  () => import('@/components/ImageUniverse/UniverseExperience'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-[0.2em] text-neutral-400">
        LOADING…
      </div>
    ),
  },
);

interface Props {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
}

export default function HomeClient({ media, shoppable }: Props) {
  const [folder, setFolder] = useState<Folder>('work');
  const [activeId, setActiveId] = useState<string | null>(null);

  const workItems = useMemo<WorkItem[]>(
    () => [
      ...experiences.map((data) => ({ kind: 'role' as const, data })),
      ...projects.map((data) => ({ kind: 'project' as const, data })),
    ],
    []
  );

  const activeItem = useMemo(
    () => workItems.find((item) => workItemId(item) === activeId) ?? null,
    [workItems, activeId]
  );

  const selectFolder = (next: Folder) => {
    setFolder(next);
    setActiveId(null);
  };

  const titlebar = `naethun.dev — /${folder}`;

  return (
    <main className="min-h-screen w-full overflow-x-hidden px-5 py-6 md:px-8 md:py-8 xl:px-6">
      <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-y-8 xl:grid-cols-[minmax(240px,1fr)_minmax(620px,780px)_minmax(240px,1fr)] xl:gap-x-8 2xl:gap-x-10">
        {/* Left identity column */}
        <section className="flex min-w-0 flex-col gap-6 xl:sticky xl:top-8 xl:h-[calc(100vh-4rem)] xl:min-h-[680px] xl:max-h-[900px] xl:border-r xl:border-black/[0.07] xl:pr-8 2xl:pr-10">
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

        {/* Centered Finder column */}
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
  );
}
