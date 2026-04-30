'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { CaseStudy, CaseStudySection, WorkItem } from '@/types/portfolio';

interface CaseStudyDetailProps {
  item: WorkItem;
  onClose: () => void;
}

function getMeta(item: WorkItem) {
  if (item.kind === 'role') {
    return {
      eyebrow: item.data.role,
      date: item.data.date,
      title: item.data.company,
      hero: item.data.caseStudy?.hero ?? item.data.img,
      shortDesc: item.data.desc,
      caseStudy: item.data.caseStudy,
      tags: item.data.skills,
    };
  }
  return {
    eyebrow: item.data.category,
    date: item.data.date,
    title: item.data.title,
    hero: item.data.caseStudy?.hero ?? item.data.image,
    shortDesc: item.data.description,
    caseStudy: item.data.caseStudy,
    tags: item.data.tags,
  };
}

export default function CaseStudyDetail({ item, onClose }: CaseStudyDetailProps) {
  const meta = getMeta(item);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      setProgress(next);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-20 bg-white"
    >
      <div className="relative h-full">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close case study"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-neutral-700 backdrop-blur transition hover:bg-white"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>

        {/* Scroll progress indicator */}
        <div className="pointer-events-none absolute right-2 top-1/2 z-10 hidden h-40 w-[2px] -translate-y-1/2 overflow-hidden bg-black/10 md:block">
          <div
            className="w-full bg-neutral-700 transition-[height]"
            style={{ height: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <div className="pointer-events-none absolute right-5 top-[calc(50%-90px)] z-10 hidden font-mono text-[10px] tracking-wider text-neutral-500 md:block">
          {Math.round(progress * 100)}%
        </div>

        <div ref={containerRef} className="h-full overflow-y-auto px-6 pt-16 pb-20 md:px-12 md:pt-20 md:pb-24">
          <div className="mx-auto max-w-3xl">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr] md:gap-10">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                  {meta.eyebrow}
                </p>
                <p className="mt-1 font-mono text-[11px] text-neutral-500">
                  {meta.date}
                </p>
              </div>
              <div>
                <h2 className="font-display text-3xl font-medium text-neutral-900 md:text-4xl">
                  {meta.title}
                </h2>
                {meta.caseStudy?.subtitle && (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
                    {meta.caseStudy.subtitle}
                  </p>
                )}
              </div>
            </div>

            {meta.hero && (
              <div className="relative mt-10 aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">
                <Image
                  src={meta.hero}
                  alt={meta.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 720px"
                  className="object-cover"
                />
              </div>
            )}

            <div className="mt-10 space-y-6">
              {meta.caseStudy ? (
                meta.caseStudy.sections.map((section, idx) => (
                  <CaseStudyBlock key={idx} section={section} />
                ))
              ) : (
                <FallbackBody desc={meta.shortDesc} />
              )}
            </div>

            {meta.tags?.length ? (
              <div className="mt-10 flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-black/5 px-2.5 py-1 font-mono text-[11px] text-neutral-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CaseStudyBlock({ section }: { section: CaseStudySection }) {
  if (section.type === 'heading') {
    return (
      <h3 className="font-display text-xl font-medium text-neutral-900">
        {section.content}
      </h3>
    );
  }
  if (section.type === 'image') {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/10">
        <Image
          src={section.content}
          alt={section.alt ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700 md:text-[15px]">
      {section.content}
    </p>
  );
}

function FallbackBody({ desc }: { desc: string }) {
  return (
    <>
      <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700 md:text-[15px]">
        {desc}
      </p>
      <p className="border-t border-black/10 pt-6 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
        case study coming soon
      </p>
    </>
  );
}

export type { CaseStudy };
