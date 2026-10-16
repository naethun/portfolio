'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';
import type { CaseStudy, CaseStudySection, WorkItem } from '@/types/portfolio';
import { formatDateRange, isHighlightedWork } from './workIndex.mjs';
import { parseCaseStudyBody } from './caseStudyBody.mjs';

interface CaseStudyDetailProps {
  item: WorkItem;
  next: { title: string; onOpen: () => void } | null;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

function getMeta(item: WorkItem) {
  if (item.kind === 'role') {
    return {
      title: item.data.company,
      role: item.data.role,
      date: item.data.date,
      hero: item.data.caseStudy?.hero ?? item.data.img,
      body: item.data.desc,
      figures: item.data.figures,
      caseStudy: item.data.caseStudy,
      tags: item.data.skills,
    };
  }
  return {
    title: item.data.title,
    role: item.data.category,
    date: item.data.date,
    hero: item.data.caseStudy?.hero ?? item.data.image,
    body: item.data.description,
    figures: item.data.figures,
    caseStudy: item.data.caseStudy,
    tags: item.data.tags,
  };
}

const bodyText = 'text-[14.5px] leading-[1.6] text-neutral-800 text-pretty';

export default function CaseStudyDetail({ item, next, onClose, returnFocusTo }: CaseStudyDetailProps) {
  const meta = getMeta(item);
  const showImages = isHighlightedWork(item);
  const titleId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = useReducedMotion();

  const blocks = parseCaseStudyBody(meta.body);
  const intro = blocks[0]?.type === 'paragraph' ? blocks[0] : null;
  const rest = intro ? blocks.slice(1) : blocks;

  useEffect(() => {
    const opener = returnFocusTo ?? document.activeElement;
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [returnFocusTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.article
      aria-labelledby={titleId}
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="px-5 pb-6 pt-6 md:px-8 md:pt-7"
    >
      <h3
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="text-[34px] font-light leading-none tracking-[-0.05em] text-neutral-950 outline-none md:text-[38px]"
      >
        {meta.title}
      </h3>
      <p className="mt-2 text-sm text-[#6b6b6b]">
        {meta.role} · {formatDateRange(meta.date)}
      </p>

      {meta.caseStudy?.subtitle && (
        <p className="mt-4 text-base leading-normal text-neutral-900 text-pretty">{meta.caseStudy.subtitle}</p>
      )}
      {!meta.caseStudy && intro && (
        <p className="mt-4 whitespace-pre-line text-base leading-normal text-neutral-900 text-pretty">{intro.text}</p>
      )}

      {meta.figures?.length ? (
        <dl className="mt-5 grid grid-cols-3 gap-4">
          {meta.figures.map((figure) => (
            <div key={figure.label} className="flex flex-col-reverse gap-1">
              <dt className="text-[12.5px] text-[#6b6b6b]">{figure.label}</dt>
              <dd className="text-2xl font-light leading-none tracking-[-0.05em] text-neutral-950 md:text-[26px]">
                {figure.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showImages && meta.hero && (
        <div className="relative mt-6 aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-neutral-100">
          <Image
            src={meta.hero}
            alt={`${meta.title} preview`}
            fill
            loading="eager"
            unoptimized={meta.hero.toLowerCase().endsWith('.gif')}
            sizes="(max-width: 767px) 100vw, 520px"
            className="object-cover"
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[10px] ring-1 ring-inset ring-black/[0.08]" />
        </div>
      )}

      {meta.caseStudy ? (
        <CaseStudySections caseStudy={meta.caseStudy} showImages={showImages} />
      ) : (
        rest.map((block, i) =>
          block.type === 'list' ? (
            <ul key={i} className={`mt-5 list-disc space-y-2.5 pl-[18px] marker:text-neutral-400 ${bodyText}`}>
              {block.items.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          ) : (
            <p key={i} className={`mt-4 whitespace-pre-line ${bodyText}`}>
              {block.text}
            </p>
          ),
        )
      )}

      {meta.tags?.length ? (
        <p className="mt-7 border-t border-black/[0.08] pt-3.5 text-[13.5px] leading-normal text-[#6b6b6b]">
          {meta.tags.join(' · ')}
        </p>
      ) : null}

      {next && (
        <button
          type="button"
          onClick={next.onOpen}
          className="mt-3.5 flex min-h-14 w-full items-center justify-between gap-4 border-t border-black/[0.08] pt-3.5 text-left"
        >
          <span>
            <span className="block text-[12.5px] text-[#6b6b6b]">Next</span>
            <span className="block text-[15px] font-medium text-neutral-950">{next.title}</span>
          </span>
          <span aria-hidden="true" className="text-lg">
            →
          </span>
        </button>
      )}
    </motion.article>
  );
}

function CaseStudySections({ caseStudy, showImages }: { caseStudy: CaseStudy; showImages: boolean }) {
  return caseStudy.sections
    .filter((section) => showImages || section.type !== 'image')
    .map((section, idx) => <CaseStudyBlock key={idx} section={section} />);
}

function CaseStudyBlock({ section }: { section: CaseStudySection }) {
  if (section.type === 'heading') {
    return <h4 className="mt-7 text-[15px] font-semibold tracking-[-0.01em] text-neutral-950">{section.content}</h4>;
  }
  if (section.type === 'image') {
    return (
      <div className="relative mt-5 aspect-[16/10] w-full overflow-hidden rounded-[10px] bg-neutral-100">
        <Image
          src={section.content}
          alt={section.alt ?? ''}
          fill
          sizes="(max-width: 767px) 100vw, 520px"
          className="object-cover"
        />
      </div>
    );
  }
  if (section.type === 'embed') {
    return (
      <figure className="mt-5 space-y-2">
        <div
          className="w-full overflow-hidden rounded-[10px] bg-neutral-100 ring-1 ring-black/10"
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
        {section.title && <figcaption className="text-center text-xs text-[#6b6b6b]">{section.title}</figcaption>}
      </figure>
    );
  }
  return <p className={`mt-4 whitespace-pre-line ${bodyText}`}>{section.content}</p>;
}

export type { CaseStudy };
