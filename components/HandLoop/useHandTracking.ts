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
  onError?: (error: unknown) => void;
}

export function useHandTracking({ videoRef, enabled, onResult, onError }: Options) {
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
    let rvfcId = 0;
    let landmarker: HandLandmarker | null = null;
    const fpsWindow: number[] = [];
    let lastFpsUpdate = 0;
    const cleanupVideo = videoRef.current;

    const recordFps = (now: number) => {
      fpsWindow.push(now);
      while (fpsWindow.length && fpsWindow[0] < now - 1000) fpsWindow.shift();
      if (now - lastFpsUpdate > 500) {
        setFps(fpsWindow.length);
        lastFpsUpdate = now;
      }
    };

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

        const video = videoRef.current;
        // Prefer requestVideoFrameCallback: fires exactly once per camera frame
        // (no wasted detections when the video hasn't advanced, no upper bound
        // tied to the display's RAF rate). Falls back to RAF + currentTime poll.
        const useRvfc =
          !!video && typeof video.requestVideoFrameCallback === 'function';

        if (useRvfc && video) {
          const onFrame: VideoFrameRequestCallback = (now) => {
            if (cancelled || !landmarker) return;
            const v = videoRef.current;
            if (v && v.readyState >= 2) {
              const result = landmarker.detectForVideo(v, now);
              onResultRef.current(result, now);
              recordFps(now);
            }
            rvfcId = video.requestVideoFrameCallback(onFrame);
          };
          rvfcId = video.requestVideoFrameCallback(onFrame);
        } else {
          let lastVideoTime = -1;
          const tick = (now: number) => {
            const v = videoRef.current;
            if (!v || !landmarker) {
              rafId = requestAnimationFrame(tick);
              return;
            }
            if (v.readyState >= 2 && v.currentTime !== lastVideoTime) {
              lastVideoTime = v.currentTime;
              const result = landmarker.detectForVideo(v, now);
              onResultRef.current(result, now);
              recordFps(now);
            }
            rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error('[useHandTracking] init failed', err);
        onError?.(err);
      }
    })();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (
        rvfcId &&
        cleanupVideo &&
        typeof cleanupVideo.cancelVideoFrameCallback === 'function'
      ) {
        cleanupVideo.cancelVideoFrameCallback(rvfcId);
      }
      landmarker?.close();
      landmarker = null;
      setReady(false);
      setFps(0);
    };
  }, [enabled, videoRef, onError]);

  return { ready, fps };
}
