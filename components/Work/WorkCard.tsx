'use client';

import Image from 'next/image';
import type { WorkItem } from '@/types/portfolio';
import { getHighlightMeta } from './workIndex.mjs';

interface WorkCardProps {
  item: WorkItem;
  onClick: (opener: HTMLElement) => void;
}

export default function WorkCard({ item, onClick }: WorkCardProps) {
  const { title, image, date, descriptor } = getHighlightMeta(item);
  // Narrow cards break after the role, never inside it.
  const [lead, ...rest] = descriptor.split(' · ');

  return (
    <button
      type="button"
      onClick={(event) => onClick(event.currentTarget)}
      className="group @container min-w-0 text-left"
      aria-label={`Open ${title}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-neutral-100">
        <Image
          src={image}
          alt={title}
          fill
          loading="eager"
          unoptimized={image.toLowerCase().endsWith('.gif')}
          sizes="(max-width: 767px) 45vw, 260px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-black/[0.08] transition group-hover:ring-black/20 group-focus-visible:ring-black/40"
        />
      </div>

      <div className="mt-2 flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 flex-col @min-[230px]:flex-row @min-[230px]:items-baseline @min-[230px]:justify-between @min-[230px]:gap-3">
          <p className="truncate text-sm font-medium leading-tight tracking-[-0.015em] text-neutral-950">{title}</p>
          <p className="shrink-0 text-xs leading-tight tabular-nums text-[#6b6b6b]">{date}</p>
        </div>
        <p className="text-[13px] leading-snug text-[#6b6b6b]">
          {rest.length > 0 ? (
            <>
              <span className="whitespace-nowrap">{lead} ·</span> {rest.join(' · ')}
            </>
          ) : (
            lead
          )}
        </p>
      </div>
    </button>
  );
}
