'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type CameraState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'insecure';

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Override the video track constraints (defaults to highest-quality webcam). */
  constraints?: MediaTrackConstraints;
}

/**
 * Highest-quality webcam our hardware supports. `ideal` (not `exact`) so the
 * browser negotiates the best available mode and never fails: a Mac's built-in
 * FaceTime HD camera lands at native 1080p, and a higher-res external / Continuity
 * camera can go beyond it. 60fps preferred for smooth recording, falling back to 30.
 */
const HIGH_QUALITY_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  frameRate: { ideal: 60 },
  facingMode: 'user',
};

/**
 * Opt-in webcam stream for the gesture layer. Requests getUserMedia on `enable()`,
 * attaches the stream to the provided (hidden) <video>, and stops all tracks on
 * unmount / `disable()`. Mirrors the permission-state flow used by HandLoop.
 */
export function useCameraStream({ videoRef, constraints }: Options) {
  const [state, setState] = useState<CameraState>('idle');
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, [videoRef]);

  const enable = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (window.isSecureContext === false) {
      setState('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: constraints ?? HIGH_QUALITY_CONSTRAINTS,
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setState('granted');
    } catch (err) {
      console.warn('[useCameraStream] camera denied', err);
      setState('denied');
    }
  }, [videoRef, constraints]);

  const disable = useCallback(() => {
    stop();
    setState('idle');
  }, [stop]);

  // Stop the stream if the component unmounts while the camera is live.
  useEffect(() => () => stop(), [stop]);

  return { state, enable, disable };
}
