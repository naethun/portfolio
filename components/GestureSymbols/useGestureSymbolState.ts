'use client';

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import { useHandTracking } from '../HandLoop/useHandTracking';
import { useSwipeGesture, type SwipeDirection } from '../HandLoop/useSwipeGesture';
import { getARHandState } from './arHandState';
import type { HandFacing, HandShape } from './gestureClassifier';
import { splitHandRoles } from './handRoles';
import type { PalmAnchor } from './palmAnchor';
import {
  INITIAL_SYMBOL_STATE,
  SYMBOL_ORDER,
  type Polarity,
  type SymbolKind,
  type SymbolState,
  type TransitionSource,
} from './types';

// ---------------------------------------------------------------------------
// Tunable timing constants (all in ms). Named so they're easy to adjust.
// ---------------------------------------------------------------------------
/** A held-gesture candidate symbol must persist this long before it commits. */
const HELD_DWELL_MS = 280; // brief target ~200–350
/** Palm-facing must persist this long before polarity flips (anti-strobe). */
const POLARITY_DWELL_MS = 320; // brief target ~250–400
/** After a manual pick (swipe/keyboard/touch) held gestures are ignored this long. */
const HOLD_OFF_MS = 2000; // brief target ~1500–2500
/** Minimum horizontal travel for a touch swipe to count. */
const TOUCH_SWIPE_MIN_PX = 45;
/** Horizontal must dominate vertical by this factor to read as a horizontal swipe. */
const TOUCH_SWIPE_AXIS_RATIO = 1.5;
// ---------------------------------------------------------------------------

export interface UseGestureSymbolStateOptions {
  /** Video element fed by the camera stream. May be null before camera starts. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Full MediaPipe result, exposed for the shared camera HUD overlay. */
  landmarksResultRef?: RefObject<HandLandmarkerResult | null>;
  /** True once the camera stream is live and hand tracking should run. */
  trackingEnabled: boolean;
}

interface DebugReadout {
  shape: HandShape;
  facing: HandFacing;
  extendedFingers: number;
}

export interface GestureSymbolStateResult {
  state: SymbolState;
  /** Right-palm anchor for the AR overlay. */
  palmAnchor: PalmAnchor | null;
  /** True when a hand is currently detected with confidence. */
  handDetected: boolean;
  /** Live classification readouts for an optional debug HUD. */
  debug: DebugReadout;
}

const DEFAULT_DEBUG: DebugReadout = {
  shape: 'unknown',
  facing: 'unknown',
  extendedFingers: 0,
};

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function opposite(p: Polarity): Polarity {
  return p === 'dark-on-light' ? 'light-on-dark' : 'dark-on-light';
}

function anchorsClose(a: PalmAnchor | null, b: PalmAnchor | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.x - b.x) < 0.003 &&
    Math.abs(a.y - b.y) < 0.003 &&
    Math.abs(a.z - b.z) < 0.003 &&
    Math.abs(a.scale - b.scale) < 0.003 &&
    Math.abs(a.roll - b.roll) < 0.01 &&
    Math.abs(a.confidence - b.confidence) < 0.01
  );
}

// --- symbol-state reducer ---------------------------------------------------
// changeCount bumps on EVERY symbol change (renderer restarts its transition).
// Manual actions (select/cycle) always bump — even re-selecting the current
// symbol. Held-gesture and polarity changes only bump / update when the value
// actually differs, and polarity never bumps changeCount (it's orthogonal).
type Action =
  | { type: 'select'; symbol: SymbolKind; source: TransitionSource }
  | { type: 'cycle'; dir: 1 | -1; source: TransitionSource }
  | { type: 'gesture'; symbol: SymbolKind }
  | { type: 'set-polarity'; polarity: Polarity }
  | { type: 'toggle-polarity' };

