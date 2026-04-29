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

export type TimelineMode = 'cluster' | 'open';

export interface TimelineHandle {
  scrub: (dir: 'right' | 'left') => void;
  setPicked: (index: number | null) => void;
}

interface InfoData {
  frontIndex: number;
  total: number;
  handShape: HandShape;
  pinching: boolean;
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

// Helix
const AMBIENT_RATE = (Math.PI * 2) / 8000; // rad/ms — 1 rev / 8s
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
}

function helixTransform(
  i: number,
  total: number,
  phase: number,
  geo: HelixGeo,
  pickedDimming: boolean
): Tx {
  const theta = phase + (i / total) * Math.PI * 2 * geo.turns;
  const x = geo.radius * Math.sin(theta);
  const z = geo.radius * (Math.cos(theta) - 1);
  const y = total > 1 ? (i / (total - 1) - 0.5) * geo.verticalSpan : 0;
  const rotateY = (-theta * 180) / Math.PI;
  const front = (Math.cos(theta) + 1) / 2;
  const baseOpacity = 0.3 + front * 0.7;
  const opacity = pickedDimming ? baseOpacity * 0.4 : baseOpacity;
  const scale = 0.7 + front * 0.3;
  const zIndex = Math.round(front * 1000);
  return { x, y, z, rotate: 0, rotateY, scale, opacity, zIndex };
}

function pickedTransform(): Tx {
  return {
    x: 0,
    y: 0,
    z: 200,
    rotate: 0,
    rotateY: 0,
    scale: 2,
    opacity: 1,
    zIndex: 10000,
  };
}

export const Timeline = forwardRef<TimelineHandle, Props>(function Timeline(
  { images, index, mode, clusterAngle, onFrontChange, title, info },
  ref
) {
  const total = images.length;

  const geo = useMemo<HelixGeo>(
    () => ({
      turns: Math.max(1, total / 6),
      radius: CARD_W * 0.2,
      verticalSpan: CARD_H * 0.55,
    }),
    [total]
  );

  // Phase as React state — re-renders at ~60Hz when in open mode. With ~20
  // motion.divs this is fine; framer-motion springs the animate targets without
  // rebuilding animations.
  const [phase, setPhase] = useState(0);
  const phaseRef = useRef(0);

  const scrubFromRef = useRef(0);
  const scrubTargetRef = useRef(0);
  const scrubStartRef = useRef(0);
  const scrubUntilRef = useRef(0);

  const pickedRef = useRef<number | null>(null);
  const [picked, setPickedState] = useState<number | null>(null);
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
      setPicked(idx) {
        pickedRef.current = idx;
        setPickedState(idx);
      },
    }),
    [total]
  );

  // RAF loop driving phase. Only runs while mode === 'open'.
  useEffect(() => {
    if (mode !== 'open' || total === 0) return;
    let rafId = 0;
    let lastT = performance.now();
    const tick = (t: number) => {
      const dt = t - lastT;
      lastT = t;

      if (pickedRef.current !== null) {
        // hold phase
      } else if (t < scrubUntilRef.current) {
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

      // Front-of-helix index (largest frontness this frame).
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
  }, [mode, total, geo, onFrontChange]);

  const transforms = useMemo<Tx[]>(() => {
    return images.map((_, i) => {
      if (mode === 'cluster') {
        return clusterTransform(i, total, clusterAngle, index);
      }
      if (picked === i) return pickedTransform();
      return helixTransform(i, total, phase, geo, picked !== null);
    });
  }, [images, mode, total, clusterAngle, index, phase, geo, picked]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-6 md:px-12 md:py-10">
      <MacWindow size="md" title={title} contentClassName="relative bg-white">
        <div
          style={{
            width: 'min(86vw, 1180px)',
            height: 'min(70vh, 760px)',
            perspective: '1200px',
            transformStyle: 'preserve-3d',
            overflow: 'hidden',
          }}
        >
        {images.map((img, i) => {
          const t = transforms[i];
          const isPicked = picked === i;
          // Ambient helix updates need tight tracking; cluster/pick swaps want
          // a soft spring. Use a low-mass spring everywhere — lag is invisible
          // for the steady-state ambient case and pleasing for big swaps.
          const transition = isPicked || mode === 'cluster'
            ? { type: 'spring' as const, stiffness: 180, damping: 22 }
            : { type: 'spring' as const, stiffness: 320, damping: 40, mass: 0.4 };
          return (
            <motion.div
              key={img.src}
              className="absolute left-1/2 top-1/2"
              style={{
                width: '38%',
                height: '56%',
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
                  priority={i === index || i === picked}
                />
              </div>
            </motion.div>
          );
        })}

        {info && (
          <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] leading-relaxed tracking-wider text-neutral-500 md:bottom-4 md:left-4">
            <div>
              {mode === 'open'
                ? `FRONT  [${String(info.frontIndex + 1).padStart(2, '0')} / ${String(info.total).padStart(2, '0')}]`
                : `IDX    [${String(index + 1).padStart(2, '0')} / ${String(info.total).padStart(2, '0')}]`}
            </div>
            <div>{`MODE   ${mode === 'open' ? 'OPEN   ' : 'CLUSTER'}`}</div>
            <div>{`HAND   ${info.handShape.toUpperCase()}`}</div>
            <div>{`PINCH  ${info.pinching ? 'YES' : 'NO '}`}</div>
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
      </MacWindow>
    </div>
  );
});
