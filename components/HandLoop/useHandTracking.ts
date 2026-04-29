'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onResult: (result: HandLandmarkerResult, timestampMs: number) => void;
}

export function useHandTracking({ videoRef, enabled, onResult }: Options) {
  const [ready, setReady] = useState(false);
  const [fps, setFps] = useState(0);

  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let rafId = 0;
    let landmarker: HandLandmarker | null = null;
    let lastVideoTime = -1;
    const fpsWindow: number[] = [];
    let lastFpsUpdate = 0;

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        landmarker = await HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 2,
        });
        if (cancelled) {
          landmarker.close();
          landmarker = null;
          return;
        }
        setReady(true);

        const tick = (now: number) => {
          const video = videoRef.current;
          if (!video || !landmarker) {
            rafId = requestAnimationFrame(tick);
            return;
          }
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const result = landmarker.detectForVideo(video, now);
            onResultRef.current(result, now);
            fpsWindow.push(now);
            while (fpsWindow.length && fpsWindow[0] < now - 1000) fpsWindow.shift();
            if (now - lastFpsUpdate > 500) {
              setFps(fpsWindow.length);
              lastFpsUpdate = now;
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
      } catch (err) {
        console.error('[useHandTracking] init failed', err);
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      landmarker?.close();
      landmarker = null;
      setReady(false);
      setFps(0);
    };
  }, [enabled, videoRef]);

  return { ready, fps };
}
