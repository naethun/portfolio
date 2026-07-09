'use client';

import { memo, useEffect, useMemo, useRef } from 'react';

import type { FrameSize, VideoSize } from './cameraProjection';
import type { PalmAnchor } from './palmAnchor';
import { buildARAsciiOverlayPlan } from './arAsciiOverlayPlan';
import { resolveARSymbolScreenTarget } from './arSymbolScreenTarget';
import { SYMBOL_TEXT_TEXTURES } from './textField';
import type { SymbolKind } from './types';

interface ARSymbolFallbackOverlayProps {
  symbol: SymbolKind;
  palmAnchor: PalmAnchor | null;
  videoSize: VideoSize | null;
  frameSize: FrameSize | null;
}

const SYMBOL_GLOW_COLORS: Record<SymbolKind, string> = {
  cross: 'rgba(244, 242, 236, 0.72)',
  ring: 'rgba(201, 255, 244, 0.72)',
  square: 'rgba(255, 231, 184, 0.72)',
  star: 'rgba(255, 214, 243, 0.72)',
};

const ASCII_REFRESH_MS = 180;

const AsciiPalmSymbol = memo(function AsciiPalmSymbol({
  active,
  symbol,
  size,
}: {
  active: boolean;
  symbol: SymbolKind;
  size: number;
}) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const staticPlan = useMemo(
    () =>
      buildARAsciiOverlayPlan({
        symbol,
        size: Math.max(1, Math.round(size)),
        timeSeconds: 0,
      }),
    [size, symbol]
  );

  useEffect(() => {
    const cssSize = Math.max(1, Math.round(size));
    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelSize = Math.max(1, Math.round(cssSize * dpr));
      const plan = buildARAsciiOverlayPlan({
        symbol,
        size: cssSize,
        timeSeconds: now / 1000,
      });
      const texture = SYMBOL_TEXT_TEXTURES[symbol];

      for (let index = 0; index < plan.layers.length; index++) {
        const canvas = canvasRefs.current[index];
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) continue;

        if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
          canvas.width = pixelSize;
          canvas.height = pixelSize;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssSize, cssSize);

        if (!active) continue;

        const layer = plan.layers[index];
        ctx.font = `${plan.fontPx}px ${texture.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = SYMBOL_GLOW_COLORS[symbol];
        ctx.shadowBlur = layer.shadowBlur;
        ctx.fillStyle = '#f4f2ec';

        for (const command of plan.commands) {
          ctx.globalAlpha = Math.min(1, command.alpha * layer.opacity * 1.15);
          ctx.fillText(command.glyph, command.x, command.y);
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
    };

    draw(performance.now());
    if (!active) return;

    const interval = window.setInterval(
      () => draw(performance.now()),
      ASCII_REFRESH_MS
    );
    return () => window.clearInterval(interval);
  }, [active, size, symbol]);

  return (
    <div
      className="absolute inset-0"
      style={{
        contain: 'strict',
        perspective: `${staticPlan.tilt.perspective}px`,
        perspectiveOrigin: '50% 54%',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${staticPlan.tilt.rotateX}deg) rotateY(${staticPlan.tilt.rotateY}deg) rotateZ(${staticPlan.tilt.rotateZ}deg)`,
          willChange: 'transform',
        }}
      >
        {staticPlan.layers.map((layer, index) => (
          <canvas
            key={layer.id}
            ref={(node) => {
              canvasRefs.current[index] = node;
            }}
            className="absolute inset-0 h-full w-full"
            style={{
              backfaceVisibility: 'hidden',
              contain: 'strict',
              mixBlendMode: 'screen',
              opacity: layer.opacity,
              transform: `translate3d(${layer.translateX}px, ${layer.translateY}px, ${layer.translateZ}px) scale(${layer.scale})`,
              willChange: 'transform',
            }}
          />
        ))}
      </div>
    </div>
  );
});

export function ARSymbolFallbackOverlay({
  symbol,
  palmAnchor,
  videoSize,
  frameSize,
}: ARSymbolFallbackOverlayProps) {
  const target = useMemo(
    () => resolveARSymbolScreenTarget({ palmAnchor, videoSize, frameSize }),
    [frameSize, palmAnchor, videoSize]
  );
  const active = target.opacity > 0.02;

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      <div
        className="absolute transition-opacity duration-75 ease-linear"
        style={{
          left: 0,
          top: 0,
          width: target.size,
          height: target.size,
          opacity: target.opacity,
          transform: `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%) scale(${active ? 1 : 0.8})`,
          willChange: 'transform, opacity',
          contain: 'layout paint style',
        }}
      >
        <AsciiPalmSymbol active={active} symbol={symbol} size={target.size} />
      </div>
    </div>
  );
}
