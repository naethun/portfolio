'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

export type GestureState = 'natural' | 'armed' | 'globe' | 'helix' | 'flat';

/** Live per-frame detector telemetry for the on-screen debug overlay. */
export interface GestureDebug {
  hands: number;
  handedness: [string, string];
  pinch: [boolean, boolean];
  l: [boolean, boolean];
  dorsal: [boolean, boolean];
  open: [boolean, boolean];
  /** current flat-grid target (0 = off, 1 = flat gallery grid). */
  flat: number;
  progress: [number, number];
  state: GestureState;
  /** current target values the gesture layer is driving the renderer with. */
  formation: number;
  shape: number;
}

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

// Flat gallery-wall grid: one palm + one back (mixed facing) of two open hands.
// A slightly longer enter hold than ENTER_MS so a smooth two-hand palms→backs
// flip (on the way to helix) doesn't transiently trigger flat.
const FLAT_ENTER_MS = 200;

// Palm facing (globe ⇄ helix while formed). Reuses HandLoop's palm-normal math.
const PALMAR_SIGN = -1; // sign of the palm normal's z that means "facing camera"
const FACING_EPS = 0.005; // |normal.z| below this = ambiguous (treated as palmar)

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

/**
 * True when the BACK of the hand faces the camera. Palm normal from the 2D
 * cross product (wrist→index-MCP) × (wrist→pinky-MCP). Its sign flips with hand
 * chirality, so the palmar sign MUST be chosen per hand from the handedness
 * label — otherwise the two hands read facing oppositely and can never agree.
 * Ambiguous/edge-on reads as not-dorsal (i.e. globe), matching useHandFacing.
 */
function isDorsal(lm: Hand, handedness: string | undefined): boolean {
  if (lm.length < 21) return false;
  const w = lm[0];
  const idx = lm[5];
  const pky = lm[17];
  const nz = (idx.x - w.x) * (pky.y - w.y) - (idx.y - w.y) * (pky.x - w.x);
  if (Math.abs(nz) < FACING_EPS) return false;
  // left hand is the mirror of the right, so its palm normal points the other way
  const palmarSign = handedness === 'Left' ? -PALMAR_SIGN : PALMAR_SIGN;
  return Math.sign(nz) !== palmarSign;
}

/** Flat open hand: index, middle, ring, pinky all extended. */
function isOpenHand(lm: Hand): boolean {
  if (lm.length < 21) return false;
  return (
    ext(lm, 8, 5) && ext(lm, 12, 9) && ext(lm, 16, 13) && ext(lm, 20, 17)
  );
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
  /** 0 = scattered … 1 = formed; tracks pinch→L open-progress while armed. */
  formationTargetRef: RefObject<number>;
  /** 0 = globe, 1 = helix; set from palm facing while formed (backs → helix). */
  shapeTargetRef: RefObject<number>;
  /** 0 = globe/helix shape, 1 = flat gallery grid; set from the mixed-facing pose. */
  flatTargetRef: RefObject<number>;
  onState?: (s: GestureState) => void;
  /** optional per-frame telemetry sink for the debug overlay. */
  debugRef?: RefObject<GestureDebug | null>;
}

/**
 * Two-handed gesture state machine driving the universe's formation.
 * natural → (both pinch) → armed → (both L-shape) → globe [held while L] →
 * (relax) → natural. While formed, palm facing selects the shape: palms →
 * globe, backs of hands → helix (DNA). Runs its own rAF reading the shared
 * landmarks ref; writes formation/shape targets and reports state changes.
 * No React re-renders per frame.
 */
