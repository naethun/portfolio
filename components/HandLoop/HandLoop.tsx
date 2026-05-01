'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useHandTracking } from './useHandTracking';
import { useSwipeGesture, type SwipeDirection } from './useSwipeGesture';
import { useHandShape } from './useHandShape';
import { useHandFacing } from './useHandFacing';
import { usePinch, type HandLandmarks } from './usePinch';
import { HUD } from './HUD';
import { Timeline, type TimelineHandle, type TimelineMode } from './Timeline';

interface LoopImage {
  src: string;
  filename: string;
}

interface Props {
  images: LoopImage[];
  frameless?: boolean;
}

type CameraState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure';

const TOUCH_SWIPE_PX = 50;

export default function HandLoop({ images, frameless = false }: Props) {
  const [index, setIndex] = useState(0);
  const [frontIndex, setFrontIndex] = useState(0);
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('cluster');
  const [clusterAngle, setClusterAngle] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const primaryHandRef = useRef<HandLandmarks | null>(null);
  const secondaryHandRef = useRef<HandLandmarks | null>(null);
  const timelineRef = useRef<TimelineHandle | null>(null);

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

  const scrubHelix = useCallback((dir: SwipeDirection) => {
    timelineRef.current?.scrub(dir);
  }, []);

  const onSwipe = useCallback(
    (dir: SwipeDirection) => {
      if (timelineMode === 'cluster') spinCluster(dir);
      else scrubHelix(dir);
    },
    [timelineMode, scrubHelix, spinCluster]
  );

  const { pushSample, gesture } = useSwipeGesture(onSwipe);

  const handleResult = useCallback(
    (result: HandLandmarkerResult, t: number) => {
      landmarksRef.current = result;

      // Split detected hands by handedness label. With selfie-mirrored input,
      // MediaPipe's "Right" is the user's right hand — we make that primary.
      let primary: HandLandmarks | null = null;
      let secondary: HandLandmarks | null = null;
      const hands = result.handedness ?? [];
      for (let i = 0; i < hands.length; i++) {
        const label = hands[i]?.[0]?.categoryName;
        const lm = result.landmarks[i] as HandLandmarks | undefined;
        if (!lm) continue;
        if (label === 'Right' && !primary) primary = lm;
        else if (label === 'Left' && !secondary) secondary = lm;
      }
      primaryHandRef.current = primary;
      secondaryHandRef.current = secondary;

      // Swipes are driven by the primary hand's wrist x. Mirror raw x so the
      // user's perceived "swipe right" produces dx > 0.
      if (primary) pushSample(1 - primary[0].x, t);
    },
    [pushSample]
  );

  const cameraEnabled = cameraState === 'granted';
  const { ready, fps } = useHandTracking({
    videoRef,
    enabled: cameraEnabled,
    onResult: handleResult,
  });

  const handShape = useHandShape(primaryHandRef, cameraEnabled);
  const handFacing = useHandFacing(primaryHandRef, cameraEnabled);
  const primaryPinch = usePinch(primaryHandRef, cameraEnabled);
  const secondaryPinch = usePinch(secondaryHandRef, cameraEnabled);

  // Mode is derived deterministically from per-hand state. 'unknown' shape is
  // sticky so the mode doesn't flicker when the hand momentarily blurs out.
  // Pinches still take priority — they're a deliberate two-finger gesture and
  // shouldn't be swallowed by the palm-facing deck mode.
  useEffect(() => {
    if (handShape === 'closed') {
      setTimelineMode('cluster');
    } else if (handShape === 'open') {
      if (primaryPinch && secondaryPinch) setTimelineMode('ring-zoom');
      else if (primaryPinch) setTimelineMode('ring');
      else if (handFacing === 'palmar') setTimelineMode('deck');
      else setTimelineMode('helix');
    }
  }, [handShape, handFacing, primaryPinch, secondaryPinch]);

  // Mobile / coarse pointer: no palm-shape input, default to helix.
  useEffect(() => {
    if (isCoarsePointer) setTimelineMode('helix');
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
      const dir: SwipeDirection | null =
        e.key === 'ArrowRight' ? 'right' : e.key === 'ArrowLeft' ? 'left' : null;
      if (!dir) return;
      if (timelineMode === 'cluster') advance(dir);
      else scrubHelix(dir);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, scrubHelix, timelineMode]);

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
        // touch convention: swipe right = previous
        scrubHelix(dx > 0 ? 'left' : 'right');
      }
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isCoarsePointer, scrubHelix]);

  // Camera teardown on unmount.
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
      <div className="flex h-full w-full items-center justify-center font-mono text-neutral-500">
        <div className="text-sm">
          NO IMAGES FOUND IN public/portfolio/loop-imgs/
        </div>
      </div>
    );
  }

  const current = images[timelineMode === 'cluster' ? index : frontIndex];
  const filename = current.filename;
  const mainTitle = `moodboard.app — ${filename}`;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Timeline
        ref={timelineRef}
        images={images}
        index={index}
        mode={timelineMode}
        clusterAngle={clusterAngle}
        onFrontChange={setFrontIndex}
        title={mainTitle}
        frameless={frameless}
        info={{
          frontIndex,
          total,
          handShape,
          handFacing,
          pinch: { primary: primaryPinch, secondary: secondaryPinch },
          gesture,
          fps,
          status,
        }}
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
            className="rounded-md border border-black/20 bg-white px-6 py-3 font-mono text-xs tracking-[0.2em] text-neutral-700 shadow-lg transition hover:border-black hover:bg-black hover:text-white"
          >
            ENABLE CAMERA
          </button>
        </div>
      )}

      <HUD
        videoRef={videoRef}
        landmarksRef={landmarksRef}
        cameraEnabled={cameraEnabled}
      />
    </div>
  );
}
