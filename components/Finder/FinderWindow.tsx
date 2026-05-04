'use client';

import type { ReactNode } from 'react';

interface FinderWindowProps {
  title: string;
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function FinderWindow({
  title,
  sidebar,
  children,
  className = '',
}: FinderWindowProps) {
  return (
    <div
      className={`flex h-full min-h-[600px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/10 ${className}`}
    >
      {/* Titlebar */}
      <div className="relative flex items-center gap-1.5 border-b border-black/10 bg-gradient-to-b from-neutral-100 to-neutral-200 px-3 py-2">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 select-none font-mono text-[11px] tracking-wider text-neutral-600">
          {title}
        </span>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="border-b border-black/10 bg-neutral-50 px-4 py-4 md:w-48 md:border-b-0 md:border-r md:py-6 lg:w-56">
          {sidebar}
        </aside>
        <div className="relative min-h-0 flex-1 overflow-hidden bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
