'use client';

import type { Folder } from '@/types/portfolio';
import { FolderIcon } from './icons';

const folders: Folder[] = ['work', 'moodboard', 'contact'];

interface FolderNavProps {
  active: Folder;
  onSelect: (id: Folder) => void;
}

/** The Finder sidebar, from md up. */
export default function FinderSidebar({ active, onSelect }: FolderNavProps) {
  return (
    <nav aria-label="Folders">
      <p className="mb-1.5 mt-2 pl-2.5 text-xs font-semibold text-[#6e6e6e]">Favorites</p>
      <ul className="flex flex-col gap-0.5">
        {folders.map((id) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors ${
                  isActive ? 'bg-black/[0.07] text-neutral-950' : 'text-neutral-800 hover:bg-black/[0.04]'
                }`}
              >
                <FolderIcon />
                {id}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The same folders as a segmented switcher under the toolbar on phones. */
export function FolderTabs({ active, onSelect }: FolderNavProps) {
  return (
    <nav aria-label="Folders">
      <ul className="grid grid-cols-3 gap-0.5 rounded-[10px] bg-black/5 p-[3px]">
        {folders.map((id) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[13.5px] transition-colors ${
                  isActive ? 'bg-white text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.14)]' : 'text-neutral-700'
                }`}
              >
                <FolderIcon className="h-[13px] w-4" />
                {id}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
