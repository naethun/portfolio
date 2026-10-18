'use client';

import type { WorkItem } from '@/types/portfolio';
import WorkCard from './WorkCard';
import WorkRow, { WORK_LIST_COLUMNS } from './WorkRow';
import { partitionWorkItems, workItemId } from './workIndex.mjs';

export type WorkView = 'icons' | 'list';

/** `opener` is the clicked card or row, so focus can return to it after the case study closes. */
type SelectWork = (id: string, opener: HTMLElement) => void;

interface WorkGridProps {
  items: WorkItem[];
  onSelect: SelectWork;
  view: WorkView;
}

export { workItemId };

export default function WorkGrid({ items, onSelect, view }: WorkGridProps) {
  if (view === 'list') {
    return (
      <div className="px-4 pb-6 pt-4 md:px-6 md:pt-5">
        <WorkList items={items} onSelect={onSelect} />
      </div>
    );
  }

  const { highlights, other } = partitionWorkItems(items);

  return (
    <div className="px-4 pb-6 pt-4 md:px-6 md:pt-5">
      <section aria-labelledby="selected-work-heading">
        <h3
          id="selected-work-heading"
          className="mb-3.5 border-b border-black/[0.08] pb-2 text-[13px] font-semibold text-neutral-900"
        >
          selected work
        </h3>
        <div className="grid grid-cols-2 items-start gap-x-3 gap-y-[18px] md:gap-x-4 md:gap-y-5">
          {highlights.map((item) => (
            <WorkCard key={workItemId(item)} item={item} onClick={(opener) => onSelect(workItemId(item), opener)} />
          ))}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="other-work-heading">
        <h3 id="other-work-heading" className="mb-1.5 text-[13px] font-semibold text-neutral-900">
          other work
        </h3>
        <WorkList items={other} onSelect={onSelect} />
      </section>
    </div>
  );
}

function WorkList({ items, onSelect }: { items: WorkItem[]; onSelect: SelectWork }) {
  return (
    <>
      <div
        aria-hidden="true"
        className={`hidden h-7 items-center gap-x-3 border-b border-black/[0.08] px-2.5 text-xs font-medium text-[#6e6e6e] md:grid ${WORK_LIST_COLUMNS}`}
      >
        <span />
        <span>Name</span>
        <span>Role</span>
        <span className="text-right">Date</span>
      </div>
      <ul className="border-t border-black/[0.08] md:border-t-0">
        {items.map((item, i) => (
          <WorkRow
            key={workItemId(item)}
            item={item}
            striped={i % 2 === 0}
            onClick={(opener) => onSelect(workItemId(item), opener)}
          />
        ))}
      </ul>
    </>
  );
}
