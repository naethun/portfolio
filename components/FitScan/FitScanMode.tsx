'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { usePinch, type HandLandmarks } from '@/components/HandLoop/usePinch';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import { limbPath, type LimbEdge } from '@/components/ShoppableBreakdown/geometry';
import {
  displayRectToSourceRect,
  expandRect,
  pickNearestBound,
} from '@/lib/fit-scan/poseBounds.mjs';
import type { FitScanBound, FitScanMatch, FitScanSearchPayload, NormalizedRect } from './types';
import { usePoseBounds, type PoseBoundsStatus } from './usePoseBounds';

type Mode = 'portrait' | 'reels';
type ScanPhase = 'idle' | 'capturing' | 'uploading' | 'searching' | 'done' | 'no_match' | 'error';

const CARD_W = 280;
const CARD_H = 168;

function cameraLabel(state: CameraState): string {
  switch (state) {
    case 'requesting':
      return 'REQUESTING CAMERA...';
    case 'denied':
      return 'CAMERA DENIED';
    case 'unsupported':
      return 'CAMERA UNSUPPORTED';
    case 'insecure':
      return 'USE HTTPS OR LOCALHOST';
    default:
      return 'ENABLE CAMERA';
  }
}

function poseStatusLabel(status: PoseBoundsStatus): string {
  switch (status) {
    case 'loading':
      return 'LOADING BLOB MODELS';
    case 'no_pose':
      return 'NO BODY OR OBJECT DETECTED';
    case 'missing_segmentation':
      return 'BODY BLOBS UNAVAILABLE';
    case 'no_bounds':
      return 'NO TRACKABLE BLOBS';
    case 'model_error':
      return 'BLOB TRACKING UNAVAILABLE';
    case 'tracking':
      return 'BLOB BOUNDS LIVE';
    default:
      return 'BLOB MODELS IDLE';
  }
}

function phaseLabel(phase: ScanPhase): string | null {
  switch (phase) {
    case 'capturing':
      return 'CAPTURING CROP';
    case 'uploading':
      return 'UPLOADING CROP';
    case 'searching':
      return 'SEARCHING GOOGLE LENS';
    case 'no_match':
      return 'NO MATCH FOUND';
    case 'error':
      return 'SCAN BLOCKED';
    case 'done':
      return 'MATCH RESOLVED';
    default:
      return null;
  }
}

