import type { CSSProperties, ReactNode } from 'react';

import { MacWindow } from '@/components/HandLoop/MacWindow';

type ReelsStageWindowSlot = 'top' | 'bottom' | 'full';

const slotStyles: Record<ReelsStageWindowSlot, CSSProperties> = {
  top: { left: '8%', right: '8%', top: '7.8%', height: '38.4%' },
  bottom: { left: '8%', right: '8%', top: '47.15%', bottom: '7.8%' },
  full: { left: '8%', right: '8%', top: '7.8%', bottom: '7.8%' },
};

export function ReelsStageWindow({
  slot,
  title,
  contentClassName,
  children,
}: {
  slot: ReelsStageWindowSlot;
  title: string;
  contentClassName: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute" style={slotStyles[slot]}>
      <MacWindow
        title={title}
        className="flex h-full w-full flex-col"
        contentClassName={contentClassName}
      >
        {children}
      </MacWindow>
    </div>
  );
}
