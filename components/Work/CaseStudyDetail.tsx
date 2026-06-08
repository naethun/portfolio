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
  const [viewportRatio, setViewportRatio] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollHeight - el.clientHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      setProgress(next);
      const ratio = el.scrollHeight > 0 ? el.clientHeight / el.scrollHeight : 1;
      setViewportRatio(Math.min(1, Math.max(0.08, ratio)));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
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

        {/* Scroll indicator — track + thumb, mimics native scrollbar so it reads instantly */}
        <div className="pointer-events-none absolute right-[30px] top-16 bottom-12 z-10 hidden w-[3px] rounded-full bg-black/[0.07] md:block">
          <div
            className="absolute left-0 right-0 rounded-full bg-neutral-800/85"
            style={{
              height: `${viewportRatio * 100}%`,
              top: `${progress * (1 - viewportRatio) * 100}%`,
            }}
          />
        </div>

        <div
          ref={containerRef}
          className="h-full overflow-y-auto px-6 pt-16 pb-20 md:pl-12 md:pr-24 md:pt-20 md:pb-24 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-3xl font-medium tracking-tight text-neutral-900 md:text-5xl">
                {meta.title}
              </h2>
              <p className="mt-3 text-[13px] tracking-wide text-neutral-500 md:text-sm">
                {meta.date}
              </p>
              {meta.caseStudy?.subtitle && (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-neutral-600 md:text-base">
                  {meta.caseStudy.subtitle}
                </p>
              )}
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
  if (section.type === 'embed') {
    return (
      <figure className="space-y-2">
        <div
          className="w-full overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/10"
          style={{ aspectRatio: section.ratio ?? '4 / 3' }}
        >
          <iframe
            src={section.content}
            title={section.title ?? 'Embedded prototype'}
            loading="lazy"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
        {section.title && (
          <figcaption className="text-center font-mono text-[11px] uppercase tracking-wider text-neutral-500">
            {section.title}
          </figcaption>
        )}
      </figure>
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