interface CoverMetrics {
  width: number;
  height: number;
  videoW: number;
  videoH: number;
  displayW: number;
  displayH: number;
  offsetX: number;
  offsetY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCoverMetrics(root: HTMLElement, video: HTMLVideoElement): CoverMetrics | null {
  const rect = root.getBoundingClientRect();
  const videoW = video.videoWidth;
  const videoH = video.videoHeight;
  if (!rect.width || !rect.height || !videoW || !videoH) return null;
  const scale = Math.max(rect.width / videoW, rect.height / videoH);
  const displayW = videoW * scale;
  const displayH = videoH * scale;
  return {
    width: rect.width,
    height: rect.height,
    videoW,
    videoH,
    displayW,
    displayH,
    offsetX: (rect.width - displayW) / 2,
    offsetY: (rect.height - displayH) / 2,
  };
}

function rectToScreen(rect: NormalizedRect, metrics: CoverMetrics) {
  return {
    left: metrics.offsetX + rect.x * metrics.displayW,
    top: metrics.offsetY + rect.y * metrics.displayH,
    width: rect.w * metrics.displayW,
    height: rect.h * metrics.displayH,
  };
}

function pointToScreen(point: { x: number; y: number }, metrics: CoverMetrics) {
  return {
    x: metrics.offsetX + point.x * metrics.displayW,
    y: metrics.offsetY + point.y * metrics.displayH,
  };
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function blobJitter(seed: number, index: number, range: number) {
  const value = Math.sin(seed * 0.000001 + index * 12.9898) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * range;
}

function blobPath(width: number, height: number, id: string) {
  const seed = hashString(id);
  const insetX = Math.min(8, width * 0.04);
  const insetY = Math.min(8, height * 0.04);
  const left = insetX;
  const right = Math.max(left + 1, width - insetX);
  const top = insetY;
  const bottom = Math.max(top + 1, height - insetY);
  const x = (ratio: number, jitterIndex: number) =>
    clamp(width * (ratio + blobJitter(seed, jitterIndex, 0.08)), left, right);
  const y = (ratio: number, jitterIndex: number) =>
    clamp(height * (ratio + blobJitter(seed, jitterIndex, 0.08)), top, bottom);
  const n = (value: number) => Number(value.toFixed(2));
  const start = { x: x(0.5, 1), y: top };

  return [
    `M ${n(start.x)} ${n(start.y)}`,
    `C ${n(x(0.76, 2))} ${n(top)} ${n(right)} ${n(y(0.22, 3))} ${n(right)} ${n(y(0.48, 4))}`,
    `C ${n(right)} ${n(y(0.76, 5))} ${n(x(0.76, 6))} ${n(bottom)} ${n(x(0.5, 7))} ${n(bottom)}`,
    `C ${n(x(0.22, 8))} ${n(bottom)} ${n(left)} ${n(y(0.76, 9))} ${n(left)} ${n(y(0.52, 10))}`,
    `C ${n(left)} ${n(y(0.24, 11))} ${n(x(0.24, 12))} ${n(top)} ${n(start.x)} ${n(start.y)}`,
    'Z',
  ].join(' ');
}

function boundTone(bound: FitScanBound, active: boolean) {
  const objectBound = bound.derivedFrom.includes('object_detector');
  const maskBound =
    bound.derivedFrom.includes('segmentation_mask') &&
    !bound.derivedFrom.includes('pose_landmarks');

  if (active) {
    return {
      stroke: 'rgba(255,255,255,0.95)',
      fill: 'rgba(255,255,255,0.12)',
      glow: 'drop-shadow(0 0 18px rgba(255,255,255,0.55))',
    };
  }

  if (objectBound) {
    return {
      stroke: 'rgba(248,188,178,0.72)',
      fill: 'rgba(248,188,178,0.055)',
      glow: 'drop-shadow(0 0 10px rgba(248,188,178,0.22))',
    };
  }

  if (maskBound) {
    return {
      stroke: 'rgba(145,202,255,0.35)',
      fill: 'rgba(145,202,255,0.035)',
      glow: 'drop-shadow(0 0 12px rgba(145,202,255,0.16))',
    };
  }

  return {
    stroke: 'rgba(255,255,255,0.48)',
    fill: 'rgba(255,255,255,0.035)',
    glow: 'drop-shadow(0 0 10px rgba(255,255,255,0.18))',
  };
}

function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Camera crop could not be encoded.'));
      },
      'image/jpeg',
      0.92,
    );
  });
}

async function captureBoundCrop(video: HTMLVideoElement, bound: FitScanBound) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Camera frame is not ready.');
  }

  const sourceRect = displayRectToSourceRect(expandRect(bound.rect, 0.035));
  const sx = clamp(Math.floor(sourceRect.x * video.videoWidth), 0, video.videoWidth - 1);
  const sy = clamp(Math.floor(sourceRect.y * video.videoHeight), 0, video.videoHeight - 1);
  const sw = clamp(Math.ceil(sourceRect.w * video.videoWidth), 1, video.videoWidth - sx);
  const sh = clamp(Math.ceil(sourceRect.h * video.videoHeight), 1, video.videoHeight - sy);
  if (sw < 4 || sh < 4) throw new Error('Selected bound is too small to scan.');

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser cannot create a crop canvas.');
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return blobFromCanvas(canvas);
}

