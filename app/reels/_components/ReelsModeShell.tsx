import type { ReactNode } from 'react';

export function ReelsModeShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div
        className="relative overflow-hidden bg-[#d1d1d6]"
        style={{ aspectRatio: '9 / 16', height: '100vh', maxWidth: '100vw' }}
      >
        {children}
      </div>
    </div>
  );
}
