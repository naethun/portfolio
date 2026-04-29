'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface LoopImage {
  src: string;
  filename: string;
}

export type TimelineMode = 'cluster' | 'open';

interface Props {
  images: LoopImage[];
  index: number;
  mode: TimelineMode;
  clusterAngle: number;
}

// Deterministic 0..1 noise from an integer seed.
function rand(seed: number): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

interface Tx {
  x: number;       // px relative to card center
  y: number;
  rotate: number;  // deg, in-plane
  rotateY: number; // deg, around vertical axis
  scale: number;
  opacity: number;
  zIndex: number;
}

const CARD_W = 1280;
const CARD_H = 800;

function clusterTransform(i: number, total: number, clusterAngle: number, currentIndex: number): Tx {
  const seed = i * 17 + Math.round(clusterAngle / 25);
  const dx = (rand(seed) - 0.5) * CARD_W * 0.16;
  const dy = (rand(seed + 1) - 0.5) * CARD_H * 0.16;
  const rot = (rand(seed + 2) - 0.5) * 30 + clusterAngle * 0.4;
  return {
    x: dx,
    y: dy,
    rotate: rot,
    rotateY: 0,
    scale: 0.42,
    opacity: 1,
    zIndex: i === currentIndex ? total + 1 : Math.floor(rand(seed + 3) * total),
  };
}

function arcTransform(i: number, currentIndex: number, total: number): Tx {
  let offset = i - currentIndex;
  const half = Math.floor(total / 2);
  if (offset > half) offset -= total;
  if (offset < -half) offset += total;

  const absO = Math.abs(offset);
  const visible = absO <= 4;
  return {
    x: offset * (CARD_W * 0.22),
    y: 0,
    rotate: 0,
    rotateY: Math.max(-75, Math.min(75, -offset * 35)),
    scale: 1 - Math.min(absO, 4) * 0.15,
    opacity: visible ? Math.max(0, 1 - absO * 0.25) : 0,
    zIndex: 100 - absO,
  };
}

export function Timeline({ images, index, mode, clusterAngle }: Props) {
  const total = images.length;

  const transforms = useMemo<Tx[]>(() => {
    return images.map((_, i) =>
      mode === 'open'
        ? arcTransform(i, index, total)
        : clusterTransform(i, total, clusterAngle, index)
    );
  }, [images, index, mode, clusterAngle, total]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div
        className="relative bg-white shadow-2xl"
        style={{
          width: 'min(90vw, 1280px)',
          height: 'min(70vh, 800px)',
          perspective: '1200px',
          transformStyle: 'preserve-3d',
          overflow: 'hidden',
        }}
      >
        {images.map((img, i) => {
          const t = transforms[i];
          return (
            <motion.div
              key={img.src}
              className="absolute left-1/2 top-1/2"
              style={{
                width: '46%',
                height: '70%',
                translate: '-50% -50%',
                transformStyle: 'preserve-3d',
                zIndex: t.zIndex,
              }}
              animate={{
                x: t.x,
                y: t.y,
                rotate: t.rotate,
                rotateY: t.rotateY,
                scale: t.scale,
                opacity: t.opacity,
              }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}
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
      </div>
    </div>
  );
}
