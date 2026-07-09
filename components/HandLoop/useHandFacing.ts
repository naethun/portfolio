'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarks } from './usePinch';

// Palm orientation from MediaPipe hand landmarks. Computes the palm normal
// from the cross product of (wrist→index MCP) × (wrist→pinky MCP) and
// classifies based on the sign of its z-component.
//
// PALMAR_SIGN encodes which sign of n.z corresponds to the palm facing the
// camera for the user's right hand under this app's mirrored selfie pipeline.
// Calibrated empirically — flip the sign if palmar/dorsal read inverted.
const PALMAR_SIGN = 1;
const FACING_EPS = 0.005;
const HYSTERESIS_MS = 150;

export type HandFacing = 'palmar' | 'dorsal' | 'unknown';

function classify(lm: HandLandmarks): HandFacing {
  const w = lm[0];
  const idx = lm[5];
  const pky = lm[17];
  const v1x = idx.x - w.x;
  const v1y = idx.y - w.y;
  const v2x = pky.x - w.x;
  const v2y = pky.y - w.y;
  const nz = v1x * v2y - v1y * v2x;
  if (Math.abs(nz) < FACING_EPS) return 'unknown';
  return Math.sign(nz) === PALMAR_SIGN ? 'palmar' : 'dorsal';
}

export function useHandFacing(
  handRef: RefObject<HandLandmarks | null>,
  enabled: boolean
): HandFacing {
  const [facing, setFacing] = useState<HandFacing>('unknown');
  const pendingRef = useRef<{ facing: HandFacing; since: number } | null>(null);
  const publishedRef = useRef<HandFacing>('unknown');

  useEffect(() => {
    if (!enabled) {
      publishedRef.current = 'unknown';
      pendingRef.current = null;
      const resetId = requestAnimationFrame(() => setFacing('unknown'));
      return () => cancelAnimationFrame(resetId);
    }
    let rafId = 0;
    const tick = (t: number) => {
      const lm = handRef.current;
      const raw: HandFacing = lm && lm.length >= 21 ? classify(lm) : 'unknown';

      const pending = pendingRef.current;
      if (!pending || pending.facing !== raw) {
        pendingRef.current = { facing: raw, since: t };
      } else if (
        t - pending.since >= HYSTERESIS_MS &&
        publishedRef.current !== raw
      ) {
        publishedRef.current = raw;
        setFacing(raw);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, handRef]);

  return enabled ? facing : 'unknown';
}
