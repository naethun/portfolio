'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarks } from './usePinch';

// "Picture-frame" gesture: both hands form an L with thumb + index extended
// and middle/ring/pinky curled. Mimes holding up a viewfinder. Used as the
// entry gesture for cube mode.

// TUNE: extended-finger ratio for non-thumb fingers (matches useHandShape).
const EXTEND_RATIO = 1.15;
// TUNE: extended-finger ratio for thumb (looser — thumb is shorter and rarely
// "extends" past 1.15× even when fully outstretched).
const THUMB_EXTEND_RATIO = 1.05;
// TUNE: how many of middle/ring/pinky may register as extended without
// disqualifying the L (allows partial curl, hand-jitter slack).
const MAX_OTHER_EXTENDED = 1;
// TUNE: hold time before publishing a state flip.
const HYSTERESIS_MS = 150;

interface Pt {
  x: number;
  y: number;
  z: number;
}

function dist3D(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function fingerExtended(lm: HandLandmarks, tip: number, mcp: number): boolean {
  return dist3D(lm[tip], lm[0]) > dist3D(lm[mcp], lm[0]) * EXTEND_RATIO;
}

function isLShape(lm: HandLandmarks): boolean {
  // Thumb extended (looser ratio).
  if (dist3D(lm[4], lm[0]) <= dist3D(lm[2], lm[0]) * THUMB_EXTEND_RATIO) {
    return false;
  }
  // Index must be extended.
  if (!fingerExtended(lm, 8, 5)) return false;
  // At most MAX_OTHER_EXTENDED of middle/ring/pinky may also be extended.
  let others = 0;
  if (fingerExtended(lm, 12, 9)) others++;
  if (fingerExtended(lm, 16, 13)) others++;
  if (fingerExtended(lm, 20, 17)) others++;
  return others <= MAX_OTHER_EXTENDED;
}

function classify(p: HandLandmarks | null, s: HandLandmarks | null): boolean {
  if (!p || !s) return false;
  if (p.length < 21 || s.length < 21) return false;
  return isLShape(p) && isLShape(s);
}

export function usePictureFrame(
  primaryRef: RefObject<HandLandmarks | null>,
  secondaryRef: RefObject<HandLandmarks | null>,
  enabled: boolean
): boolean {
  const [active, setActive] = useState(false);
  const pendingRef = useRef<{ raw: boolean; since: number } | null>(null);
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      publishedRef.current = false;
      pendingRef.current = null;
      return;
    }
    let rafId = 0;
    const tick = (t: number) => {
      const raw = classify(primaryRef.current, secondaryRef.current);

      const pending = pendingRef.current;
      if (!pending || pending.raw !== raw) {
        pendingRef.current = { raw, since: t };
      } else if (
        t - pending.since >= HYSTERESIS_MS &&
        publishedRef.current !== raw
      ) {
        publishedRef.current = raw;
        setActive(raw);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, primaryRef, secondaryRef]);

  return active;
}
