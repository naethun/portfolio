'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

// Pinch detection: thumb-tip ↔ index-tip distance, normalized by hand size
// (wrist ↔ middle MCP) so it's invariant to how close the hand is to the camera.
const PINCH_THRESHOLD = 0.30;
const HYSTERESIS_MS = 80;

interface Pt { x: number; y: number; z: number }
export type HandLandmarks = ReadonlyArray<Pt>;

function dist3D(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function usePinch(
  handRef: RefObject<HandLandmarks | null>,
  enabled: boolean
): boolean {
  const [pinching, setPinching] = useState(false);
  const pendingRef = useRef<{ raw: boolean; since: number } | null>(null);
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      publishedRef.current = false;
      pendingRef.current = null;
      const resetId = requestAnimationFrame(() => setPinching(false));
      return () => cancelAnimationFrame(resetId);
    }
    let rafId = 0;
    const tick = (t: number) => {
      const lm = handRef.current;
      let raw = false;
      if (lm && lm.length >= 21) {
        const handsize = dist3D(lm[0], lm[9]);
        if (handsize > 0) {
          const ratio = dist3D(lm[4], lm[8]) / handsize;
          raw = ratio < PINCH_THRESHOLD;
        }
      }

      const pending = pendingRef.current;
      if (!pending || pending.raw !== raw) {
        pendingRef.current = { raw, since: t };
      } else if (
        t - pending.since >= HYSTERESIS_MS &&
        publishedRef.current !== raw
      ) {
        publishedRef.current = raw;
        setPinching(raw);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, handRef]);

  return enabled ? pinching : false;
}