function reducer(state: SymbolState, action: Action): SymbolState {
  switch (action.type) {
    case 'select':
      return {
        ...state,
        symbol: action.symbol,
        source: action.source,
        changeCount: state.changeCount + 1,
      };
    case 'cycle': {
      const n = SYMBOL_ORDER.length;
      const i = SYMBOL_ORDER.indexOf(state.symbol);
      const symbol = SYMBOL_ORDER[((i < 0 ? 0 : i) + action.dir + n) % n];
      return {
        ...state,
        symbol,
        source: action.source,
        changeCount: state.changeCount + 1,
      };
    }
    case 'gesture':
      if (action.symbol === state.symbol) return state;
      return {
        ...state,
        symbol: action.symbol,
        source: 'gesture',
        changeCount: state.changeCount + 1,
      };
    case 'set-polarity':
      if (action.polarity === state.polarity) return state;
      return { ...state, polarity: action.polarity };
    case 'toggle-polarity':
      return { ...state, polarity: opposite(state.polarity) };
    default:
      return state;
  }
}

export function useGestureSymbolState(
  options: UseGestureSymbolStateOptions
): GestureSymbolStateResult {
  const { videoRef, landmarksResultRef, trackingEnabled } = options;

  const [state, dispatch] = useReducer(reducer, INITIAL_SYMBOL_STATE);
  const [palmAnchor, setPalmAnchor] = useState<PalmAnchor | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [debug, setDebug] = useState<DebugReadout>(DEFAULT_DEBUG);

  // Latest two-hand MediaPipe result, written by the tracking loop and read by
  // the classification loop. Ref writes avoid rendering on every camera frame.
  const resultRef = useRef<HandLandmarkerResult | null>(null);

  // Current committed state, mirrored to a ref so the rAF loop and DOM event
  // handlers can read it without re-subscribing.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Hold-off timestamps: while now() < ref, gesture-driven changes are ignored
  // so a manual pick isn't instantly overridden by a live camera.
  const symbolHoldOffRef = useRef(0);
  const polarityHoldOffRef = useRef(0);

  // --- manual selection helpers (stable) -----------------------------------
  const selectSymbol = useCallback(
    (symbol: SymbolKind, source: TransitionSource) => {
      symbolHoldOffRef.current = now() + HOLD_OFF_MS;
      dispatch({ type: 'select', symbol, source });
    },
    []
  );
  const cycleSymbol = useCallback(
    (dir: 1 | -1, source: TransitionSource) => {
      symbolHoldOffRef.current = now() + HOLD_OFF_MS;
      dispatch({ type: 'cycle', dir, source });
    },
    []
  );
  const togglePolarity = useCallback(() => {
    polarityHoldOffRef.current = now() + HOLD_OFF_MS;
    dispatch({ type: 'toggle-polarity' });
  }, []);

  // --- swipe (reused HandLoop hook) ----------------------------------------
  const onSwipe = useCallback(
    (dir: SwipeDirection) => {
      cycleSymbol(dir === 'right' ? 1 : -1, 'swipe');
    },
    [cycleSymbol]
  );
  const { pushSample, reset: resetSwipe } = useSwipeGesture(onSwipe);

  // --- MediaPipe tracking (reused HandLoop hook) ---------------------------
  const onResult = useCallback(
    (result: HandLandmarkerResult, timestampMs: number) => {
      if (landmarksResultRef) landmarksResultRef.current = result;
      resultRef.current = result;

      const { userRight } = splitHandRoles(result);
      if (userRight && userRight.length >= 21) {
        // Mirror wrist-x to match HandLoop's swipe convention (user-right => dx>0).
        pushSample(1 - userRight[0].x, timestampMs);
      } else {
        resetSwipe();
      }
    },
    [pushSample, resetSwipe, landmarksResultRef]
  );
  useHandTracking({ videoRef, enabled: trackingEnabled, onResult });

  // --- classification + dwell/hold-off loop --------------------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // handDetected/debug are reset by the outgoing effect's cleanup when
    // tracking flips off, and start at their defaults on mount.
    if (!trackingEnabled) {
      resultRef.current = null;
      if (landmarksResultRef) landmarksResultRef.current = null;
      return;
    }

    let raf = 0;
    let symbolCandidate: { symbol: SymbolKind; since: number } | null = null;
    let polarityCandidate: { polarity: Polarity; since: number } | null = null;
    let lastDetected = false;
    let lastDebug = DEFAULT_DEBUG;
    let lastAnchor: PalmAnchor | null = null;

    const tick = (t: number) => {
      const arHandState = getARHandState(resultRef.current);
      const detected = arHandState.userRightDetected || arHandState.userLeftDetected;
      const { shape, facing, extendedFingers } = arHandState.debug;

      if (detected !== lastDetected) {
        lastDetected = detected;
        setHandDetected(detected);
      }
      if (
        shape !== lastDebug.shape ||
        facing !== lastDebug.facing ||
        extendedFingers !== lastDebug.extendedFingers
      ) {
        lastDebug = { shape, facing, extendedFingers };
        setDebug(lastDebug);
      }
      if (!anchorsClose(arHandState.palmAnchor, lastAnchor)) {
        lastAnchor = arHandState.palmAnchor;
        setPalmAnchor(arHandState.palmAnchor);
      }

      // Held-gesture symbol: commit only after the candidate dwells, and never
      // during the manual hold-off window.
      const target = arHandState.symbol;
      if (target === stateRef.current.symbol) {
        symbolCandidate = null;
      } else if (!symbolCandidate || symbolCandidate.symbol !== target) {
        symbolCandidate = { symbol: target, since: t };
      } else if (
        t - symbolCandidate.since >= HELD_DWELL_MS &&
        t >= symbolHoldOffRef.current
      ) {
        dispatch({ type: 'gesture', symbol: target });
        symbolCandidate = null;
      }

      // Polarity (orthogonal): dorsal => light-on-dark, palmar => dark-on-light.
      // Unknown facing (incl. no hand) leaves polarity untouched.
      const targetPolarity: Polarity | null =
        facing === 'dorsal'
          ? 'light-on-dark'
          : facing === 'palmar'
            ? 'dark-on-light'
            : null;
      if (targetPolarity === null || targetPolarity === stateRef.current.polarity) {
        polarityCandidate = null;
      } else if (
        !polarityCandidate ||
        polarityCandidate.polarity !== targetPolarity
      ) {
        polarityCandidate = { polarity: targetPolarity, since: t };
      } else if (
        t - polarityCandidate.since >= POLARITY_DWELL_MS &&
        t >= polarityHoldOffRef.current
      ) {
        dispatch({ type: 'set-polarity', polarity: targetPolarity });
        polarityCandidate = null;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      if (landmarksResultRef) landmarksResultRef.current = null;
      resultRef.current = null;
      setPalmAnchor(null);
      setHandDetected(false);
      setDebug(DEFAULT_DEBUG);
    };
  }, [trackingEnabled, landmarksResultRef]);

  // --- keyboard fallback (always active, camera or not) --------------------
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          el.isContentEditable
        ) {
          return;
        }
      }
      switch (e.key) {
        case '1':
          selectSymbol('cross', 'keyboard');
          break;
        case '2':
          selectSymbol('ring', 'keyboard');
          break;
        case '3':
          selectSymbol('square', 'keyboard');
          break;
        case '4':
          selectSymbol('star', 'keyboard');
          break;
        case 'i':
        case 'I':
          togglePolarity();
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          cycleSymbol(1, 'keyboard');
          break;
        case 'ArrowLeft':
        case 'ArrowDown':
          cycleSymbol(-1, 'keyboard');
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectSymbol, cycleSymbol, togglePolarity]);

  // --- touch swipe cycling (coarse pointers) -------------------------------
  // Horizontal swipe cycles like a hand swipe. Long-press polarity is skipped
  // to keep the gesture set unambiguous (polarity stays keyboard/hand-facing).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let startX = 0;
    let startY = 0;
    let active = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      active = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < TOUCH_SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * TOUCH_SWIPE_AXIS_RATIO) return;
      cycleSymbol(dx > 0 ? 1 : -1, 'swipe');
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [cycleSymbol]);

  return {
    state,
    palmAnchor: trackingEnabled ? palmAnchor : null,
    handDetected,
    debug,
  };
}
