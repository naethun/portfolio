'use client';

import dynamic from 'next/dynamic';
import type { LoopImage } from '@/lib/getLoopImages';

const HandLoop = dynamic(() => import('@/components/HandLoop/HandLoop'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-[0.2em] text-neutral-400">
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
      className="relative z-10 h-[calc(100svh-160px)] min-h-[520px] w-full overflow-hidden md:h-[calc(100vh-180px)] md:min-h-[600px]"
    >
      <HandLoop images={images} />
    </section>
  );
}
