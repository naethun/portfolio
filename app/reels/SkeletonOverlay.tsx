'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

interface Props {
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

export function SkeletonOverlay({ landmarksRef, videoRef, enabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let ro: ResizeObserver | null = null;

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    sizeCanvas();
    ro = new ResizeObserver(sizeCanvas);
    ro.observe(canvas);

    const draw = () => {
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      const video = videoRef.current;
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;
      const result = landmarksRef.current;

      if (result && result.landmarks.length > 0 && vw > 0 && vh > 0) {
        // Match `object-cover`: scale so the video covers the canvas; crop overflow.
        const scale = Math.max(cw / vw, ch / vh);
        const dispW = vw * scale;
        const dispH = vh * scale;
        const offX = (cw - dispW) / 2;
        const offY = (ch - dispH) / 2;

        for (let i = 0; i < result.landmarks.length; i++) {
          const lm = result.landmarks[i];
          const label = result.handedness?.[i]?.[0]?.categoryName;
          const isPrimary = label === 'Right';
          const stroke = isPrimary
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,180,80,0.95)';
          const fill = isPrimary
            ? 'rgba(255,255,255,1)'
            : 'rgba(255,180,80,1)';

          // Mirror x to match the bottom video's scaleX(-1) display.
          const px = (n: number) => offX + (1 - lm[n].x) * dispW;
          const py = (n: number) => offY + lm[n].y * dispH;

          ctx.lineWidth = Math.max(2, dispW * 0.003);
          ctx.strokeStyle = stroke;
          ctx.beginPath();
          for (const [a, b] of HAND_CONNECTIONS) {
            ctx.moveTo(px(a), py(a));
            ctx.lineTo(px(b), py(b));
          }
          ctx.stroke();

          ctx.fillStyle = fill;
          const r = Math.max(3, dispW * 0.005);
          for (let j = 0; j < lm.length; j++) {
            ctx.beginPath();
            ctx.arc(px(j), py(j), r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [enabled, landmarksRef, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
