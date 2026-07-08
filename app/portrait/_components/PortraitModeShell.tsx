import type { ReactNode } from 'react';

export function PortraitModeShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden bg-[#f4f2ee]"
      style={{ aspectRatio: '9 / 16', height: '100vh', maxWidth: '100vw' }}
    >
      {children}
    </div>
  );
}
