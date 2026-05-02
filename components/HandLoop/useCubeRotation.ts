'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import type { HandLandmarks } from './usePinch';

// Drives cube {rx, ry, rz, zoom} from the picture-frame gesture and/or
// single-hand pinch.
// Priority each frame:
//   1. Primary pinch (in cube): rotate from primary wrist motion + zoom in.
//   2. Frame held: rotate from two-hand midpoint + wrist-line angle.
//   3. Idle: coast (decay velocity), zoom eases back to 1.
//   4. Outside cube mode: ambient slow yaw drift after a short delay.

// TUNE: hand-x delta (normalized) → degrees of yaw per frame.
const GAIN_Y = 360;
// TUNE: hand-y delta (normalized) → degrees of pitch per frame (negative so
// hands moving up tilts the cube to look up).
const GAIN_X = -360;
// TUNE: post-release angular-velocity decay window in ms.
const COAST_DECAY_MS = 600;
// TUNE: time mode must stay non-cube before ambient drift kicks in.
const AMBIENT_DELAY_MS = 800;
// TUNE: ambient yaw rate, deg/sec.
const AMBIENT_RY_DEG_PER_S = 6;
// TUNE: ambient ease toward 0 for rx/rz (per-frame lerp factor).
const AMBIENT_LERP = 0.04;
// TUNE: zoom multiplier while pinch-grabbing the cube.
const ZOOM_IN = 1.4;
// TUNE: per-frame ease factor for zoom transitions.
const ZOOM_LERP = 0.18;
// TUNE: minimum delta (deg or scale) before re-publishing — caps re-render rate.
const PUBLISH_EPS = 0.05;
const ZOOM_PUBLISH_EPS = 0.005;

interface FrameAnchor {
  angleStart: number;
}

function midpoint(p: HandLandmarks, s: HandLandmarks): {
  mx: number;
  my: number;
  angle: number;
} {
  const mx = (p[0].x + s[0].x) / 2;
  const my = (p[0].y + s[0].y) / 2;
  const angle = Math.atan2(p[0].y - s[0].y, p[0].x - s[0].x);
  return { mx, my, angle };
}

