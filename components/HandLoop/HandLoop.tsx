'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useHandTracking } from './useHandTracking';
import { useSwipeGesture, type SwipeDirection } from './useSwipeGesture';
import { useHandShape } from './useHandShape';
import { HUD } from './HUD';
import { Timeline, type TimelineMode } from './Timeline';

interface LoopImage {
  src: string;
  filename: string;
}

interface Props {
  images: LoopImage[];
}

type CameraState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure';

const TOUCH_SWIPE_PX = 50;

export default function HandLoop({ images }: Props) {
  const [index, setIndex] = useState(0);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('cluster');
  const [clusterAngle, setClusterAngle] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);

  const total = images.length;

  const advance = useCallback(
    (dir: SwipeDirection) => {
      if (total === 0) return;
      setIndex((i) =>
        dir === 'right' ? (i + 1) % total : (i - 1 + total) % total
      );
    },
    [total]
  );

  const spinCluster = useCallback((dir: SwipeDirection) => {
    setClusterAngle((a) => a + (dir === 'right' ? 25 : -25));
  }, []);

  const onSwipe = useCallback(
    (dir: SwipeDirection) => {
      if (timelineMode === 'open') advance(dir);
      else spinCluster(dir);
    },
    [timelineMode, advance, spinCluster]
  );

  const { pushSample, gesture } = useSwipeGesture(onSwipe);

  const handleResult = useCallback(
    (result: HandLandmarkerResult, t: number) => {
      landmarksRef.current = result;
      if (result.landmarks.length === 0) return;
      const wrist = result.landmarks[0][0];
      // Mirror raw x so dx>0 corresponds to the user's perceived "swipe right"
      // (raw landmark x increases L→R from the camera's POV; we mirror the
      // preview, so the user's right edge of frame is x=0 in raw coords).
      pushSample(1 - wrist.x, t);
    },
    [pushSample]
  );

  const cameraEnabled = cameraState === 'granted';
  const { ready, fps } = useHandTracking({
    videoRef,
    enabled: cameraEnabled,
    onResult: handleResult,
  });

  const handShape = useHandShape(landmarksRef, cameraEnabled);

  // Drive timelineMode from palm shape. 'unknown' is sticky — we only flip on
  // a confirmed open or closed hand.
  useEffect(() => {
    if (handShape === 'open') setTimelineMode('open');
    else if (handShape === 'closed') setTimelineMode('cluster');
  }, [handShape]);

  // Mobile / coarse pointer: no palm-shape input, default to open carousel.
  useEffect(() => {
    if (isCoarsePointer) setTimelineMode('open');
  }, [isCoarsePointer]);

  // Detect coarse pointer (mobile). Skip camera UI; touch swipe instead.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setIsCoarsePointer(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Keyboard arrow nav — always active.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance('right');
      else if (e.key === 'ArrowLeft') advance('left');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  // Touch swipe fallback on coarse-pointer devices.
  useEffect(() => {
    if (!isCoarsePointer) return;
    let startX = 0;
    let startT = 0;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startT = e.timeStamp;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dt = e.timeStamp - startT;
      if (Math.abs(dx) >= TOUCH_SWIPE_PX && dt < 800) {
        advance(dx > 0 ? 'left' : 'right'); // touch convention: swipe right = previous
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isCoarsePointer, advance]);

  // Camera teardown on unmount or state change away from granted.
  useEffect(() => {
    return () => {
      const s = streamRef.current;
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const enableCamera = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (window.isSecureContext === false) {
      // getUserMedia is only exposed on https / localhost. If the dev server is
      // reached via a LAN IP, mediaDevices will be undefined here.
      setCameraState('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('unsupported');
      return;
    }
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraState('granted');
    } catch (err) {
      console.warn('[HandLoop] camera denied', err);
      setCameraState('denied');
    }
  }, []);

  const status =
    total === 0
      ? 'NO IMAGES IN public/portfolio/loop-imgs/'
      : cameraState === 'idle' && !isCoarsePointer
        ? 'CAMERA OFF · ARROWS WORK'
        : cameraState === 'requesting'
          ? 'REQUESTING CAMERA…'
          : cameraState === 'denied'
            ? 'CAMERA DENIED · ARROWS WORK'
            : cameraState === 'unsupported'
              ? 'CAMERA UNSUPPORTED IN THIS BROWSER'
              : cameraState === 'insecure'
                ? 'INSECURE ORIGIN · USE localhost OR https'
                : isCoarsePointer
                ? 'TOUCH · SWIPE TO NAV'
                : ready
                  ? 'TRACKING'
                  : 'LOADING MODEL…';

  if (total === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-mono text-white">
        <div className="text-sm opacity-70">
          NO IMAGES FOUND IN public/portfolio/loop-imgs/
        </div>
      </div>
    );
  }

  const current = images[index];
  const filename = current.filename;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <Timeline
        images={images}
        index={index}
        mode={timelineMode}
        clusterAngle={clusterAngle}
      />

      {/* Hidden video element used as input for HandLandmarker. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
      />

      {/* Enable-camera CTA. Hidden once granted/denied or on coarse pointer. */}
      {!isCoarsePointer && cameraState === 'idle' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <button
            type="button"
            onClick={enableCamera}
            className="border border-white/60 bg-black/40 px-6 py-3 font-mono text-xs tracking-[0.2em] text-white backdrop-blur-sm transition hover:bg-white hover:text-black"
          >
            ENABLE CAMERA
          </button>
        </div>
      )}

      <HUD
        videoRef={videoRef}
        landmarksRef={landmarksRef}
        cameraEnabled={cameraEnabled}
        index={index}
        total={total}
        gesture={gesture}
        fps={fps}
        filename={filename}
        status={status}
        mode={timelineMode}
        handShape={handShape}
      />
    </div>
  );
}
