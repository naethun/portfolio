'use client';

import type { WorkItem } from '@/types/portfolio';
import { FolderIcon } from '@/components/Finder/icons';
import { getWorkRowMeta } from './workIndex.mjs';

// Shared by the column header and every row so the columns line up.
export const WORK_LIST_COLUMNS = 'md:grid-cols-[18px_minmax(0,1fr)_minmax(0,1.25fr)_136px]';

interface WorkRowProps {
  item: WorkItem;
  onClick: (opener: HTMLElement) => void;
  striped: boolean;
}

export default function WorkRow({ item, onClick, striped }: WorkRowProps) {
  const { name, role, date } = getWorkRowMeta(item);

  return (
    <li className={striped ? 'bg-[#f6f6f6]' : undefined}>
      <button
        type="button"
        onClick={(event) => onClick(event.currentTarget)}
        aria-label={`Open ${name}`}
        className={`grid min-h-14 w-full grid-cols-[18px_minmax(0,1fr)] items-center gap-x-2.5 px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04] md:min-h-11 md:gap-x-3 md:py-0 ${WORK_LIST_COLUMNS}`}
      >
        <FolderIcon className="h-[13px] w-4" />
        <span className="min-w-0">
          <span className="block truncate text-sm text-neutral-950 md:text-[13px]">{name}</span>
          <span className="block text-[12.5px] leading-snug text-[#6b6b6b] md:hidden">
            {role} · <span className="whitespace-nowrap">{date}</span>
          </span>
        </span>
        <span className="hidden truncate text-[13px] text-[#3a3a3a] md:block">{role}</span>
        <span className="hidden text-right text-[13px] tabular-nums text-[#6b6b6b] md:block">{date}</span>
      </button>
    </li>
  );
}
