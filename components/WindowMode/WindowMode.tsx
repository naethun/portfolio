'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import { SkeletonOverlay } from '@/components/HandLoop/SkeletonOverlay';
import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import { FacetedWindow } from './FacetedWindow';

function cameraLabel(state: CameraState): string {
  switch (state) {
    case 'requesting':
      return 'REQUESTING CAMERA...';
    case 'denied':
      return 'CAMERA DENIED';
    case 'unsupported':
      return 'CAMERA UNSUPPORTED';
    case 'insecure':
      return 'USE HTTPS OR LOCALHOST';
    default:
      return 'ENABLE CAMERA';
  }
}

export default function WindowMode() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const [handError, setHandError] = useState<string | null>(null);

  const { state: cameraState, enable } = useCameraStream({ videoRef });
  const cameraActive = cameraState === 'granted';
  const trackingActive = cameraActive && handError === null;

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
    setHandError(null);
  }, []);

  const onHandError = useCallback((err: unknown) => {
    landmarksRef.current = null;
    setHandError(err instanceof Error ? err.message : 'Hand model failed to load.');
  }, []);

  useHandTracking({
    videoRef,
    enabled: cameraActive,
    onResult,
    onError: onHandError,
  });

  useEffect(() => {
    if (cameraActive) return;
    landmarksRef.current = null;
  }, [cameraActive]);

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-black font-mono"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <div className="pointer-events-none absolute inset-0 z-10">
        <FacetedWindow
          landmarksRef={landmarksRef}
          videoRef={videoRef}
          enabled={trackingActive}
        />
      </div>
      <div className="absolute inset-0 z-20">
        <SkeletonOverlay
          landmarksRef={landmarksRef}
          videoRef={videoRef}
          enabled={cameraActive}
        />
      </div>

      {handError && cameraActive && (
        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-30 rounded-md border border-white/20 bg-black/60 p-3 text-[11px] leading-relaxed text-white/85 backdrop-blur">
          {handError}
        </div>
      )}

      {!cameraActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-6">
          <button
            type="button"
            onClick={enable}
            disabled={cameraState === 'requesting'}
            className="rounded-full border border-white/35 bg-black/45 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-white/90 backdrop-blur transition-colors hover:border-white hover:text-white disabled:opacity-60"
          >
            {cameraLabel(cameraState)}
          </button>
        </div>
      )}
    </div>
  );
}
