'use client';

import type { Folder } from '@/types/portfolio';

const items: { id: Folder; label: string; color: string }[] = [
  { id: 'work', label: 'work', color: '#7aa2e3' },
  { id: 'moodboard', label: 'moodboard', color: '#7aa2e3' },
  { id: 'contact', label: 'contact', color: '#7aa2e3' },
];

interface FinderSidebarProps {
  active: Folder;
  onSelect: (id: Folder) => void;
}

export default function FinderSidebar({ active, onSelect }: FinderSidebarProps) {
  return (
    <nav aria-label="Finder favorites">
      <p className="mb-3 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-500 md:block">
        Favorites
      </p>

      {/* Mobile: horizontal pills */}
      <ul className="flex flex-row gap-2 overflow-x-auto md:hidden">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                  isActive
                    ? 'bg-black/8 text-neutral-900'
                    : 'text-neutral-600 hover:bg-black/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Desktop: vertical list */}
      <ul className="hidden flex-col gap-1 md:flex">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left font-mono text-sm transition-colors ${
                  isActive
                    ? 'bg-black/8 text-neutral-900'
                    : 'text-neutral-600 hover:bg-black/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
