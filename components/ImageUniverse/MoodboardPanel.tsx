'use client';

import { Component, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';

import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableManifest } from '@/lib/shoppable/types';
import { InfoIcon } from '@/components/Finder/icons';
import UniverseExperience from './UniverseExperience';

let webglSupport: boolean | undefined;

function detectWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      webglSupport = gl !== null;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscribe = () => () => {};

interface MoodboardPanelProps {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
  /** Toolbar element the camera toggle renders into. */
  toolbarSlot: HTMLElement | null;
}

/**
 * The moodboard folder: the 3D universe when WebGL works, otherwise a flat grid
 * of the same images. Without this guard a missing WebGL context threw inside
 * ImageUniverse and took the whole page down.
 */
export default function MoodboardPanel({ media, shoppable, toolbarSlot }: MoodboardPanelProps) {
  const webgl = useSyncExternalStore(noSubscribe, detectWebGL, () => true);
  const fallback = <MoodboardFallback media={media} />;

  if (!webgl) return fallback;

  return (
    <MoodboardBoundary fallback={fallback}>
      <UniverseExperience
        media={media}
        shoppable={shoppable}
        className="relative h-full w-full"
        toolbarSlot={toolbarSlot}
      />
    </MoodboardBoundary>
  );
}

class MoodboardBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('The 3D moodboard failed to start; showing the flat moodboard instead.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function MoodboardFallback({ media }: { media: UniverseMedia[] }) {
  const images = media.filter((item) => item.type === 'image');

  return (
    <div className="h-full overflow-y-auto">
      <div role="status" className="mx-4 mt-4 flex items-start gap-3 rounded-[10px] bg-[#f5f5f5] px-4 py-3.5 text-[#6b6b6b] md:mx-6">
        <InfoIcon />
        <div>
          <p className="text-sm font-medium text-neutral-950">Showing the flat moodboard</p>
          <p className="mt-0.5 text-[13px] leading-[1.45]">
            The 3D view couldn’t start in this browser. Turning on hardware acceleration and reloading usually brings it
            back.
          </p>
        </div>
      </div>
      {images.length > 0 ? (
        <div className="columns-2 gap-3 px-4 pb-6 pt-4 md:columns-3 md:px-6">
          {images.map((item) => (
            <Image
              key={item.src}
              src={item.src}
              alt=""
              width={420}
              height={560}
              sizes="(max-width: 767px) 45vw, 170px"
              unoptimized={item.src.toLowerCase().endsWith('.gif')}
              className="mb-3 h-auto w-full break-inside-avoid rounded-md"
            />
          ))}
        </div>
      ) : (
        <p className="px-6 py-10 text-center text-sm text-[#6b6b6b]">No images in the moodboard yet.</p>
      )}
    </div>
  );
}
