'use client';

import { useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useCameraStream } from '../ImageUniverse/useCameraStream';
import { ARCameraBackdrop } from './ARCameraBackdrop';
import { ARSymbolOverlay } from './ARSymbolOverlay';
import type { FrameSize, VideoSize } from './cameraProjection';
import { useGestureSymbolState } from './useGestureSymbolState';

/**
 * Gesture Symbols — camera-first AR symbols driven by hand gestures.
 *
 * Composes the opt-in camera stream, hidden MediaPipe tracking, the
 * gesture->symbol state layer, and the AR renderer. Keyboard fallback
 * (1-4, i, arrows) works in every camera state.
 */
export function GestureSymbolsExperience() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const [frameSize, setFrameSize] = useState<FrameSize | null>(null);
  const [videoSize, setVideoSize] = useState<VideoSize | null>(null);
  const { state: cameraState, enable } = useCameraStream({ videoRef });
  const { state, palmAnchor, handDetected, debug } = useGestureSymbolState({
    videoRef,
    landmarksResultRef: landmarksRef,
    trackingEnabled: cameraState === 'granted',
  });

  const showEnable =
    cameraState === 'idle' ||
    cameraState === 'requesting' ||
    cameraState === 'denied';
  const cameraOn = cameraState === 'granted';
  const statusText =
    cameraState === 'unsupported'
      ? 'camera unsupported'
      : cameraState === 'insecure'
        ? 'secure context required'
        : cameraState === 'denied'
          ? 'camera denied'
          : cameraState;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;

    let raf = 0;
    const update = () => {
      const rect = root.getBoundingClientRect();
      const next = {
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      };
      setFrameSize((prev) =>
        prev && prev.width === next.width && prev.height === next.height
          ? prev
          : next
      );
    };

    const ro = new ResizeObserver(() => update());
    ro.observe(root);
    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!cameraOn) return;

    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      const width = video?.videoWidth ?? 0;
      const height = video?.videoHeight ?? 0;

      if (width > 0 && height > 0) {
        const next = { width, height };
        setVideoSize((prev) =>
          prev && prev.width === next.width && prev.height === next.height
            ? prev
            : next
        );
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraOn]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden bg-black text-white"
    >
      <ARCameraBackdrop videoRef={videoRef} cameraEnabled={cameraOn} />

      <ARSymbolOverlay
        state={state}
        palmAnchor={palmAnchor}
        frameSize={frameSize}
        videoSize={cameraOn ? videoSize : null}
        fallbackVisible={!cameraOn}
      />

      {showEnable && (
        <button
          type="button"
          onClick={enable}
          disabled={cameraState === 'requesting'}
          className="absolute bottom-6 left-1/2 min-h-11 -translate-x-1/2 border border-white/45 bg-black/35 px-4 py-2 text-[11px] uppercase text-white backdrop-blur-sm transition-colors hover:border-white disabled:opacity-50"
        >
          {cameraState === 'requesting' ? 'requesting camera...' : 'enable camera'}
        </button>
      )}

      {(cameraState === 'unsupported' ||
        cameraState === 'insecure' ||
        cameraState === 'denied') && (
        <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 text-[11px] uppercase text-white/65">
          {statusText}
        </div>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div
          className="pointer-events-none absolute left-3 top-3 text-[10px] leading-relaxed text-white/60"
        >
          <div>cam:{cameraState}</div>
          <div>
            sym:{state.symbol} pol:{state.polarity} src:{state.source}
          </div>
          <div>
            hand:{handDetected ? 'y' : 'n'} {debug.shape}/{debug.facing}
            /{debug.extendedFingers}f
          </div>
          <div>palm:{palmAnchor ? 'y' : 'n'}</div>
        </div>
      )}
    </div>
  );
}
