'use client';

import { useRef } from 'react';
import { useCameraStream } from '../ImageUniverse/useCameraStream';
import { SymbolCanvas } from './SymbolCanvas';
import { useGestureSymbolState } from './useGestureSymbolState';

/**
 * Gesture Symbols — a living typographic poster driven by hand gestures.
 *
 * Composes the camera stream (opt-in), the gesture→symbol state layer, and
 * the 2D canvas renderer. The animation is the first screen: the canvas
 * starts on the cross immediately; the camera is a progressive enhancement
 * and the keyboard fallback (1–4, i, arrows) works in every camera state.
 */
export function GestureSymbolsExperience() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { state: cameraState, enable } = useCameraStream({ videoRef });
  const { state, handDetected, debug } = useGestureSymbolState({
    videoRef,
    trackingEnabled: cameraState === 'granted',
  });

  const inverted = state.polarity === 'light-on-dark';
  const showEnable = cameraState === 'idle' || cameraState === 'requesting';

  return (
    <div className="absolute inset-0 overflow-hidden">
      <SymbolCanvas state={state} />

      {/* Hidden video element used as input for HandLandmarker. */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
      />

      {showEnable && (
        <button
          type="button"
          onClick={enable}
          disabled={cameraState === 'requesting'}
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 border px-4 py-2 text-[11px] uppercase tracking-[0.25em] transition-opacity disabled:opacity-50 ${
            inverted
              ? 'border-white/40 text-white hover:border-white'
              : 'border-black/40 text-black hover:border-black'
          }`}
        >
          {cameraState === 'requesting' ? 'requesting camera…' : 'enable camera'}
        </button>
      )}

      {process.env.NODE_ENV === 'development' && (
        <div
          className={`pointer-events-none absolute left-3 top-3 text-[10px] leading-relaxed tracking-wider ${
            inverted ? 'text-white/60' : 'text-black/50'
          }`}
        >
          <div>cam:{cameraState}</div>
          <div>
            sym:{state.symbol} pol:{state.polarity} src:{state.source}
          </div>
          <div>
            hand:{handDetected ? 'y' : 'n'} {debug.shape}/{debug.facing}
            {debug.pinching ? '/pinch' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
