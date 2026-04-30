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

import { Bio, experiences, projects } from '@/lib/data';
import type { Folder, WorkItem } from '@/types/portfolio';
import type { LoopImage } from '@/lib/getLoopImages';

const HandLoop = dynamic(() => import('@/components/HandLoop/HandLoop'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-[0.2em] text-neutral-400">
      LOADING…
    </div>
  ),
});

interface Props {
  loopImages: LoopImage[];
}

export default function HomeClient({ loopImages }: Props) {
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
    <main className="min-h-screen w-full overflow-x-hidden px-5 py-6 md:px-10 md:py-10">
      <div className="mx-auto grid max-w-[1700px] grid-cols-1 gap-6 md:gap-8 lg:grid-cols-[minmax(280px,38%)_1fr]">
        {/* Left identity column */}
        <section className="flex flex-col gap-6 lg:gap-8">
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
              className="h-auto w-full max-w-[420px] md:h-52 md:w-auto md:max-w-none lg:h-60"
            />
          </button>
          <ReadmePreview />
        </section>

        {/* Right Finder column */}
        <section className="lg:sticky lg:top-10 lg:self-start">
          <div className="h-[calc(100svh-3rem)] min-h-[560px] md:h-[calc(100vh-5rem)] md:min-h-[640px]">
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
                  <HandLoop images={loopImages} frameless />
                </div>
              )}

              {folder === 'contact' && <ContactCard />}
            </FinderWindow>
          </div>
        </section>
      </div>
    </main>
  );
}
