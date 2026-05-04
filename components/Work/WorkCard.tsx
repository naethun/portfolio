'use client';

import Image from 'next/image';
import type { WorkItem } from '@/types/portfolio';

interface WorkCardProps {
  item: WorkItem;
  index: number;
  onClick: () => void;
}

const TINTS = [
  'bg-white',
  'bg-[#fafaf6]',
  'bg-[#f6f8fb]',
  'bg-white',
] as const;

function deriveSubtitle(item: WorkItem): string {
  if (item.kind === 'role') return item.data.role;
  return item.data.category;
}

function deriveTitle(item: WorkItem): string {
  if (item.kind === 'role') return item.data.company;
  return item.data.title;
}

function deriveImage(item: WorkItem): string {
  return item.kind === 'role' ? item.data.img : item.data.image;
}

export default function WorkCard({ item, index, onClick }: WorkCardProps) {
  const title = deriveTitle(item);
  const subtitle = deriveSubtitle(item);
  const image = deriveImage(item);
  const tint = TINTS[index % TINTS.length];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col items-stretch overflow-hidden rounded-2xl text-left ring-1 ring-black/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:ring-black/20 hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.18)] ${tint}`}
      aria-label={`Open ${title}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 360px"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : null}
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/0 text-neutral-700 opacity-0 ring-1 ring-black/0 backdrop-blur-sm transition-all duration-300 group-hover:bg-white/85 group-hover:opacity-100 group-hover:ring-black/10"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="square"
          >
            <path d="M2 9 L9 2" />
            <path d="M3.5 2 H9 V7.5" />
          </svg>
        </span>
      </div>

      <div className="flex flex-col gap-1 px-4 pb-4 pt-4 md:px-5 md:pb-5 md:pt-5">
        <p className="truncate text-[16px] font-medium leading-[1.15] tracking-tight text-neutral-900 md:text-[19px]">
          {title}
        </p>

        <p className="truncate text-[12px] font-normal leading-snug tracking-[0.005em] text-neutral-500 md:text-[13px]">
          {subtitle}
        </p>
      </div>
    </button>
  );
}
