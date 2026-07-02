'use client';

import { useEffect, useState } from 'react';
import { limbPath } from './geometry';

export interface LimbLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * SVG connector layer: one bezier per item from its anchor dot on the image
 * to its product card. Staggered stroke draw-in on mount; the hovered item's
 * limb stays dark while the rest recede. Hidden on narrow viewports (the
 * stacked layout drops the limbs per spec).
 */
export function Limbs({ lines, active }: { lines: LimbLine[]; active: number | null }) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
    >
      {lines.map((line, i) => (
        <g key={i}>
          <path
            d={limbPath(line.x1, line.y1, line.x2, line.y2)}
            fill="none"
            stroke={active === null || active === i ? 'rgba(23,23,23,0.5)' : 'rgba(23,23,23,0.14)'}
            strokeWidth={1}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{
              transition: `stroke-dashoffset 600ms ease-out ${i * 120}ms, stroke 200ms ease`,
            }}
          />
          <circle
            cx={line.x2}
            cy={line.y2}
            r={2.5}
            fill="rgba(23,23,23,0.5)"
            opacity={drawn ? 1 : 0}
            style={{ transition: `opacity 200ms ease ${600 + i * 120}ms` }}
          />
        </g>
      ))}
    </svg>
  );
}