export function useCubeRotation(
  primaryRef: RefObject<HandLandmarks | null>,
  secondaryRef: RefObject<HandLandmarks | null>,
  frameActive: boolean,
  modeIsCube: boolean,
  primaryPinch: boolean
): { rx: number; ry: number; rz: number; zoom: number } {
  const [rot, setRot] = useState({ rx: 0, ry: 0, rz: 0, zoom: 1 });

  const rxRef = useRef(0);
  const ryRef = useRef(0);
  const rzRef = useRef(0);
  const zoomRef = useRef(1);
  // Velocity (deg / frame) used for coast.
  const vxRef = useRef(0);
  const vyRef = useRef(0);

  // Tracks the active driver so we can re-anchor on driver switches without
  // jumping. 'idle' means no driver (coast).
  const driverRef = useRef<'idle' | 'pinch' | 'frame'>('idle');
  const frameAnchorRef = useRef<FrameAnchor | null>(null);
  // Last-frame hand position used by the active driver for delta integration.
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const nonCubeMsRef = useRef(0);
  const lastTRef = useRef(0);
  const lastPubRef = useRef({ rx: 0, ry: 0, rz: 0, zoom: 1 });

  // Mirror props via refs so the RAF closure always sees current values.
  const frameRef = useRef(frameActive);
  const cubeRef = useRef(modeIsCube);
  const pinchRef = useRef(primaryPinch);
  frameRef.current = frameActive;
  cubeRef.current = modeIsCube;
  pinchRef.current = primaryPinch;

  useEffect(() => {
    let rafId = 0;
    lastTRef.current = performance.now();

    const tick = (t: number) => {
      const dtMs = Math.max(0, t - lastTRef.current);
      lastTRef.current = t;
      const dt = dtMs / 1000;

      const inCube = cubeRef.current;
      const frame = frameRef.current;
      const pinch = pinchRef.current;
      const p = primaryRef.current;
      const s = secondaryRef.current;
      const haveP = !!(p && p.length >= 21);
      const haveBoth = !!(haveP && s && s.length >= 21);

      // Pinch wins over frame while in cube. Pinch is meaningless outside cube.
      const wantPinch = inCube && pinch && haveP;
      const wantFrame = !wantPinch && frame && haveBoth;
      const driver: 'idle' | 'pinch' | 'frame' = wantPinch
        ? 'pinch'
        : wantFrame
          ? 'frame'
          : 'idle';

      // On driver change, reset anchors so we don't jump.
      if (driver !== driverRef.current) {
        driverRef.current = driver;
        frameAnchorRef.current = null;
        if (driver === 'pinch' && p) {
          lastXRef.current = p[0].x;
          lastYRef.current = p[0].y;
        } else if (driver === 'frame' && p && s) {
          const m = midpoint(p, s);
          lastXRef.current = m.mx;
          lastYRef.current = m.my;
          frameAnchorRef.current = { angleStart: m.angle };
        }
      }

      let rx = rxRef.current;
      let ry = ryRef.current;
      let rz = rzRef.current;
      let zoom = zoomRef.current;

      if (driver === 'pinch' && p) {
        const x = p[0].x;
        const y = p[0].y;
        const dRy = (x - lastXRef.current) * GAIN_Y;
        const dRx = (y - lastYRef.current) * GAIN_X;
        ry += dRy;
        rx += dRx;
        // Pinch doesn't drive roll — leave rz where it was.
        vxRef.current = dRx;
        vyRef.current = dRy;
        lastXRef.current = x;
        lastYRef.current = y;
        nonCubeMsRef.current = 0;
        zoom += (ZOOM_IN - zoom) * ZOOM_LERP;
      } else if (driver === 'frame' && p && s) {
        const { mx, my, angle } = midpoint(p, s);
        const anchor = frameAnchorRef.current!;
        const dRy = (mx - lastXRef.current) * GAIN_Y;
        const dRx = (my - lastYRef.current) * GAIN_X;
        ry += dRy;
        rx += dRx;
        rz = (angle - anchor.angleStart) * (180 / Math.PI);
        vxRef.current = dRx;
        vyRef.current = dRy;
        lastXRef.current = mx;
        lastYRef.current = my;
        nonCubeMsRef.current = 0;
        zoom += (1 - zoom) * ZOOM_LERP;
      } else {
        // Coast: decay velocity exponentially, ease zoom toward 1.
        const decay = Math.exp(-dtMs / (COAST_DECAY_MS / 3));
        vxRef.current *= decay;
        vyRef.current *= decay;
        rx += vxRef.current;
        ry += vyRef.current;
        zoom += (1 - zoom) * ZOOM_LERP;

        if (!inCube) {
          nonCubeMsRef.current += dtMs;
          if (nonCubeMsRef.current >= AMBIENT_DELAY_MS) {
            ry += AMBIENT_RY_DEG_PER_S * dt;
            rx += (0 - rx) * AMBIENT_LERP;
            rz += (0 - rz) * AMBIENT_LERP;
          }
        } else {
          nonCubeMsRef.current = 0;
        }
      }

      rxRef.current = rx;
      ryRef.current = ry;
      rzRef.current = rz;
      zoomRef.current = zoom;

      const last = lastPubRef.current;
      if (
        Math.abs(rx - last.rx) > PUBLISH_EPS ||
        Math.abs(ry - last.ry) > PUBLISH_EPS ||
        Math.abs(rz - last.rz) > PUBLISH_EPS ||
        Math.abs(zoom - last.zoom) > ZOOM_PUBLISH_EPS
      ) {
        lastPubRef.current = { rx, ry, rz, zoom };
        setRot({ rx, ry, rz, zoom });
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [primaryRef, secondaryRef]);

  return rot;
}
