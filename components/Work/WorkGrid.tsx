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
    <div className="h-full overflow-y-auto px-6 py-7 md:px-9 md:py-9">
      <div className="grid grid-cols-2 gap-5 md:gap-6">
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
