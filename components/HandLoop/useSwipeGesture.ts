'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Tunable swipe-detection thresholds.
// All x-values are in normalized [0..1] space (MediaPipe landmark coords),
// already mirrored by the caller so that "user swipes right" => dx > 0.
// ---------------------------------------------------------------------------
const BUFFER_MS = 300;          // rolling-window length for the wrist-x trail
const MIN_DISPLACEMENT = 0.20;  // total |dx| across the window (frame-fraction)
const MIN_VELOCITY = 0.7;       // |dx/dt| in normalized-units per second
const DEBOUNCE_MS = 400;        // one gesture = one event, prevents double-fire
// ---------------------------------------------------------------------------

export type SwipeDirection = 'left' | 'right';
export type GestureState = 'idle' | SwipeDirection;

interface Sample {
  x: number;
  t: number;
}

export function useSwipeGesture(onSwipe: (dir: SwipeDirection) => void) {
  const samplesRef = useRef<Sample[]>([]);
  const lastFireRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSwipeRef = useRef(onSwipe);
  const [gesture, setGesture] = useState<GestureState>('idle');

  useEffect(() => {
    onSwipeRef.current = onSwipe;
  }, [onSwipe]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  const pushSample = useCallback((x: number, t: number) => {
    const buf = samplesRef.current;
    buf.push({ x, t });
    while (buf.length && buf[0].t < t - BUFFER_MS) buf.shift();

    if (t - lastFireRef.current < DEBOUNCE_MS) return;
    if (buf.length < 2) return;

    const first = buf[0];
    const last = buf[buf.length - 1];
    const dx = last.x - first.x;
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return;
    const v = dx / dt;

    if (Math.abs(dx) < MIN_DISPLACEMENT) return;
    if (Math.abs(v) < MIN_VELOCITY) return;

    const dir: SwipeDirection = dx > 0 ? 'right' : 'left';
    lastFireRef.current = t;
    onSwipeRef.current(dir);
    setGesture(dir);
    samplesRef.current = []; // clear buffer so the same swipe can't re-fire
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setGesture('idle'), DEBOUNCE_MS);
  }, []);

  const reset = useCallback(() => {
    samplesRef.current = [];
  }, []);

  return { pushSample, reset, gesture };
}
