'use client';

import type { WorkItem } from '@/types/portfolio';
import { getWorkRowMeta } from './workIndex.mjs';

interface WorkRowProps {
  item: WorkItem;
  onClick: () => void;
}

export default function WorkRow({ item, onClick }: WorkRowProps) {
  const { label, date } = getWorkRowMeta(item);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full min-w-0 flex-col gap-1 border-t border-black/10 py-3 text-left last:border-b sm:flex-row sm:items-baseline sm:justify-between sm:gap-5"
      aria-label={`Open ${label}`}
    >
      <span className="min-w-0 truncate text-[12px] tracking-[-0.01em] text-neutral-800 transition-colors group-hover:text-black md:text-[13px]">
        {label}
      </span>
      <span className="shrink-0 text-[10px] text-neutral-500 md:text-[11px]">
        {date}
      </span>
    </button>
  );
}
