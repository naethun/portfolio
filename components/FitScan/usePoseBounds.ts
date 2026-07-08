'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import type { FitScanBound } from './types';
import {
  clipBoundsToMask,
  derivePoseBounds,
} from '@/lib/fit-scan/poseBounds.mjs';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type PoseBoundsStatus =
  | 'idle'
  | 'loading'
  | 'tracking'
  | 'no_pose'
  | 'missing_segmentation'
  | 'no_bounds'
  | 'model_error';

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}

async function createPoseLandmarker(
  fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: 'GPU' | 'CPU',
) {
  return PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputSegmentationMasks: true,
  });
}

function boundsFromResult(result: PoseLandmarkerResult): {
  bounds: FitScanBound[];
  status: PoseBoundsStatus;
} {
  const landmarks = result.landmarks[0];
  if (!landmarks) return { bounds: [], status: 'no_pose' };

  const mask = result.segmentationMasks?.[0];
  if (!mask) return { bounds: [], status: 'missing_segmentation' };

  const candidates = derivePoseBounds({
    landmarks,
    segmentationMasksPresent: true,
  }) as FitScanBound[];
  if (candidates.length === 0) return { bounds: [], status: 'no_bounds' };

  let clipped: FitScanBound[] = [];
  try {
    clipped = clipBoundsToMask(candidates, {
      data: mask.getAsFloat32Array(),
      width: mask.width,
      height: mask.height,
      mirrored: true,
    }) as FitScanBound[];
  } catch {
    return { bounds: [], status: 'missing_segmentation' };
  }

  if (clipped.length === 0) return { bounds: [], status: 'no_bounds' };
  return { bounds: clipped, status: 'tracking' };
}

export function usePoseBounds({ videoRef, enabled }: Options) {
  const [ready, setReady] = useState(false);
  const [bounds, setBounds] = useState<FitScanBound[]>([]);
  const [status, setStatus] = useState<PoseBoundsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastDetectRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setBounds([]);
      setStatus('idle');
      setError(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let rvfcId = 0;
    let landmarker: PoseLandmarker | null = null;
    const cleanupVideo = videoRef.current;
    setStatus('loading');
    setError(null);

    const detect = (now: number) => {
      if (cancelled || !landmarker) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      if (now - lastDetectRef.current < 120) return;
      lastDetectRef.current = now;

      let result: PoseLandmarkerResult | null = null;
      try {
        result = landmarker.detectForVideo(video, now);
        const next = boundsFromResult(result);
        setBounds(next.bounds);
        setStatus(next.status);
      } catch (err) {
        console.error('[usePoseBounds] detect failed', err);
        setBounds([]);
        setStatus('model_error');
        setError(err instanceof Error ? err.message : 'Pose detection failed.');
      } finally {
        result?.close();
      }
    };

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        try {
          landmarker = await createPoseLandmarker(fileset, 'GPU');
        } catch {
          landmarker = await createPoseLandmarker(fileset, 'CPU');
        }
        if (cancelled) {
          landmarker.close();
          landmarker = null;
          return;
        }
        setReady(true);

        const video = videoRef.current;
        const useRvfc =
          !!video && typeof video.requestVideoFrameCallback === 'function';

        if (useRvfc && video) {
          const onFrame: VideoFrameRequestCallback = (now) => {
            detect(now);
            if (!cancelled) rvfcId = video.requestVideoFrameCallback(onFrame);
          };
          rvfcId = video.requestVideoFrameCallback(onFrame);
        } else {
          const tick = (now: number) => {
            detect(now);
            if (!cancelled) rafId = requestAnimationFrame(tick);
          };
          rafId = requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error('[usePoseBounds] init failed', err);
        setReady(false);
        setBounds([]);
        setStatus('model_error');
        setError(
          err instanceof Error
            ? err.message
            : 'MediaPipe pose model could not be loaded.',
        );
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
      setBounds([]);
    };
  }, [enabled, videoRef]);

  return { ready, bounds, status, error };
}
