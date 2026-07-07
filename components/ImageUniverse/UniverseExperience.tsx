'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import type { UniverseMedia } from '@/lib/getUniverseMedia';
import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { HUD } from '@/components/HandLoop/HUD';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import {
  useUniverseGestures,
  type GestureState,
  type GestureDebug,
} from '@/components/ImageUniverse/useUniverseGestures';
import type { ShoppableManifest } from '@/lib/shoppable/types';
import { ShoppableBreakdown } from '@/components/ShoppableBreakdown/ShoppableBreakdown';

// three.js + WebGL is client-only, so load with SSR disabled.
const ImageUniverse = dynamic(
  () => import('@/components/ImageUniverse/ImageUniverse'),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center font-mono text-xs tracking-[0.2em] text-neutral-500">
        LOADING…
      </div>
    ),
  },
);

function cameraLabel(state: CameraState): string {
  switch (state) {
    case 'requesting':
      return 'REQUESTING CAMERA…';
    case 'denied':
      return 'CAMERA DENIED · TAP TO RETRY';
    case 'unsupported':
      return 'CAMERA UNSUPPORTED';
    case 'insecure':
      return 'USE HTTPS OR LOCALHOST';
    default:
      return 'ENABLE HAND GESTURES';
  }
}

function gestureHint(state: GestureState): string {
  switch (state) {
    case 'armed':
      return 'NOW OPEN BOTH HANDS INTO AN L →';
    case 'globe':
      return 'GLOBE · RELAX HANDS TO RELEASE';
    case 'helix':
      return 'HELIX · RELAX HANDS TO RELEASE';
    case 'flat':
      return 'FLAT · RELAX HANDS TO RELEASE';
    default:
      return 'PINCH→L = GLOBE · BOTH BACKS = HELIX · PALM+BACK = FLAT';
  }
}

/**
 * The full `/loop` experience — 3D image universe + hand-gesture morphs (globe /
 * helix / flat) + shoppable breakdown overlay + debug HUD — packaged as one
 * reusable component so it can be dropped into any route or panel. `/loop` and
 * `/reels` render it full-viewport (default `className`); the home "moodboard"
 * Finder tab passes a fill-the-container `className`.
 */
