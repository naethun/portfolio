'use client';

import Image from 'next/image';
import type { WorkItem } from '@/types/portfolio';
import { getHighlightMeta } from './workIndex.mjs';

interface WorkCardProps {
  item: WorkItem;
  onClick: () => void;
}

export default function WorkCard({ item, onClick }: WorkCardProps) {
  const { title, image, date } = getHighlightMeta(item);

  return (
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
          loading="eager"
          sizes="(max-width: 767px) 42vw, 280px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
        />
      </div>

      <div className="mt-2 flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
        <p className="w-full truncate text-[13px] font-medium leading-tight tracking-[-0.02em] text-neutral-900 md:text-sm">
          {title}
        </p>
        <p className="shrink-0 text-[10px] leading-tight text-neutral-500 md:text-[11px]">
          {date}
        </p>
      </div>
    </button>
  );
}
