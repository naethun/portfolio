'use client';

import type { ReactNode } from 'react';

interface MacWindowProps {
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function MacWindow({
  title,
  size = 'md',
  className = '',
  contentClassName = '',
  children,
}: MacWindowProps) {
  const isSm = size === 'sm';

  const wrapperBase = isSm
    ? 'rounded-lg shadow-xl'
    : 'rounded-xl shadow-2xl';

  const barPadding = isSm ? 'px-2 py-1.5' : 'px-3 py-2';
  const dotSize = isSm ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const titleSize = isSm ? 'text-[10px]' : 'text-[11px]';

  return (
    <div
      className={`overflow-hidden bg-neutral-100 ring-1 ring-black/10 ${wrapperBase} ${className}`}
    >
      <div
        className={`relative flex items-center gap-1.5 border-b border-black/10 bg-gradient-to-b from-neutral-100 to-neutral-200 ${barPadding}`}
      >
        <span className={`${dotSize} rounded-full bg-[#ff5f57]`} />
        <span className={`${dotSize} rounded-full bg-[#febc2e]`} />
        <span className={`${dotSize} rounded-full bg-[#28c840]`} />
        {title && (
          <span
            className={`pointer-events-none absolute left-1/2 -translate-x-1/2 select-none font-mono tracking-wider text-neutral-500 ${titleSize}`}
          >
            {title}
          </span>
        )}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
