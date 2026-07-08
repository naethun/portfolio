'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  FilesetResolver,
  ObjectDetector,
  PoseLandmarker,
  type ObjectDetectorResult,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision';

import type { FitScanBound } from './types';
import {
  clipBoundsToMask,
  deriveMaskBlobBounds,
  deriveObjectBounds,
  derivePoseBounds,
} from '@/lib/fit-scan/poseBounds.mjs';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const POSE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const OBJECT_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

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

async function createObjectDetector(
  fileset: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>,
  delegate: 'GPU' | 'CPU',
) {
  return ObjectDetector.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: OBJECT_MODEL_URL, delegate },
    runningMode: 'VIDEO',
    maxResults: 12,
    scoreThreshold: 0.28,
  });
}

function boundsFromPoseResult(result: PoseLandmarkerResult): {
  bounds: FitScanBound[];
  status: PoseBoundsStatus;
} {
  const landmarks = result.landmarks[0];
  if (!landmarks) return { bounds: [], status: 'no_pose' };

  const mask = result.segmentationMasks?.[0];
  if (!mask) return { bounds: [], status: 'missing_segmentation' };

  let maskData: Float32Array;
  try {
    maskData = mask.getAsFloat32Array();
  } catch {
    return { bounds: [], status: 'missing_segmentation' };
  }

  const maskBlobs = deriveMaskBlobBounds({
    data: maskData,
    width: mask.width,
    height: mask.height,
    mirrored: true,
  }) as FitScanBound[];
  const candidates = derivePoseBounds({
    landmarks,
    segmentationMasksPresent: true,
  }) as FitScanBound[];

  let clipped: FitScanBound[] = [];
  try {
    clipped = clipBoundsToMask(candidates, {
      data: maskData,
      width: mask.width,
      height: mask.height,
      mirrored: true,
    }) as FitScanBound[];
  } catch {
    return { bounds: [], status: 'missing_segmentation' };
  }

  const bounds = [...maskBlobs, ...clipped];
  if (bounds.length === 0) return { bounds: [], status: 'no_bounds' };
  return { bounds, status: 'tracking' };
}

function boundsFromObjectResult(
  result: ObjectDetectorResult | null,
  video: HTMLVideoElement,
  includePerson: boolean,
): FitScanBound[] {
  if (!result) return [];
  return deriveObjectBounds({
    detections: result.detections,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    mirrored: true,
    includePerson,
  }) as FitScanBound[];
}

export function usePoseBounds({ videoRef, enabled }: Options) {
  const [ready, setReady] = useState(false);
  const [bounds, setBounds] = useState<FitScanBound[]>([]);
  const [status, setStatus] = useState<PoseBoundsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const lastPoseDetectRef = useRef(0);
  const lastObjectDetectRef = useRef(0);

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
    let objectDetector: ObjectDetector | null = null;
    let latestPose = { bounds: [] as FitScanBound[], status: 'loading' as PoseBoundsStatus };
    let latestObjects: FitScanBound[] = [];
    const cleanupVideo = videoRef.current;
    setStatus('loading');
    setError(null);

    const detect = (now: number) => {
      if (cancelled || (!landmarker && !objectDetector)) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      const shouldRunPose = !!landmarker && now - lastPoseDetectRef.current >= 120;
      const shouldRunObject =
        !!objectDetector && now - lastObjectDetectRef.current >= 360;
      if (!shouldRunPose && !shouldRunObject) return;

      let result: PoseLandmarkerResult | null = null;
      if (shouldRunPose && landmarker) {
        lastPoseDetectRef.current = now;
        try {
          result = landmarker.detectForVideo(video, now);
          latestPose = boundsFromPoseResult(result);
        } catch (err) {
          console.error('[usePoseBounds] pose detect failed', err);
          latestPose = { bounds: [], status: 'model_error' };
          setError(err instanceof Error ? err.message : 'Pose detection failed.');
        } finally {
          result?.close();
        }
      }

      if (shouldRunObject && objectDetector) {
        lastObjectDetectRef.current = now;
        try {
          const objectResult = objectDetector.detectForVideo(video, now);
          latestObjects = boundsFromObjectResult(
            objectResult,
            video,
            latestPose.bounds.length === 0,
          );
        } catch (err) {
          console.warn('[usePoseBounds] object detect failed', err);
          latestObjects = [];
          objectDetector.close();
          objectDetector = null;
        }
      }

      const nextBounds = [...latestPose.bounds, ...latestObjects];
      setBounds(nextBounds);
      setStatus(nextBounds.length > 0 ? 'tracking' : latestPose.status);
    };

    (async () => {
      try {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        if (cancelled) return;
        try {
          landmarker = await createPoseLandmarker(fileset, 'GPU');
        } catch {
          try {
            landmarker = await createPoseLandmarker(fileset, 'CPU');
          } catch (err) {
            console.warn('[usePoseBounds] pose detector unavailable', err);
            landmarker = null;
          }
        }
        try {
          objectDetector = await createObjectDetector(fileset, 'GPU');
        } catch {
          try {
            objectDetector = await createObjectDetector(fileset, 'CPU');
          } catch (err) {
            console.warn('[usePoseBounds] object detector unavailable', err);
            objectDetector = null;
          }
        }
        if (!landmarker && !objectDetector) {
          throw new Error('MediaPipe fit-scan models could not be loaded.');
        }
        if (cancelled) {
          landmarker?.close();
          landmarker = null;
          objectDetector?.close();
          objectDetector = null;
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
      objectDetector?.close();
      objectDetector = null;
      setReady(false);
      setBounds([]);
    };
  }, [enabled, videoRef]);

  return { ready, bounds, status, error };
}