export default function FitScanMode({ mode }: { mode: Mode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handRef = useRef<HandLandmarks | null>(null);
  const previousPinchRef = useRef(false);
  const [metrics, setMetrics] = useState<CoverMetrics | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [handError, setHandError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bound: FitScanBound;
    match: FitScanMatch;
    imageUrl: string;
  } | null>(null);

  const { state: cameraState, enable, disable } = useCameraStream({ videoRef });
  const cameraActive = cameraState === 'granted';
  const { ready: handReady } = useHandTracking({
    videoRef,
    enabled: cameraActive,
    onError: useCallback((err: unknown) => {
      setHandError(err instanceof Error ? err.message : 'Hand model failed to load.');
    }, []),
    onResult: useCallback((handResult: HandLandmarkerResult) => {
      const primary = handResult.landmarks[0] ?? null;
      handRef.current = primary;
      const tip = primary?.[8];
      setPointer(tip ? { x: 1 - tip.x, y: tip.y } : null);
    }, []),
  });
  const {
    ready: poseReady,
    bounds,
    status: poseStatus,
    error: poseError,
  } = usePoseBounds({ videoRef, enabled: cameraActive });

  const selected = useMemo(
    () => pickNearestBound(pointer, bounds) as FitScanBound | null,
    [pointer, bounds],
  );
  const pinching = usePinch(handRef, cameraActive && phase !== 'uploading' && phase !== 'searching');

  useEffect(() => {
    if (!cameraActive) {
      setMetrics(null);
      return;
    }
    let rafId = 0;
    let signature = '';
    const tick = () => {
      const root = rootRef.current;
      const video = videoRef.current;
      const next = root && video ? getCoverMetrics(root, video) : null;
      if (next) {
        const nextSignature = [
          next.width,
          next.height,
          next.videoW,
          next.videoH,
          next.displayW,
          next.displayH,
        ].join(':');
        if (nextSignature !== signature) {
          signature = nextSignature;
          setMetrics(next);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraActive]);

  const runScan = useCallback(async () => {
    if (phase === 'capturing' || phase === 'uploading' || phase === 'searching') return;
    const video = videoRef.current;
    if (!video) return;
    if (!selected) {
      setPhase('error');
      setMessage('Point at a live blob bound before pinching.');
      return;
    }
    setResult(null);
    setMessage(null);
    try {
      setPhase('capturing');
      const crop = await captureBoundCrop(video, selected);
      setPhase('uploading');
      const form = new FormData();
      form.append('crop', crop, `fit-scan-${selected.kind}.jpg`);
      setPhase('searching');
      const response = await fetch('/api/fit-scan/search', {
        method: 'POST',
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as FitScanSearchPayload | null;
      if (!response.ok || !payload) {
        const text = payload?.error?.message ?? `Fit scan failed with status ${response.status}.`;
        throw new Error(text);
      }
      if (!payload.ok) {
        setPhase(payload.error?.code === 'NO_MATCH_FOUND' ? 'no_match' : 'error');
        setMessage(payload.error?.message ?? 'Fit scan did not return a match.');
        return;
      }
      if (!payload.match || !payload.imageUrl) {
        throw new Error('Fit scan response did not include a live match.');
      }
      setResult({ bound: selected, match: payload.match, imageUrl: payload.imageUrl });
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setMessage(err instanceof Error ? err.message : 'Fit scan failed.');
    }
  }, [phase, selected]);

  useEffect(() => {
    if (pinching && !previousPinchRef.current) {
      void runScan();
    }
    previousPinchRef.current = pinching;
  }, [pinching, runScan]);

  const activeMessage =
    phaseLabel(phase) ??
    (handError ? 'HAND TRACKING UNAVAILABLE' : null) ??
    (poseError ? 'BLOB TRACKING UNAVAILABLE' : null) ??
    (!handReady && cameraActive ? 'LOADING HAND MODEL' : null) ??
    (!poseReady && cameraActive ? 'LOADING BLOB MODELS' : null) ??
    (cameraActive ? poseStatusLabel(poseStatus) : 'CAMERA OFF');

  const resultLayout = useMemo(() => {
    if (!result || !metrics) return null;
    const anchor = pointToScreen(result.bound.anchor, metrics);
    const direction = anchor.x < metrics.width / 2 ? 1 : -1;
    const left = clamp(
      anchor.x + direction * 96 - (direction < 0 ? CARD_W : 0),
      14,
      metrics.width - CARD_W - 14,
    );
    const top = clamp(anchor.y - CARD_H / 2, 14, metrics.height - CARD_H - 14);
    const edge: LimbEdge = direction > 0 ? 'left' : 'right';
    const x2 = edge === 'left' ? left : left + CARD_W;
    const y2 = top + CARD_H / 2;
    return {
      card: { left, top },
      line: { x1: anchor.x, y1: anchor.y, x2, y2, edge },
    };
  }, [metrics, result]);

  return (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden bg-black ${mode === 'reels' ? 'font-mono' : ''}`}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      <div className="pointer-events-none absolute inset-0">
        {metrics &&
          bounds.map((bound) => {
            const rect = rectToScreen(bound.rect, metrics);
            const active = selected?.id === bound.id;
            const tone = boundTone(bound, active);
            const showLabel = rect.width >= 58 && rect.height >= 34;
            return (
              <div key={bound.id} className="absolute" style={{ inset: 0 }}>
                <svg
                  aria-hidden
                  className={`absolute overflow-visible transition-opacity duration-150 ${
                    active ? 'opacity-100' : 'opacity-80'
                  }`}
                  style={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                    filter: tone.glow,
                  }}
                  viewBox={`0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`}
                  preserveAspectRatio="none"
                >
                  <path
                    d={blobPath(Math.max(1, rect.width), Math.max(1, rect.height), bound.id)}
                    fill={tone.fill}
                    stroke={tone.stroke}
                    strokeWidth={active ? 1.8 : 1.15}
                    vectorEffect="non-scaling-stroke"
                  />
                  {active && (phase === 'capturing' || phase === 'uploading' || phase === 'searching') && (
                    <path
                      className="animate-pulse"
                      d={blobPath(Math.max(1, rect.width), Math.max(1, rect.height), `${bound.id}-pulse`)}
                      fill="none"
                      stroke="rgba(255,255,255,0.7)"
                      strokeWidth={3}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>
                {showLabel && (
                  <span
                    className="absolute bg-black/50 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur"
                    style={{
                      left: rect.left + Math.min(12, rect.width * 0.16),
                      top: rect.top + Math.min(12, rect.height * 0.16),
                      borderRadius: 999,
                    }}
                  >
                    {bound.label}
                  </span>
                )}
              </div>
            );
          })}

        {metrics && pointer && (
          <span
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#f8bcb2] shadow-[0_0_18px_rgba(248,188,178,0.75)]"
            style={{
              left: pointToScreen(pointer, metrics).x,
              top: pointToScreen(pointer, metrics).y,
            }}
          />
        )}
      </div>

      {resultLayout && result && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">
          <path
            d={limbPath(
              resultLayout.line.x1,
              resultLayout.line.y1,
              resultLayout.line.x2,
              resultLayout.line.y2,
              resultLayout.line.edge,
            )}
            fill="none"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth={1}
          />
          <circle
            cx={resultLayout.line.x2}
            cy={resultLayout.line.y2}
            r={2.5}
            fill="rgba(255,255,255,0.75)"
          />
        </svg>
      )}

      {resultLayout && result && (
        <a
          href={result.match.link}
          target="_blank"
          rel="noreferrer"
          className="absolute z-20 block overflow-hidden border border-white/30 bg-white/92 text-black shadow-2xl backdrop-blur transition-transform hover:scale-[1.01]"
          style={{
            left: resultLayout.card.left,
            top: resultLayout.card.top,
            width: CARD_W,
            minHeight: CARD_H,
            borderRadius: 8,
          }}
        >
          <div className="flex gap-3 p-3">
            {result.match.thumbnail || result.match.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.match.thumbnail ?? result.match.image ?? ''}
                alt=""
                className="h-20 w-20 shrink-0 object-cover"
                style={{ borderRadius: 6 }}
              />
            ) : (
              <div className="h-20 w-20 shrink-0 bg-neutral-200" style={{ borderRadius: 6 }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                {result.match.label}
              </div>
              <div className="line-clamp-3 text-[13px] font-semibold leading-snug">
                {result.match.title}
              </div>
              <div className="mt-1 truncate text-[11px] text-neutral-500">
                {result.match.source ?? 'Source unavailable'}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-neutral-200 px-3 py-2 text-[11px] text-neutral-600">
            {result.match.price && <span>{result.match.price}</span>}
            {result.match.stock && <span>{result.match.stock}</span>}
            {result.match.condition && <span>{result.match.condition}</span>}
          </div>
        </a>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4">
        <div className="max-w-[70%] rounded-full border border-white/20 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur">
          {activeMessage}
        </div>
        {cameraActive && (
          <button
            type="button"
            onClick={disable}
            className="pointer-events-auto rounded-full border border-white/25 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-white/80 backdrop-blur transition-colors hover:border-white hover:text-white"
          >
            CAMERA OFF
          </button>
        )}
      </div>

      {(message || handError || poseError) && cameraActive && (
        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-30 rounded-md border border-white/20 bg-black/60 p-3 text-[11px] leading-relaxed text-white/85 backdrop-blur">
          {message ?? handError ?? poseError}
        </div>
      )}

      {!cameraActive && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-6">
          <button
            type="button"
            onClick={enable}
            disabled={cameraState === 'requesting'}
            className="rounded-full border border-white/35 bg-black/45 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-white/90 backdrop-blur transition-colors hover:border-white hover:text-white disabled:opacity-60"
          >
            {cameraLabel(cameraState)}
          </button>
        </div>
      )}
    </div>
  );
}
