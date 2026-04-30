'use client';

import Image from 'next/image';
import type { WorkItem } from '@/types/portfolio';

interface WorkCardProps {
  item: WorkItem;
  index: number;
  onClick: () => void;
}

function deriveSubtitle(item: WorkItem): string {
  if (item.kind === 'role') {
    const year = parseDateYear(item.data.date);
    return `${item.data.company.toLowerCase()} · ${year}`;
  }
  const year = parseDateYear(item.data.date);
  return `${item.data.category.toLowerCase()} · ${year}`;
}

function parseDateYear(date: string): string {
  const match = date.match(/\b(19|20)\d{2}\b/g);
  if (!match || match.length === 0) return '—';
  return match[match.length - 1];
}

function deriveTitle(item: WorkItem): string {
  if (item.kind === 'role') return item.data.role.toLowerCase();
  return item.data.title.toLowerCase();
}

function deriveImage(item: WorkItem): string {
  return item.kind === 'role' ? item.data.img : item.data.image;
}

export default function WorkCard({ item, index, onClick }: WorkCardProps) {
  const numberBadge = `/${String(index + 1).padStart(2, '0')}`;
  const title = deriveTitle(item);
  const subtitle = deriveSubtitle(item);
  const image = deriveImage(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-stretch text-left transition-opacity hover:opacity-90"
      aria-label={`Open ${title}`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/10 shadow-sm transition-shadow group-hover:shadow-md">
        {image ? (
          <Image
            src={image}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 220px"
            className="object-cover"
          />
        ) : null}
        <span className="absolute bottom-2 right-2 rounded bg-white/85 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-neutral-700">
          {numberBadge}
        </span>
        <span className="absolute left-2 top-2 rounded bg-white/85 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neutral-700">
          {item.kind}
        </span>
      </div>

      <div className="mt-2 px-0.5">
        <p className="truncate font-mono text-[13px] text-neutral-900">{title}</p>
        <p className="truncate font-mono text-[11px] text-neutral-500">
          {subtitle}
        </p>
      </div>
    </button>
  );
}
