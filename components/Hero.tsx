'use client';

import dynamic from 'next/dynamic';
import type { LoopImage } from '@/lib/getLoopImages';

const HandLoop = dynamic(() => import('@/components/HandLoop/HandLoop'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black font-mono text-xs tracking-[0.2em] text-white/60">
      LOADING…
    </div>
  ),
});

interface HeroProps {
  images: LoopImage[];
}

export default function Hero({ images }: HeroProps) {
  return (
    <section
      id="about"
      className="relative z-10 h-[calc(100vh-180px)] min-h-[600px] w-full overflow-hidden"
    >
      <HandLoop images={images} />
    </section>
  );
}
