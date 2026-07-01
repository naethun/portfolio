'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import type { UniverseMedia } from '@/lib/getUniverseMedia';
import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { HUD } from '@/components/HandLoop/HUD';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import {
  useUniverseGestures,
  type GestureState,
} from '@/components/ImageUniverse/useUniverseGestures';

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

function cameraLabel(state: CameraState): string {
  switch (state) {
    case 'requesting':
      return 'REQUESTING CAMERA…';
    case 'denied':
      return 'CAMERA DENIED · TAP TO RETRY';
    case 'unsupported':
      return 'CAMERA UNSUPPORTED';
    case 'insecure':
      return 'USE HTTPS OR LOCALHOST';
    default:
      return 'ENABLE HAND GESTURES';
  }
}

function gestureHint(state: GestureState): string {
  switch (state) {
    case 'armed':
      return 'NOW OPEN BOTH HANDS INTO AN L →';
    case 'globe':
      return 'GLOBE · RELAX HANDS TO RELEASE';
    default:
      return 'PINCH BOTH HANDS (THUMB + INDEX) TO BEGIN';
  }
}

export default function LoopClient({ media }: { media: UniverseMedia[] }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const formationTargetRef = useRef(0);
  const [gesture, setGesture] = useState<GestureState>('natural');

  const { state: cameraState, enable, disable } = useCameraStream({ videoRef });
  const cameraEnabled = cameraState === 'granted';

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
  }, []);
  const { ready } = useHandTracking({
    videoRef,
    enabled: cameraEnabled,
    onResult,
  });

  const onState = useCallback((s: GestureState) => setGesture(s), []);
  useUniverseGestures({
    landmarksRef,
    enabled: cameraEnabled,
    formationTargetRef,
    onState,
  });

  // Keyboard fallback for the globe (no webcam needed): press "G" to toggle.
  // The gesture layer owns the formation while the camera is on.
  useEffect(() => {
    if (cameraEnabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        formationTargetRef.current = formationTargetRef.current > 0.5 ? 0 : 1;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cameraEnabled]);

  return (
    <div className="relative h-[100svh] w-full">
      <ImageUniverse media={media} formationTargetRef={formationTargetRef} />

      {/* Hidden video feeding the hand landmarker (kept decoding: 1px, opacity-0). */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
      />

      {/* Camera + hand-skeleton window (draggable), shown once the camera is on. */}
      <HUD videoRef={videoRef} landmarksRef={landmarksRef} cameraEnabled={cameraEnabled} />

      {/* Bottom-center control / guidance strip. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-5">
        {!cameraEnabled ? (
          <button
            type="button"
            onClick={enable}
            disabled={cameraState === 'requesting'}
            className="pointer-events-auto rounded-full border border-neutral-300 bg-white/80 px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-neutral-700 shadow-sm backdrop-blur transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-60"
          >
            {cameraLabel(cameraState)}
          </button>
        ) : (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neutral-600 backdrop-blur">
            <span>{ready ? gestureHint(gesture) : 'LOADING HAND MODEL…'}</span>
            <button
              type="button"
              onClick={disable}
              aria-label="Turn off camera"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              ✕ CAMERA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
