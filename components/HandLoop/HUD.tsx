'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { MacWindow } from './MacWindow';

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [17, 18], [18, 19], [19, 20],  // pinky
  [0, 17],                                  // palm
];

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  landmarksRef: RefObject<HandLandmarkerResult | null>;
  cameraEnabled: boolean;
}

export function HUD({ videoRef, landmarksRef, cameraEnabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  // Seed position from the initial top/left layout so the first drag doesn't jump.
  useLayoutEffect(() => {
    if (!cameraEnabled || pos !== null) return;
    const el = wrapperRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;
    const elRect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    setPos({ x: elRect.left - parentRect.left, y: elRect.top - parentRect.top });
  }, [cameraEnabled, pos]);

  const clamp = useCallback((x: number, y: number) => {
    const el = wrapperRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return { x, y };
    const maxX = Math.max(0, parent.clientWidth - el.offsetWidth);
    const maxY = Math.max(0, parent.clientHeight - el.offsetHeight);
    return {
      x: Math.min(Math.max(0, x), maxX),
      y: Math.min(Math.max(0, y), maxY),
    };
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const el = wrapperRef.current;
      const parent = el?.offsetParent as HTMLElement | null;
      if (!el || !parent) return;
      const elRect = el.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      const originX = elRect.left - parentRect.left;
      const originY = elRect.top - parentRect.top;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX,
        originY,
      };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      const next = clamp(
        drag.originX + (e.clientX - drag.startX),
        drag.originY + (e.clientY - drag.startY),
      );
      setPos(next);
    },
    [clamp],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const el = wrapperRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
  }, []);

  useEffect(() => {
    if (!cameraEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let ro: ResizeObserver | null = null;

    // Size the backing store to the displayed size × DPR so the preview stays
    // crisp on Retina — a fixed low-res canvas upscaled looked pixelated.
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
      const video = videoRef.current;
      const vw = video?.videoWidth ?? 0;
      const vh = video?.videoHeight ?? 0;

      if (video && video.readyState >= 2 && vw > 0 && vh > 0) {
        // object-cover: fill the window preserving the stream's aspect ratio
        // (no squeeze), cropping any overflow.
        const scale = Math.max(cw / vw, ch / vh);
        const dispW = vw * scale;
        const dispH = vh * scale;
        const offX = (cw - dispW) / 2;
        const offY = (ch - dispH) / 2;

        ctx.clearRect(0, 0, cw, ch);
        ctx.save();
        ctx.setTransform(-1, 0, 0, 1, cw, 0); // mirror horizontally (selfie)
        ctx.drawImage(video, offX, offY, dispW, dispH);
        ctx.restore();

        const result = landmarksRef.current;
        if (result && result.landmarks.length > 0) {
          for (let h = 0; h < result.landmarks.length; h++) {
            const lm = result.landmarks[h];
            const label = result.handedness?.[h]?.[0]?.categoryName;
            // "Right" = user's primary hand (under selfie-mirror).
            const isPrimary = label === 'Right';
            const stroke = isPrimary
              ? 'rgba(255,255,255,0.95)'
              : 'rgba(255,180,80,0.95)';
            const fill = isPrimary ? 'rgba(255,255,255,1)' : 'rgba(255,180,80,1)';
            // Mirror x manually to match the flipped video; apply cover offsets.
            const px = (i: number) => offX + (1 - lm[i].x) * dispW;
            const py = (i: number) => offY + lm[i].y * dispH;

            ctx.strokeStyle = stroke;
            ctx.lineWidth = Math.max(1.5, cw * 0.006);
            ctx.beginPath();
            for (const [a, b] of HAND_CONNECTIONS) {
              ctx.moveTo(px(a), py(a));
              ctx.lineTo(px(b), py(b));
            }
            ctx.stroke();

            ctx.fillStyle = fill;
            const r = Math.max(2, cw * 0.009);
            for (let i = 0; i < lm.length; i++) {
              ctx.beginPath();
              ctx.arc(px(i), py(i), r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      } else {
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, cw, ch);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro?.disconnect();
    };
  }, [cameraEnabled, videoRef, landmarksRef]);

  if (!cameraEnabled) return null;

  const positioned = pos !== null;
  const style: CSSProperties = positioned
    ? { left: pos.x, top: pos.y, touchAction: 'none' }
    : { touchAction: 'none' };

  return (
    <div
      ref={wrapperRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`pointer-events-auto absolute z-20 cursor-grab select-none active:cursor-grabbing ${
        positioned ? '' : 'left-4 top-4 md:left-8 md:top-8'
      }`}
      style={style}
    >
      <MacWindow size="sm" title="Camera">
        <canvas
          ref={canvasRef}
          className="block bg-black"
          style={{
            width: 'clamp(160px, 20vw, 260px)',
            height: 'auto',
            aspectRatio: '16 / 9',
          }}
        />
      </MacWindow>
    </div>
  );
}
