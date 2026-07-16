'use client';

import type { WorkItem } from '@/types/portfolio';
import WorkCard from './WorkCard';
import WorkRow from './WorkRow';
import { partitionWorkItems, workItemId } from './workIndex.mjs';

interface WorkGridProps {
  items: WorkItem[];
  onSelect: (id: string) => void;
}

export { workItemId };

export default function WorkGrid({ items, onSelect }: WorkGridProps) {
  const { highlights, other } = partitionWorkItems(items);

  return (
    <div className="h-full overflow-y-auto px-5 py-6 md:px-7 md:py-7">
      <section aria-labelledby="selected-work-heading">
        <h2
          id="selected-work-heading"
          className="mb-3 text-[11px] text-neutral-500"
        >
          selected work
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 md:gap-x-5 md:gap-y-6">
          {highlights.map((item) => (
            <WorkCard
              key={workItemId(item)}
              item={item}
              onClick={() => onSelect(workItemId(item))}
            />
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="other-work-heading">
        <h2
          id="other-work-heading"
          className="mb-2 text-[11px] text-neutral-500"
        >
          other work
        </h2>
        <div>
          {other.map((item) => (
            <WorkRow
              key={workItemId(item)}
              item={item}
              onClick={() => onSelect(workItemId(item))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
