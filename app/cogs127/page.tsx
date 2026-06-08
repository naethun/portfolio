import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { projects } from '@/lib/data';
import type { CaseStudySection } from '@/types/portfolio';

export const metadata = {
  title: 'Learn First, Invest Second — COGS 127 Case Study',
  description:
    'A practice-first learning layer that helps overwhelmed first-time investors build confidence before risking real money.',
};

function Section({ section }: { section: CaseStudySection }) {
  if (section.type === 'heading') {
    return (
      <h2 className="mt-14 text-2xl font-medium tracking-tight text-neutral-900 md:text-[28px]">
        {section.content}
      </h2>
    );
  }
  if (section.type === 'image') {
    return (
      <div className="relative mt-8 aspect-[16/10] w-full overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10">
        <Image
          src={section.content}
          alt={section.alt ?? ''}
          fill
          sizes="(max-width: 768px) 100vw, 760px"
          className="object-cover"
        />
      </div>
    );
  }
  if (section.type === 'embed') {
    return (
      <figure className="mt-8 space-y-2">
        <div
          className="w-full overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-black/10"
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
    <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700 md:text-base">
      {section.content}
    </p>
  );
}

export default function Cogs127Page() {
  const project = projects.find((p) => p.id === 3 && p.caseStudy);
  if (!project || !project.caseStudy) notFound();

  const { caseStudy } = project;
  const hero = caseStudy.hero ?? project.image;

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
        >
          <span aria-hidden>←</span> back to naethun.dev
        </Link>

        <header className="mt-10 flex flex-col items-center text-center">
          <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-neutral-500">
            {project.date}
          </p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight text-neutral-900 md:text-6xl">
            {project.title}
          </h1>
          {caseStudy.subtitle && (
            <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 md:text-lg">
              {caseStudy.subtitle}
            </p>
          )}
        </header>

        {hero && (
          <div className="relative mt-12 aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-black/10">
            <Image
              src={hero}
              alt={project.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 760px"
              className="object-cover"
            />
          </div>
        )}

        <article>
          {caseStudy.sections.map((section, idx) => (
            <Section key={idx} section={section} />
          ))}
        </article>

        {project.tags?.length ? (
          <div className="mt-14 flex flex-wrap gap-2 border-t border-black/10 pt-8">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-black/5 px-2.5 py-1 font-mono text-[11px] text-neutral-700"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <footer className="mt-12">
          <Link
            href="/"
            className="font-mono text-[12px] uppercase tracking-wider text-neutral-500 transition hover:text-neutral-900"
          >
            ← back to naethun.dev
          </Link>
        </footer>
      </div>
    </main>
  );
}