export function useUniverseGestures({
  landmarksRef,
  enabled,
  formationTargetRef,
  shapeTargetRef,
  flatTargetRef,
  onState,
  debugRef,
}: Options) {
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  useEffect(() => {
    if (!enabled) {
      formationTargetRef.current = 0;
      shapeTargetRef.current = 0;
      flatTargetRef.current = 0;
      if (debugRef) debugRef.current = null;
      onStateRef.current?.('natural');
      return;
    }

    // start from the scattered natural state whenever tracking (re)enables
    formationTargetRef.current = 0;
    shapeTargetRef.current = 0;
    flatTargetRef.current = 0;
    let raf = 0;
    // Two independent formations, each held while its gesture holds:
    //   globe = pinch → open into an L (palms)
    //   helix = show the BACKS of both open hands
    let state: 'natural' | 'armed' | 'globe' | 'helix' | 'flat' = 'natural';
    // timestamps a condition has held continuously true (-1 = currently false)
    let tPinch = -1;
    let tL = -1;
    let tNoL = -1;
    let tNoEngaged = -1;
    let tHelix = -1;
    let tNoHelix = -1;
    let tFlat = -1;
    let tNoFlat = -1;

    let reported: GestureState = 'natural';
    const report = (label: GestureState) => {
      if (label === reported) return;
      reported = label;
      onStateRef.current?.(label);
    };

    const setState = (s: typeof state) => {
      if (s === state) return;
      state = s;
      if (s === 'globe') {
        formationTargetRef.current = 1;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('globe');
      } else if (s === 'helix') {
        formationTargetRef.current = 1;
        shapeTargetRef.current = 1;
        flatTargetRef.current = 0;
        report('helix');
      } else if (s === 'flat') {
        // grid forms; the globe/helix mix rests at globe underneath but is fully
        // masked by uFlat = 1, so its value is cosmetic.
        formationTargetRef.current = 1;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 1;
        report('flat');
      } else if (s === 'armed') {
        // globe pull-in; formation is written continuously below from progress
        formationTargetRef.current = ARMED_FLOOR;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('armed');
      } else {
        formationTargetRef.current = 0;
        shapeTargetRef.current = 0;
        flatTargetRef.current = 0;
        report('natural');
      }
    };

    const tick = (now: number) => {
      const result = landmarksRef.current;
      const hands = result?.landmarks ?? [];
      const twoHands = hands.length >= 2;

      // per-hand classification (also fed to the debug overlay)
      const h0 = hands[0] as Hand | undefined;
      const h1 = hands[1] as Hand | undefined;
      const hd0 = result?.handedness?.[0]?.[0]?.categoryName;
      const hd1 = result?.handedness?.[1]?.[0]?.categoryName;
      const pinch0 = !!h0 && isPinchPose(h0);
      const pinch1 = !!h1 && isPinchPose(h1);
      const l0 = !!h0 && isLShape(h0);
      const l1 = !!h1 && isLShape(h1);
      const dor0 = !!h0 && isDorsal(h0, hd0);
      const dor1 = !!h1 && isDorsal(h1, hd1);
      const open0 = !!h0 && isOpenHand(h0);
      const open1 = !!h1 && isOpenHand(h1);
      const prog0 = h0 ? openProgress(h0) : -1;
      const prog1 = h1 ? openProgress(h1) : -1;

      const bothPinch = twoHands && pinch0 && pinch1;
      const bothL = twoHands && l0 && l1;
      // helix trigger: backs of both OPEN hands facing the camera
      const bothBacks = twoHands && open0 && dor0 && open1 && dor1;
      // flat trigger: two OPEN hands with mixed facing (exactly one back-facing).
      const flatPose = twoHands && open0 && open1 && dor0 !== dor1;

      // continuous pinch→L progress across both hands (min = the less-open hand,
      // so the globe only completes when BOTH reach the full L). Both hands must
      // be in the gesture family for it to count.
      const bothEngaged = twoHands && prog0 >= 0 && prog1 >= 0;
      const minProgress = bothEngaged ? Math.min(prog0, prog1) : 0;

      tPinch = bothPinch ? (tPinch < 0 ? now : tPinch) : -1;
      tL = bothL ? (tL < 0 ? now : tL) : -1;
      tNoL = !bothL ? (tNoL < 0 ? now : tNoL) : -1;
      tNoEngaged = !bothEngaged ? (tNoEngaged < 0 ? now : tNoEngaged) : -1;
      tHelix = bothBacks ? (tHelix < 0 ? now : tHelix) : -1;
      tNoHelix = !bothBacks ? (tNoHelix < 0 ? now : tNoHelix) : -1;
      tFlat = flatPose ? (tFlat < 0 ? now : tFlat) : -1;
      tNoFlat = !flatPose ? (tNoFlat < 0 ? now : tNoFlat) : -1;

      if (state === 'natural') {
        // pinch → globe path; backs of open hands → helix path
        if (tPinch > 0 && now - tPinch >= ENTER_MS) setState('armed');
        else if (tHelix > 0 && now - tHelix >= ENTER_MS) setState('helix');
        else if (tFlat > 0 && now - tFlat >= FLAT_ENTER_MS) setState('flat');
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
        // held while the L holds; relax to scatter
        if (tNoL > 0 && now - tNoL >= EXIT_GRACE_MS) setState('natural');
      } else if (state === 'helix') {
        // held while the backs of both open hands show; relax / turn palms to scatter
        if (tNoHelix > 0 && now - tNoHelix >= EXIT_GRACE_MS) setState('natural');
      } else if (state === 'flat') {
        // held while the mixed-facing pose holds; relax / change pose to scatter
        if (tNoFlat > 0 && now - tNoFlat >= EXIT_GRACE_MS) setState('natural');
      }

      if (debugRef) {
        debugRef.current = {
          hands: hands.length,
          handedness: [hd0 ?? '—', hd1 ?? '—'],
          pinch: [pinch0, pinch1],
          l: [l0, l1],
          dorsal: [dor0, dor1],
          open: [open0, open1],
          flat: flatTargetRef.current,
          progress: [prog0, prog1],
          state: reported,
          formation: formationTargetRef.current,
          shape: shapeTargetRef.current,
        };
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      formationTargetRef.current = 0;
      shapeTargetRef.current = 0;
      flatTargetRef.current = 0;
      if (debugRef) debugRef.current = null;
    };
  }, [enabled, landmarksRef, formationTargetRef, shapeTargetRef, flatTargetRef, debugRef]);
}
