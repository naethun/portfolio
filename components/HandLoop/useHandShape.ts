'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarks } from './usePinch';

// Open/closed palm detection from MediaPipe hand landmarks.
// A finger is "extended" when its tip is meaningfully farther from the wrist
// than its MCP knuckle (3D distance, so curled-toward-camera doesn't read open).
const EXTEND_RATIO = 1.15;
const HYSTERESIS_MS = 150;

const FINGERS: ReadonlyArray<readonly [number, number]> = [
  [8, 5],   // index
  [12, 9],  // middle
  [16, 13], // ring
  [20, 17], // pinky
];

export type HandShape = 'open' | 'closed' | 'unknown';

interface Pt { x: number; y: number; z: number }

function dist3D(a: Pt, b: Pt): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function classify(lm: HandLandmarks): HandShape {
  const wrist = lm[0];
  let count = 0;
  for (const [tip, mcp] of FINGERS) {
    const dTip = dist3D(lm[tip], wrist);
    const dMcp = dist3D(lm[mcp], wrist);
    if (dTip > dMcp * EXTEND_RATIO) count += 1;
  }
  if (count >= 3) return 'open';
  if (count <= 1) return 'closed';
  return 'unknown';
}

export function useHandShape(
  handRef: RefObject<HandLandmarks | null>,
  enabled: boolean
): HandShape {
  const [shape, setShape] = useState<HandShape>('unknown');
  const pendingRef = useRef<{ shape: HandShape; since: number } | null>(null);
  const publishedRef = useRef<HandShape>('unknown');

  useEffect(() => {
    if (!enabled) {
      setShape('unknown');
      publishedRef.current = 'unknown';
      pendingRef.current = null;
      return;
    }
    let rafId = 0;
    const tick = (t: number) => {
      const lm = handRef.current;
      const raw: HandShape = lm && lm.length >= 21 ? classify(lm) : 'unknown';

      const pending = pendingRef.current;
      if (!pending || pending.shape !== raw) {
        pendingRef.current = { shape: raw, since: t };
      } else if (
        t - pending.since >= HYSTERESIS_MS &&
        publishedRef.current !== raw
      ) {
        publishedRef.current = raw;
        setShape(raw);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, handRef]);

  return shape;
}
