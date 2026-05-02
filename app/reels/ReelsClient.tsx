'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { MacWindow } from '@/components/HandLoop/MacWindow';
import { SkeletonOverlay } from './SkeletonOverlay';

interface LoopImage {
  src: string;
  filename: string;
}

const HandLoop = dynamic(() => import('@/components/HandLoop/HandLoop'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-mono text-xs tracking-[0.2em] text-black/50">
      LOADING…
    </div>
  ),
});

const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 60, max: 60 },
  facingMode: 'user',
};

export default function ReelsClient({ images }: { images: LoopImage[] }) {
  const camRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const [streamLive, setStreamLive] = useState(false);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div
        className="relative bg-white"
        style={{ aspectRatio: '9 / 16', height: '100vh', maxWidth: '100vw' }}
      >
        <div
          className="absolute inset-x-3 top-3"
          style={{ height: 'calc(60% - 18px)' }}
        >
          <MacWindow
            title="moodboard.app"
            className="flex h-full w-full flex-col"
            contentClassName="min-h-0 flex-1 bg-white"
          >
            <HandLoop
              images={images}
              frameless
              hideHUD
              cameraConstraints={CAMERA_CONSTRAINTS}
              displayVideoRef={camRef}
              externalLandmarksRef={landmarksRef}
            />
          </MacWindow>
        </div>

        <div
          className="absolute inset-x-3 bottom-3"
          style={{ height: 'calc(40% - 18px)' }}
        >
          <MacWindow
            title="camera.live"
            className="flex h-full w-full flex-col"
            contentClassName="relative min-h-0 flex-1 bg-black"
          >
            <video
              ref={camRef}
              playsInline
              muted
              autoPlay
              onPlaying={() => setStreamLive(true)}
              onEmptied={() => setStreamLive(false)}
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <SkeletonOverlay
              landmarksRef={landmarksRef}
              videoRef={camRef}
              enabled={streamLive}
            />
          </MacWindow>
        </div>
      </div>
    </div>
  );
}
