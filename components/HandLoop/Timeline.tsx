'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MacWindow } from './MacWindow';
import type { GestureState } from './useSwipeGesture';
import type { HandShape } from './useHandShape';

interface LoopImage {
  src: string;
  filename: string;
}

export type TimelineMode = 'cluster' | 'helix' | 'ring' | 'ring-zoom';

export interface TimelineHandle {
  scrub: (dir: 'right' | 'left') => void;
}

interface InfoData {
  frontIndex: number;
  total: number;
  handShape: HandShape;
  pinch: { primary: boolean; secondary: boolean };
  gesture: GestureState;
  fps: number;
  status: string;
}

interface Props {
  images: LoopImage[];
  index: number;
  mode: TimelineMode;
  clusterAngle: number;
  onFrontChange?: (i: number) => void;
  title?: string;
  info?: InfoData;
  frameless?: boolean;
}

interface Tx {
  x: number;
  y: number;
  z: number;
  rotate: number;
  rotateY: number;
  scale: number;
  opacity: number;
  zIndex: number;
}

// Deterministic 0..1 noise from an integer seed.
function rand(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

const CARD_W = 1280;
const CARD_H = 800;

// Ambient — calm, breath-paced. 1 rev / 24s.
const AMBIENT_RATE = (Math.PI * 2) / 24000;
const SCRUB_DURATION = 400; // ms

function clusterTransform(
  i: number,
  total: number,
  clusterAngle: number,
  currentIndex: number
): Tx {
  const seed = i * 17 + Math.round(clusterAngle / 25);
  const dx = (rand(seed) - 0.5) * CARD_W * 0.16;
  const dy = (rand(seed + 1) - 0.5) * CARD_H * 0.16;
  const rot = (rand(seed + 2) - 0.5) * 30 + clusterAngle * 0.4;
  return {
    x: dx,
    y: dy,
    z: 0,
    rotate: rot,
    rotateY: 0,
    scale: 0.42,
    opacity: 1,
    zIndex: i === currentIndex ? total + 1 : Math.floor(rand(seed + 3) * total),
  };
}

interface HelixGeo {
  turns: number;
  radius: number;
  verticalSpan: number;
  ringRadius: number;
  ringZoomRadius: number;
}

function helixTransform(
  i: number,
  total: number,
  phase: number,
  geo: HelixGeo
): Tx {
  const theta = phase + (i / total) * Math.PI * 2 * geo.turns;
  const x = geo.radius * Math.sin(theta);
  const z = geo.radius * (Math.cos(theta) - 1);
  const y = total > 1 ? (i / (total - 1) - 0.5) * geo.verticalSpan : 0;
  const rotateY = (-theta * 180) / Math.PI;
  const front = (Math.cos(theta) + 1) / 2;
  const opacity = 0.3 + front * 0.7;
  const scale = 0.7 + front * 0.3;
  const zIndex = Math.round(front * 1000);
  return { x, y, z, rotate: 0, rotateY, scale, opacity, zIndex };
}

function ringTransform(
  i: number,
  total: number,
  phase: number,
  geo: HelixGeo
): Tx {
  const theta = phase + (i / total) * Math.PI * 2;
  const r = geo.ringRadius;
  return {
    x: r * Math.sin(theta),
    y: -r * Math.cos(theta),
    z: 0,
    rotate: 0,
    rotateY: 0,
    scale: 0.55,
    opacity: 1,
    zIndex: i,
  };
}

// Ring-zoom: same circle geometry, but the center is pushed DOWN past the
// bottom of the stage and the cards are scaled up. The visible result is the
// top arc filling the upper portion of the window — a "dolly into the wheel"
// feel — while the bottom arc rotates off-screen below.
function ringZoomTransform(
  i: number,
  total: number,
  phase: number,
  geo: HelixGeo
): Tx {
  const theta = phase + (i / total) * Math.PI * 2;
  const r = geo.ringZoomRadius;
  const c = Math.cos(theta);
  const yOffset = r * 0.6;
  return {
    x: r * Math.sin(theta),
    y: yOffset - r * c,
    z: 0,
    rotate: 0,
    rotateY: 0,
    scale: 1.0,
    opacity: c > 0 ? 1 : 0,
    zIndex: i,
  };
}

export const Timeline = forwardRef<TimelineHandle, Props>(function Timeline(
  { images, index, mode, clusterAngle, onFrontChange, title, info, frameless = false },
  ref
) {
  const total = images.length;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ w: CARD_W, h: CARD_H });

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setStageSize({ w: r.width || CARD_W, h: r.height || CARD_H });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const geo = useMemo<HelixGeo>(
    () => ({
      turns: Math.max(1.5, total / 5),
      radius: stageSize.w * 0.28,
      verticalSpan: stageSize.h * 0.78,
      // Use the smaller stage axis so the ring stays inside the window on
      // both wide and tall viewports, with margin for card height.
      ringRadius: Math.min(stageSize.w, stageSize.h) * 0.30,
      ringZoomRadius: Math.min(stageSize.w, stageSize.h) * 0.55,
    }),
    [total, stageSize]
  );

  // Phase as React state — re-renders at ~60Hz when in animated modes. With ~20
  // motion.divs this is fine; framer-motion springs the animate targets without
  // rebuilding animations.
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);

  const scrubFromRef = useRef(0);
  const scrubTargetRef = useRef(0);
  const scrubStartRef = useRef(0);
  const scrubUntilRef = useRef(0);

  const lastFrontRef = useRef(-1);

  useImperativeHandle(
    ref,
    () => ({
      scrub(dir) {
        if (total <= 0) return;
        const slot = (Math.PI * 2) / total;
        const now = performance.now();
        scrubFromRef.current = phaseRef.current;
        scrubTargetRef.current =
          phaseRef.current + (dir === 'right' ? slot : -slot);
        scrubStartRef.current = now;
        scrubUntilRef.current = now + SCRUB_DURATION;
      },
    }),
    [total]
  );

  // RAF loop driving phase. Runs in any animated mode.
  const animated = mode === 'helix' || mode === 'ring' || mode === 'ring-zoom';
  useEffect(() => {
    if (!animated || total === 0) return;
    let rafId = 0;
    let lastT = performance.now();
    const tick = (t: number) => {
      const dt = t - lastT;
      lastT = t;

      if (t < scrubUntilRef.current) {
        const k = Math.min(
          1,
          (t - scrubStartRef.current) / SCRUB_DURATION
        );
        const ease = 1 - Math.pow(1 - k, 3);
        phaseRef.current =
          scrubFromRef.current +
          (scrubTargetRef.current - scrubFromRef.current) * ease;
      } else {
        phaseRef.current += dt * AMBIENT_RATE;
      }

      // Front-of-helix index — only meaningful in helix mode but cheap to keep.
      let bestI = 0;
      let bestFront = -Infinity;
      for (let i = 0; i < total; i++) {
        const theta =
          phaseRef.current + (i / total) * Math.PI * 2 * geo.turns;
        const front = (Math.cos(theta) + 1) / 2;
        if (front > bestFront) {
          bestFront = front;
          bestI = i;
        }
      }
      if (bestI !== lastFrontRef.current) {
        lastFrontRef.current = bestI;
        onFrontChange?.(bestI);
      }

      setPhase(phaseRef.current);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animated, total, geo, onFrontChange]);

  const transforms = useMemo<Tx[]>(() => {
    return images.map((_, i) => {
      if (mode === 'cluster') return clusterTransform(i, total, clusterAngle, index);
      if (mode === 'ring') return ringTransform(i, total, phase, geo);
      if (mode === 'ring-zoom') return ringZoomTransform(i, total, phase, geo);
      return helixTransform(i, total, phase, geo);
    });
  }, [images, mode, total, clusterAngle, index, phase, geo]);

  const modeLabel =
    mode === 'helix'
      ? 'HELIX    '
      : mode === 'ring'
        ? 'RING     '
        : mode === 'ring-zoom'
          ? 'RING-ZOOM'
          : 'CLUSTER  ';

  const stage = (
    <div
      ref={stageRef}
      style={{
        width: frameless ? '100%' : 'min(86vw, 1180px)',
        height: frameless ? '100%' : 'min(70vh, 760px)',
        perspective: '1200px',
        transformStyle: 'preserve-3d',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
        {images.map((img, i) => {
          const t = transforms[i];
          const transition = mode === 'cluster'
            ? { type: 'spring' as const, stiffness: 180, damping: 22 }
            : { type: 'spring' as const, stiffness: 320, damping: 40, mass: 0.4 };
          return (
            <motion.div
              key={img.src}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 'clamp(72px, 11%, 150px)',
                height: 'clamp(96px, 18%, 200px)',
                translate: '-50% -50%',
                transformStyle: 'preserve-3d',
                zIndex: t.zIndex,
              }}
              animate={{
                x: t.x,
                y: t.y,
                z: t.z,
                rotate: t.rotate,
                rotateY: t.rotateY,
                scale: t.scale,
                opacity: t.opacity,
              }}
              transition={transition}
            >
              <div className="relative h-full w-full bg-black/5 ring-1 ring-black/10 shadow-lg">
                <Image
                  src={img.src}
                  alt={img.filename}
                  fill
                  sizes="(max-width: 1280px) 50vw, 600px"
                  className="object-cover"
                  priority={i === index}
                />
              </div>
            </motion.div>
          );
        })}

        {info && (
          <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] leading-relaxed tracking-wider text-neutral-500 md:bottom-4 md:left-4">
            <div>
              {mode === 'cluster'
                ? `IDX    [${String(index + 1).padStart(2, '0')} / ${String(info.total).padStart(2, '0')}]`
                : `FRONT  [${String(info.frontIndex + 1).padStart(2, '0')} / ${String(info.total).padStart(2, '0')}]`}
            </div>
            <div>{`MODE   ${modeLabel}`}</div>
            <div>{`HAND   ${info.handShape.toUpperCase()}`}</div>
            <div>{`PINCH  P:${info.pinch.primary ? 'YES' : 'NO '}  S:${info.pinch.secondary ? 'YES' : 'NO '}`}</div>
            <div>
              {`STATE  ${
                info.gesture === 'right'
                  ? 'SWIPE →'
                  : info.gesture === 'left'
                    ? 'SWIPE ←'
                    : 'IDLE'
              }`}
            </div>
            <div>{`FPS    ${String(info.fps).padStart(2, '0')}`}</div>
            <div className="mt-2 opacity-70">{info.status}</div>
          </div>
        )}
    </div>
  );

  if (frameless) {
    return (
      <div className="pointer-events-none absolute inset-0">
        {stage}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-6 md:px-12 md:py-10">
      <MacWindow size="md" title={title} contentClassName="relative bg-white">
        {stage}
      </MacWindow>
    </div>
  );
});
