'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import { SkeletonOverlay } from '@/components/HandLoop/SkeletonOverlay';
import { useHandTracking } from '@/components/HandLoop/useHandTracking';
import { useCameraStream, type CameraState } from '@/components/ImageUniverse/useCameraStream';
import {
  displayRectToVideoSourceRect,
  handGestureInputFromLandmarks,
  initialWindowGestureState,
  updateWindowGestureFromHands,
} from './windowGesture.mjs';

type WindowModeKind = 'portrait' | 'reels';
type WindowPhase = 'idle' | 'sizingWidth' | 'sizingHeight' | 'locked';

interface Point {
  x: number;
  y: number;
}

interface NormalizedRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GestureInput {
  center: Point;
  pinchRatio: number;
  openPalm: boolean;
}

interface WindowGestureState {
  phase: WindowPhase;
  rect: NormalizedRect | null;
  anchor?: Point;
  widthRect?: NormalizedRect;
  centerY?: number;
  heightStartRatio?: number;
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

const ASCII_RAMP = ' .,:;irsXA253hMHGS#9B&@';
const FONT_STACK = '"SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';

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

function drawAsciiWindow({
  ctx,
  sampleCanvas,
  sampleCtx,
  video,
  rect,
  phase,
  metrics,
  dpr,
}: {
  ctx: CanvasRenderingContext2D;
  sampleCanvas: HTMLCanvasElement;
  sampleCtx: CanvasRenderingContext2D;
  video: HTMLVideoElement;
  rect: NormalizedRect;
  phase: WindowPhase;
  metrics: CoverMetrics;
  dpr: number;
}) {
  const screen = rectToScreen(rect, metrics);
  if (screen.width < 5 || screen.height < 5) return;

  const { sx, sy, sw, sh, flipX } = displayRectToVideoSourceRect(rect, video);
  const fontCss = clamp(screen.width / 70, 4.5, 8.5);
  const cellW = fontCss * 0.58;
  const cellH = fontCss * 1.08;
  const cols = clamp(Math.floor(screen.width / cellW), 12, 132);
  const rows = clamp(Math.floor(screen.height / cellH), 6, 150);
  if (sampleCanvas.width !== cols || sampleCanvas.height !== rows) {
    sampleCanvas.width = cols;
    sampleCanvas.height = rows;
  }

  sampleCtx.imageSmoothingEnabled = true;
  sampleCtx.clearRect(0, 0, cols, rows);
  sampleCtx.save();
  if (flipX) {
    sampleCtx.translate(cols, 0);
    sampleCtx.scale(-1, 1);
  }
  sampleCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cols, rows);
  sampleCtx.restore();
  const data = sampleCtx.getImageData(0, 0, cols, rows).data;

  const left = screen.left * dpr;
  const top = screen.top * dpr;
  const width = screen.width * dpr;
  const height = screen.height * dpr;
  const font = fontCss * dpr;
  const drawCellW = (screen.width / cols) * dpr;
  const drawCellH = (screen.height / rows) * dpr;

  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.fillStyle = 'rgb(0, 0, 0)';
  ctx.fillRect(left, top, width, height);
  ctx.font = `${font}px ${FONT_STACK}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const charIndex = Math.min(ASCII_RAMP.length - 1, Math.floor(luma * ASCII_RAMP.length));
      const tone = Math.round(168 + luma * 87);
      ctx.fillStyle = `rgba(${tone}, ${Math.round(tone * 0.93)}, ${Math.round(tone * 0.88)}, 0.96)`;
      ctx.fillText(
        ASCII_RAMP[charIndex],
        left + x * drawCellW,
        top + y * drawCellH + drawCellH * 0.86,
      );
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle =
    phase === 'locked' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(248, 188, 178, 0.88)';
  ctx.lineWidth = Math.max(1, dpr);
  ctx.strokeRect(left + 0.5 * dpr, top + 0.5 * dpr, width - dpr, height - dpr);
  ctx.restore();
}

export default function WindowMode({ mode }: { mode: WindowModeKind }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const landmarksRef = useRef<HandLandmarkerResult | null>(null);
  const gestureRef = useRef<WindowGestureState>(
    initialWindowGestureState() as WindowGestureState,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [handError, setHandError] = useState<string | null>(null);

  const { state: cameraState, enable } = useCameraStream({ videoRef });
  const cameraActive = cameraState === 'granted';

  const onResult = useCallback((result: HandLandmarkerResult) => {
    landmarksRef.current = result;
    setHandError(null);
    const inputs = result.landmarks
      .map((landmarks) => handGestureInputFromLandmarks(landmarks, { mirrored: true }))
      .filter((input): input is GestureInput => Boolean(input));

    gestureRef.current = updateWindowGestureFromHands(
      gestureRef.current,
      inputs,
    ) as WindowGestureState;
  }, []);

  useHandTracking({
    videoRef,
    enabled: cameraActive,
    onResult,
    onError: useCallback((err: unknown) => {
      setHandError(err instanceof Error ? err.message : 'Hand model failed to load.');
    }, []),
  });

  useEffect(() => {
    if (cameraActive) return;
    landmarksRef.current = null;
    gestureRef.current = initialWindowGestureState() as WindowGestureState;
  }, [cameraActive]);

  useEffect(() => {
    if (!cameraActive) return;
    const canvas = canvasRef.current;
    const sampleCanvas = document.createElement('canvas');
    const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !sampleCtx) return;

    let rafId = 0;
    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const draw = () => {
      sizeCanvas();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const root = rootRef.current;
      const video = videoRef.current;
      const state = gestureRef.current;
      if (root && video && state.rect && video.readyState >= 2) {
        const metrics = getCoverMetrics(root, video);
        if (metrics) {
          drawAsciiWindow({
            ctx,
            sampleCanvas,
            sampleCtx,
            video,
            rect: state.rect,
            phase: state.phase,
            metrics,
            dpr: window.devicePixelRatio || 1,
          });
        }
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [cameraActive]);

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
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />
      <div className="absolute inset-0 z-20">
        <SkeletonOverlay
          landmarksRef={landmarksRef}
          videoRef={videoRef}
          enabled={cameraActive}
        />
      </div>

      {handError && cameraActive && (
        <div className="pointer-events-none absolute inset-x-4 bottom-5 z-30 rounded-md border border-white/20 bg-black/60 p-3 text-[11px] leading-relaxed text-white/85 backdrop-blur">
          {handError}
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
