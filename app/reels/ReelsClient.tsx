'use client';

import { useCallback, useRef } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import type { UniverseMedia } from '@/lib/getUniverseMedia';
import type { ShoppableManifest } from '@/lib/shoppable/types';
import { MacWindow } from '@/components/HandLoop/MacWindow';
import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import UniverseExperience from '@/components/ImageUniverse/UniverseExperience';
import { SkeletonOverlay } from './SkeletonOverlay';

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
      return 'ENABLE CAMERA';
  }
}

/**
 * The `/reels` recording stage: a 9:16 portrait frame with the shoppable 3D
 * image universe up top (`moodboard.app`) and a live webcam + hand-skeleton
 * window below (`camera.live`). One shared camera drives both — your gestures
 * morph the universe (globe / helix / flat) while you record. It's the old
 * HandLoop reels layout with the new `UniverseExperience` swapped into the top
 * window (which reads the shared landmarks in external-camera mode).
 */
export default function ReelsClient({
  media,
  shoppable,
}: {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
}) {
  const camRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);

  // This page owns the camera; the universe up top consumes its landmarks.
  const { state: cameraState, enable, disable } = useCameraStream({ videoRef: camRef });
  const cameraActive = cameraState === 'granted';

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
  }, []);
  const { ready } = useHandTracking({
    videoRef: camRef,
    enabled: cameraActive,
    onResult,
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div
        className="relative bg-white"
        style={{ aspectRatio: '9 / 16', height: '100vh', maxWidth: '100vw' }}
      >
        {/* Top: the shoppable image universe, gesture-driven by the shared camera. */}
        <div
          className="absolute inset-x-3 top-3"
          style={{ height: 'calc(60% - 18px)' }}
        >
          <MacWindow
            title="moodboard.app"
            className="flex h-full w-full flex-col"
            contentClassName="min-h-0 flex-1 bg-[#f4f2ee]"
          >
            <UniverseExperience
              media={media}
              shoppable={shoppable}
              externalLandmarksRef={landmarksRef}
              externalCameraActive={cameraActive}
              hideChrome
              className="relative h-full w-full"
            />
          </MacWindow>
        </div>

        {/* Bottom: the live camera + hand-skeleton overlay. */}
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
              className="h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <SkeletonOverlay
              landmarksRef={landmarksRef}
              videoRef={camRef}
              enabled={cameraActive}
            />

            {/* Camera control / status strip. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={enable}
                  disabled={cameraState === 'requesting'}
                  className="pointer-events-auto rounded-full border border-white/30 bg-black/50 px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-white/90 backdrop-blur transition-colors hover:border-white hover:text-white disabled:opacity-60"
                >
                  {cameraLabel(cameraState)}
                </button>
              ) : (
                <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-white/80 backdrop-blur">
                  <span>
                    {ready
                      ? 'PINCH→L = GLOBE · BOTH BACKS = HELIX · PALM+BACK = FLAT'
                      : 'LOADING HAND MODEL…'}
                  </span>
                  <button
                    type="button"
                    onClick={disable}
                    aria-label="Turn off camera"
                    className="text-white/50 transition-colors hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </MacWindow>
        </div>
      </div>
    </div>
  );
}