export default function UniverseExperience({
  media,
  shoppable,
  className,
  externalLandmarksRef,
  externalCameraActive = false,
  hideChrome = false,
  hideGuidance = false,
  background,
}: {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
  /** Root container classes. Defaults to a full-viewport stage. */
  className?: string;
  /**
   * When provided, gestures read hand landmarks from this ref instead of the
   * component's own webcam — for embeddings (e.g. the `/reels` recording stage)
   * that own the camera + hand-tracking elsewhere and display it separately.
   */
  externalLandmarksRef?: React.RefObject<HandLandmarkerResult | null>;
  /** In external-camera mode, whether that camera/tracking is live (gates gestures). */
  externalCameraActive?: boolean;
  /**
   * Hide the internal camera HUD, the bottom guidance strip + camera button,
   * and default the gesture-debug panel off — a clean embed for a recording frame.
   */
  hideChrome?: boolean;
  /**
   * Clean recording mode: hides the on-camera bottom strip entirely (both the
   * "PINCH→L = GLOBE …" hint and the "✕ CAMERA" button). Only the initial
   * enable button shows; once the camera is on, nothing overlays the frame.
   */
  hideGuidance?: boolean;
  /** Scene background color; defaults to the universe's warm off-white. */
  background?: string;
}) {
  const external = externalLandmarksRef != null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const formationTargetRef = useRef(0);
  const shapeTargetRef = useRef(0);
  const flatTargetRef = useRef(0);
  const debugRef = useRef<GestureDebug | null>(null);
  const [gesture, setGesture] = useState<GestureState>('natural');
  const [showDebug, setShowDebug] = useState(!hideChrome);
  const [selected, setSelected] = useState<UniverseMedia | null>(null);

  const { state: cameraState, enable, disable } = useCameraStream({ videoRef });
  const internalCameraEnabled = cameraState === 'granted';
  // A live camera can be the internal webcam or one owned by an embedder.
  const liveCamera = external ? externalCameraActive : internalCameraEnabled;
  const activeLandmarksRef = externalLandmarksRef ?? landmarksRef;

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
  }, []);
  const { ready } = useHandTracking({
    videoRef,
    enabled: !external && internalCameraEnabled,
    onResult,
  });

  const onState = useCallback((s: GestureState) => setGesture(s), []);
  useUniverseGestures({
    landmarksRef: activeLandmarksRef,
    enabled: liveCamera && !selected,
    formationTargetRef,
    shapeTargetRef,
    flatTargetRef,
    onState,
    debugRef,
  });

  // Keyboard fallback (no live camera): "G" toggles the globe on/off,
  // "H" toggles the formed shape between globe and helix. The gesture layer
  // owns both while a camera is driving the scene.
  useEffect(() => {
    if (liveCamera || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        formationTargetRef.current = formationTargetRef.current > 0.5 ? 0 : 1;
      } else if (e.key === 'h' || e.key === 'H') {
        shapeTargetRef.current = shapeTargetRef.current > 0.5 ? 0 : 1;
      } else if (e.key === 'f' || e.key === 'F') {
        // Toggle the flat grid. It needs both formation (scatter→formed) and the
        // flat override; turning it off returns to the scattered cloud.
        const on = flatTargetRef.current > 0.5;
        flatTargetRef.current = on ? 0 : 1;
        formationTargetRef.current = on ? 0 : 1;
        shapeTargetRef.current = 0;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [liveCamera, selected]);

  // "D" toggles the debug readout (always available).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected) return;
      if (e.key === 'd' || e.key === 'D') setShowDebug((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return (
    <div className={className ?? 'relative h-[100svh] w-full'}>
      <ImageUniverse
        media={media}
        background={background}
        formationTargetRef={formationTargetRef}
        shapeTargetRef={shapeTargetRef}
        flatTargetRef={flatTargetRef}
        onSelect={(m) => {
          if (shoppable[m.filename]) setSelected(m);
        }}
        // Never fly/re-center the camera on click: clicking an image used to
        // lock the OrbitControls target onto it, pinning it centered while
        // everything orbited around it. Shoppable clicks still open the
        // overlay via onSelect; all other clicks are camera no-ops.
        shouldFlyTo={() => false}
      />

      {selected && shoppable[selected.filename] && (
        <ShoppableBreakdown
          media={selected}
          entry={shoppable[selected.filename]}
          onClose={() => setSelected(null)}
        />
      )}

      {showDebug && (
        <GestureDebugPanel
          cameraState={cameraState}
          ready={ready}
          debugRef={debugRef}
        />
      )}

      {/* Hidden video feeding the hand landmarker (kept decoding: 1px, opacity-0).
          Only the internal camera path needs it; in external mode the embedder
          owns (and displays) the camera. */}
      {!external && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
        />
      )}

      {/* Camera + hand-skeleton window (draggable), shown once the camera is on. */}
      {!hideChrome && (
        <HUD videoRef={videoRef} landmarksRef={landmarksRef} cameraEnabled={internalCameraEnabled} />
      )}

      {/* Bottom-center control / guidance strip. With hideGuidance, only the
          initial enable button shows — once the camera is on the strip (hint +
          ✕ CAMERA) is dropped entirely for a clean recording frame. */}
      {!hideChrome && (!internalCameraEnabled || !hideGuidance) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-5">
          {!internalCameraEnabled ? (
            <button
              type="button"
              onClick={enable}
              disabled={cameraState === 'requesting'}
              className="pointer-events-auto rounded-full border border-neutral-300 bg-white/80 px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-neutral-700 shadow-sm backdrop-blur transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-60"
            >
              {cameraLabel(cameraState)}
            </button>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-neutral-200 bg-white/70 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-neutral-600 backdrop-blur">
              {!hideGuidance && (
                <span>{ready ? gestureHint(gesture) : 'LOADING HAND MODEL…'}</span>
              )}
              <button
                type="button"
                onClick={disable}
                aria-label="Turn off camera"
                className="text-neutral-400 transition-colors hover:text-neutral-900"
              >
                ✕ CAMERA
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Live detector readout — reveals exactly where the camera→gesture chain breaks. */
function GestureDebugPanel({
  cameraState,
  ready,
  debugRef,
}: {
  cameraState: CameraState;
  ready: boolean;
  debugRef: React.RefObject<GestureDebug | null>;
}) {
  const [snap, setSnap] = useState<GestureDebug | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => setSnap(debugRef.current), 120);
    return () => window.clearInterval(id);
  }, [debugRef]);

  const flag = (v: boolean | undefined) => (v ? '✓' : '·');
  const num = (n: number | undefined) =>
    n === undefined || n < 0 ? '—' : n.toFixed(2);
  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ opacity: 0.55 }}>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 40,
        minWidth: 190,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.82)',
        border: '1px solid rgba(0,0,0,0.1)',
        backdropFilter: 'blur(6px)',
        color: '#1a1a1a',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 11,
        lineHeight: 1.7,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4, letterSpacing: '0.1em' }}>
        GESTURE DEBUG
      </div>
      {row('camera', cameraState)}
      {row(
        'model',
        cameraState !== 'granted' ? 'idle' : ready ? 'ready' : 'loading…',
      )}
      {row('hands', String(snap?.hands ?? 0))}
      {row(
        'handedness',
        snap ? `${snap.handedness[0]} ${snap.handedness[1]}` : '— —',
      )}
      {row('pinch', `${flag(snap?.pinch[0])} ${flag(snap?.pinch[1])}`)}
      {row('L-shape', `${flag(snap?.l[0])} ${flag(snap?.l[1])}`)}
      {row('backs', `${flag(snap?.dorsal[0])} ${flag(snap?.dorsal[1])}`)}
      {row('open-hand', `${flag(snap?.open[0])} ${flag(snap?.open[1])}`)}
      {row('flat', snap ? snap.flat.toFixed(2) : '0.00')}
      {row('L-progress', `${num(snap?.progress[0])} ${num(snap?.progress[1])}`)}
      {row('formation', snap ? snap.formation.toFixed(2) : '0.00')}
      {row('shape', snap ? `${snap.shape.toFixed(2)} ${snap.shape > 0.5 ? '(helix)' : '(globe)'}` : '0.00')}
      {row('state', snap?.state ?? 'natural')}
      <div style={{ opacity: 0.4, marginTop: 5, fontSize: 10 }}>press D to hide</div>
    </div>
  );
}
