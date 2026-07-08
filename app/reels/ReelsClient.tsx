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
  const { state: cameraState, enable } = useCameraStream({ videoRef: camRef });
  const cameraActive = cameraState === 'granted';

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
  }, []);
  useHandTracking({
    videoRef: camRef,
    enabled: cameraActive,
    onResult,
  });

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      {/* Upload-native 9:16 reel canvas (1080×1920). The 8% side margins look
          wide in the browser on purpose: tall phones display reels filled to
          screen height, cropping ~4% off each side — what remains on-screen
          matches the reference screenshot's composition. Vertical proportions
          are unaffected by that crop. */}
      <div
        className="relative overflow-hidden bg-[#d1d1d6]"
        style={{ aspectRatio: '9 / 16', height: '100vh', maxWidth: '100vw' }}
      >
        {/* Top: the shoppable image universe, gesture-driven by the shared camera.
            Both windows keep the reference's 42:49 height ratio, scaled down so
            the bottom margin equals the top's 7.8% (IG zooms in a bit anyway). */}
        <div
          className="absolute"
          style={{ left: '8%', right: '8%', top: '7.8%', height: '38.4%' }}
        >
          <MacWindow
            title="moodboard.app"
            className="flex h-full w-full flex-col"
            contentClassName="min-h-0 flex-1 bg-white"
          >
            <UniverseExperience
              media={media}
              shoppable={shoppable}
              externalLandmarksRef={landmarksRef}
              externalCameraActive={cameraActive}
              hideChrome
              background="#ffffff"
              className="relative h-full w-full"
            />
          </MacWindow>
        </div>

        {/* Bottom: the live camera + hand-skeleton overlay. */}
        <div
          className="absolute"
          style={{ left: '8%', right: '8%', top: '47.15%', bottom: '7.8%' }}
        >
          <MacWindow
            title="camera"
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

            {/* Camera enable button — only before the camera is on. Once live,
                nothing overlays the frame (clean for recording). */}
            {!cameraActive && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-4">
                <button
                  type="button"
                  onClick={enable}
                  disabled={cameraState === 'requesting'}
                  className="pointer-events-auto rounded-full border border-white/30 bg-black/50 px-5 py-2.5 text-[12px] font-medium tracking-[0.12em] text-white/90 backdrop-blur transition-colors hover:border-white hover:text-white disabled:opacity-60"
                  style={{
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
                  }}
                >
                  {cameraLabel(cameraState)}
                </button>
              </div>
            )}
          </MacWindow>
        </div>
      </div>
    </div>
  );
}
