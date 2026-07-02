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
    default:
      return 'PINCH → OPEN L = GLOBE   ·   SHOW BACKS OF BOTH HANDS = HELIX';
  }
}

export default function LoopClient({
  media,
  shoppable,
}: {
  media: UniverseMedia[];
  shoppable: ShoppableManifest;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const formationTargetRef = useRef(0);
  const shapeTargetRef = useRef(0);
  const debugRef = useRef<GestureDebug | null>(null);
  const [gesture, setGesture] = useState<GestureState>('natural');
  const [showDebug, setShowDebug] = useState(true);
  const [selected, setSelected] = useState<UniverseMedia | null>(null);

  const { state: cameraState, enable, disable } = useCameraStream({ videoRef });
  const cameraEnabled = cameraState === 'granted';

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
  }, []);
  const { ready } = useHandTracking({
    videoRef,
    enabled: cameraEnabled,
    onResult,
  });

  const onState = useCallback((s: GestureState) => setGesture(s), []);
  useUniverseGestures({
    landmarksRef,
    enabled: cameraEnabled && !selected,
    formationTargetRef,
    shapeTargetRef,
    onState,
    debugRef,
  });

  // Keyboard fallback (no webcam needed): "G" toggles the globe on/off,
  // "H" toggles the formed shape between globe and helix. The gesture layer
  // owns both while the camera is on.
  useEffect(() => {
    if (cameraEnabled || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        formationTargetRef.current = formationTargetRef.current > 0.5 ? 0 : 1;
      } else if (e.key === 'h' || e.key === 'H') {
        shapeTargetRef.current = shapeTargetRef.current > 0.5 ? 0 : 1;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cameraEnabled, selected]);

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
    <div className="relative h-[100svh] w-full">
      <ImageUniverse
        media={media}
        formationTargetRef={formationTargetRef}
        shapeTargetRef={shapeTargetRef}
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

      {/* Hidden video feeding the hand landmarker (kept decoding: 1px, opacity-0). */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="pointer-events-none absolute -z-10 h-px w-px opacity-0"
      />

      {/* Camera + hand-skeleton window (draggable), shown once the camera is on. */}
      <HUD videoRef={videoRef} landmarksRef={landmarksRef} cameraEnabled={cameraEnabled} />

      {/* Bottom-center control / guidance strip. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-5">
        {!cameraEnabled ? (
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
            <span>{ready ? gestureHint(gesture) : 'LOADING HAND MODEL…'}</span>
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
      {row('L-progress', `${num(snap?.progress[0])} ${num(snap?.progress[1])}`)}
      {row('formation', snap ? snap.formation.toFixed(2) : '0.00')}
      {row('shape', snap ? `${snap.shape.toFixed(2)} ${snap.shape > 0.5 ? '(helix)' : '(globe)'}` : '0.00')}
      {row('state', snap?.state ?? 'natural')}
      <div style={{ opacity: 0.4, marginTop: 5, fontSize: 10 }}>press D to hide</div>
    </div>
  );
}
