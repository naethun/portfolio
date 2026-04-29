'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { GestureState } from './useSwipeGesture';
import type { TimelineMode } from './Timeline';
import type { HandShape } from './useHandShape';

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [17, 18], [18, 19], [19, 20],  // pinky
  [0, 17],                                  // palm
];

const PREVIEW_W = 160;
const PREVIEW_H = 120;

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  cameraEnabled: boolean;
  index: number;
  total: number;
  gesture: GestureState;
  fps: number;
  filename: string;
  status: string;
  mode: TimelineMode;
  handShape: HandShape;
}

export function HUD({
  videoRef,
  landmarksRef,
  cameraEnabled,
  index,
  total,
  gesture,
  fps,
  filename,
  status,
  mode,
  handShape,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!cameraEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = () => {
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        ctx.save();
        ctx.setTransform(-1, 0, 0, 1, PREVIEW_W, 0); // mirror horizontally
        ctx.drawImage(video, 0, 0, PREVIEW_W, PREVIEW_H);
        ctx.restore();

        const result = landmarksRef.current;
        if (result && result.landmarks.length > 0) {
          const lm = result.landmarks[0];
          // landmarks are in 0..1 (already in camera POV); we draw onto the
          // mirrored preview, so flip x to match.
          const px = (i: number) => (1 - lm[i].x) * PREVIEW_W;
          const py = (i: number) => lm[i].y * PREVIEW_H;

          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const [a, b] of HAND_CONNECTIONS) {
            ctx.moveTo(px(a), py(a));
            ctx.lineTo(px(b), py(b));
          }
          ctx.stroke();

          ctx.fillStyle = 'rgba(255,255,255,1)';
          for (let i = 0; i < lm.length; i++) {
            ctx.beginPath();
            ctx.arc(px(i), py(i), 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, PREVIEW_W, PREVIEW_H);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [cameraEnabled, videoRef, landmarksRef]);

  const gestureLabel =
    gesture === 'right' ? 'SWIPE →' : gesture === 'left' ? 'SWIPE ←' : 'IDLE';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 font-mono text-[11px] tracking-wider text-white">
      {cameraEnabled && (
        <div className="absolute left-4 top-4 border border-white/40">
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            className="block"
          />
        </div>
      )}

      <div className="absolute bottom-4 left-4 leading-relaxed">
        <div>{`[${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}]`}</div>
        <div>{`MODE   ${mode === 'open' ? 'OPEN   ' : 'CLUSTER'}`}</div>
        <div>{`HAND   ${handShape.toUpperCase()}`}</div>
        <div>{`STATE  ${gestureLabel}`}</div>
        <div>{`FPS    ${String(fps).padStart(2, '0')}`}</div>
        <div className="mt-2 opacity-60">{status}</div>
      </div>

      <div className="absolute bottom-4 right-4 opacity-80">
        {`loop-imgs/${filename}`}
      </div>
    </div>
  );
}
