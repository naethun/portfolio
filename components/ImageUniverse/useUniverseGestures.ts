'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GestureState = 'natural' | 'armed' | 'globe';

interface Pt {
  x: number;
  y: number;
  z: number;
}
type Hand = ReadonlyArray<Pt>;

/* ---- tunables ------------------------------------------------------------ */
const PINCH_MAX = 0.34; // thumb-index distance / hand size below this = pinched
const L_OPEN_RATIO = 1.15; // thumb-index distance / hand size at a full open L
const EXTEND_RATIO = 1.15; // finger "extended" when tip is this× farther than mcp
const THUMB_EXTEND_RATIO = 1.1;
const L_PERP_COS = 0.6; // |cos(thumb,index)| below this = roughly perpendicular
const ARMED_FLOOR = 0.1; // formation at a bare pinch (progress 0) — a slight gather
const ENTER_MS = 120; // sustain a pose this long before it counts (anti-flicker)
const RELEASE_MS = 600; // gesture family abandoned this long → back to natural
const EXIT_GRACE_MS = 350; // L lost this long while in globe → ease back to scatter

/* ---- landmark math (same conventions as usePinch / useHandShape) --------- */
function d3(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function ext(lm: Hand, tip: number, mcp: number): boolean {
  return d3(lm[tip], lm[0]) > d3(lm[mcp], lm[0]) * EXTEND_RATIO;
}
function thumbExt(lm: Hand): boolean {
  return d3(lm[4], lm[0]) > d3(lm[2], lm[0]) * THUMB_EXTEND_RATIO;
}

/** Pinch pose: thumb+index tips together, middle/ring/pinky curled. */
function isPinchPose(lm: Hand): boolean {
  if (lm.length < 21) return false;
  const handSize = d3(lm[0], lm[9]);
  if (handSize <= 0) return false;
  const pinched = d3(lm[4], lm[8]) / handSize < PINCH_MAX;
  return pinched && !ext(lm, 12, 9) && !ext(lm, 16, 13) && !ext(lm, 20, 17);
}

/** L-shape: thumb + index extended ~perpendicular, other three curled. */
function isLShape(lm: Hand): boolean {
  if (lm.length < 21) return false;
  if (
    !(thumbExt(lm) && ext(lm, 8, 5) && !ext(lm, 12, 9) && !ext(lm, 16, 13) && !ext(lm, 20, 17))
  ) {
    return false;
  }
  // angle between thumb (2→4) and index (5→8) in the image plane
  const ax = lm[8].x - lm[5].x;
  const ay = lm[8].y - lm[5].y;
  const bx = lm[4].x - lm[2].x;
  const by = lm[4].y - lm[2].y;
  const magA = Math.hypot(ax, ay);
  const magB = Math.hypot(bx, by);
  if (magA < 1e-4 || magB < 1e-4) return false;
  const cos = (ax * bx + ay * by) / (magA * magB);
  return Math.abs(cos) < L_PERP_COS;
}

function countPose(
  result: HandLandmarkerResult | null,
  fn: (lm: Hand) => boolean,
): number {
  if (!result) return 0;
  let c = 0;
  for (const lm of result.landmarks) if (fn(lm as Hand)) c += 1;
  return c;
}

/**
 * Continuous pinch→L progress for one hand, so the globe can pull in gradually
 * as the hand opens. Only defined while the other three fingers stay curled
 * (unmistakably the pinch/L gesture family) — returns -1 otherwise.
 * 0 = pinched (tips together), 1 = fully open L (tips far apart).
 */
function openProgress(lm: Hand): number {
  if (lm.length < 21) return -1;
  // must be the thumb+index active pair — middle/ring/pinky curled
  if (ext(lm, 12, 9) || ext(lm, 16, 13) || ext(lm, 20, 17)) return -1;
  const handSize = d3(lm[0], lm[9]);
  if (handSize <= 0) return -1;
  const r = d3(lm[4], lm[8]) / handSize; // thumb-index tip separation
  const p = (r - PINCH_MAX) / (L_OPEN_RATIO - PINCH_MAX);
  return Math.max(0, Math.min(1, p));
}

interface Options {
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  enabled: boolean;
  /** 0 = scattered … 1 = globe; tracks pinch→L open-progress while armed. */
  formationTargetRef: RefObject<number>;
  onState?: (s: GestureState) => void;
}

/**
 * Two-handed gesture state machine driving the universe's globe formation.
 * natural → (both pinch) → armed → (both L-shape) → globe [held while L] →
 * (relax) → natural. Runs its own rAF reading the shared landmarks ref; writes
 * the formation target and reports state changes. No React re-renders per frame.
 */
export function useUniverseGestures({
  landmarksRef,
  enabled,
  formationTargetRef,
  onState,
}: Options) {
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    if (!enabled) {
      formationTargetRef.current = 0;
      onStateRef.current?.('natural');
      return;
    }

    // start from the scattered natural state whenever tracking (re)enables
    formationTargetRef.current = 0;
    let raf = 0;
    let state: GestureState = 'natural';
    // timestamps a condition has held continuously true (-1 = currently false)
    let tPinch = -1;
    let tL = -1;
    let tNoL = -1;
    let tNoEngaged = -1;

    const setState = (s: GestureState) => {
      if (s === state) return;
      state = s;
      // 'armed' formation is written continuously below (from open-progress);
      // seed it at the floor here so the transition starts from the gather.
      formationTargetRef.current = s === 'globe' ? 1 : s === 'armed' ? ARMED_FLOOR : 0;
      onStateRef.current?.(s);
    };

    const tick = (now: number) => {
      const result = landmarksRef.current;
      const hands = result?.landmarks ?? [];
      const twoHands = hands.length >= 2;
      const bothPinch = twoHands && countPose(result, isPinchPose) >= 2;
      const bothL = twoHands && countPose(result, isLShape) >= 2;

      // continuous pinch→L progress across both hands (min = the less-open hand,
      // so the globe only completes when BOTH reach the full L). Both hands must
      // be in the gesture family for it to count.
      let bothEngaged = false;
      let minProgress = 0;
      if (twoHands) {
        const p0 = openProgress(hands[0] as Hand);
        const p1 = openProgress(hands[1] as Hand);
        if (p0 >= 0 && p1 >= 0) {
          bothEngaged = true;
          minProgress = Math.min(p0, p1);
        }
      }

      tPinch = bothPinch ? (tPinch < 0 ? now : tPinch) : -1;
      tL = bothL ? (tL < 0 ? now : tL) : -1;
      tNoL = !bothL ? (tNoL < 0 ? now : tNoL) : -1;
      tNoEngaged = !bothEngaged ? (tNoEngaged < 0 ? now : tNoEngaged) : -1;

      if (state === 'natural') {
        if (tPinch > 0 && now - tPinch >= ENTER_MS) setState('armed');
      } else if (state === 'armed') {
        if (tL > 0 && now - tL >= ENTER_MS) {
          setState('globe');
        } else if (tNoEngaged > 0 && now - tNoEngaged >= RELEASE_MS) {
          setState('natural');
        } else if (bothEngaged) {
          // pull the images in proportionally as the hands open toward the L
          formationTargetRef.current = ARMED_FLOOR + (1 - ARMED_FLOOR) * minProgress;
        }
      } else if (state === 'globe') {
        if (tNoL > 0 && now - tNoL >= EXIT_GRACE_MS) setState('natural');
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      formationTargetRef.current = 0;
    };
  }, [enabled, landmarksRef, formationTargetRef]);
}
