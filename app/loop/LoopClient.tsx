'use client';

import dynamic from 'next/dynamic';
import type { UniverseMedia } from '@/lib/getUniverseMedia';

// three.js + WebGL is client-only, so load with SSR disabled.
const ImageUniverse = dynamic(
  () => import('@/components/ImageUniverse/ImageUniverse'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs tracking-[0.2em] text-neutral-500">
        LOADING…
      </div>
    ),
  },
);

export default function LoopClient({ media }: { media: UniverseMedia[] }) {
  return (
    <div className="relative h-[100svh] w-full">
      <ImageUniverse media={media} />
    </div>
  );
}
