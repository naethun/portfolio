'use client';

import dynamic from 'next/dynamic';

interface LoopImage {
  src: string;
  filename: string;
}

const HandLoop = dynamic(() => import('@/components/HandLoop/HandLoop'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-black font-mono text-xs tracking-[0.2em] text-white/60">
      LOADING…
    </div>
  ),
});

export default function LoopClient({ images }: { images: LoopImage[] }) {
  return (
    <div className="relative min-h-screen w-full">
      <HandLoop images={images} />
    </div>
  );
}
