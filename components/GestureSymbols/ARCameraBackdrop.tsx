'use client';

import type { RefObject } from 'react';

interface ARCameraBackdropProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraEnabled: boolean;
}

export function ARCameraBackdrop({
  videoRef,
  cameraEnabled,
}: ARCameraBackdropProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden="true">
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          cameraEnabled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: 'scaleX(-1)' }}
      />
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          cameraEnabled ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}
