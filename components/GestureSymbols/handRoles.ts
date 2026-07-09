import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { HandLandmarks } from './gestureClassifier';

export interface HandRoleState {
  userRight: HandLandmarks | null;
  userLeft: HandLandmarks | null;
  userRightLabel?: string;
  userLeftLabel?: string;
}

function handednessLabel(
  result: HandLandmarkerResult,
  index: number
): string | undefined {
  return result.handedness?.[index]?.[0]?.categoryName;
}

/**
 * Split MediaPipe hands into user roles using the repo's mirrored-selfie
 * convention: MediaPipe "Right" is treated as the user's right hand.
 */
export function splitHandRoles(
  result: HandLandmarkerResult | null
): HandRoleState {
  const state: HandRoleState = {
    userRight: null,
    userLeft: null,
  };

  if (!result?.landmarks?.length) return state;

  for (let i = 0; i < result.landmarks.length; i++) {
    const hand = result.landmarks[i] as HandLandmarks | undefined;
    const label = handednessLabel(result, i);
    if (!hand) continue;

    if (label === 'Right' && !state.userRight) {
      state.userRight = hand;
      state.userRightLabel = label;
    } else if (label === 'Left' && !state.userLeft) {
      state.userLeft = hand;
      state.userLeftLabel = label;
    }
  }

  if (!state.userRight && !state.userLeft) {
    state.userRight = result.landmarks[0] as HandLandmarks;
  }

  return state;
}
