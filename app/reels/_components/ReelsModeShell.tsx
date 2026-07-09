import type { ReactNode } from 'react';

interface ReelsModeShellProps {
  children: ReactNode;
  aspectRatio?: string;
}

export function ReelsModeShell({
  children,
  aspectRatio = '9 / 16',
}: ReelsModeShellProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div
        className="relative overflow-hidden bg-[#d1d1d6]"
        style={{ aspectRatio, height: '100vh', maxWidth: '100vw' }}
      >
        {children}
      </div>
    </div>
  );
}
