'use client';

import type { WorkItem } from '@/types/portfolio';
import WorkCard from './WorkCard';

interface WorkGridProps {
  items: WorkItem[];
  onSelect: (id: string) => void;
}

export function workItemId(item: WorkItem): string {
  return `${item.kind}-${item.data.id}`;
}

export default function WorkGrid({ items, onSelect }: WorkGridProps) {
  return (
    <div className="h-full overflow-y-auto px-5 py-6 md:px-7 md:py-7">
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, idx) => (
          <WorkCard
            key={workItemId(item)}
            item={item}
            index={idx}
            onClick={() => onSelect(workItemId(item))}
          />
        ))}
      </div>
    </div>
  );
}
