import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

import {
  classifyFacing,
  classifyShape,
  countExtendedFingers,
  hasHand,
  symbolForFingerCount,
  type HandFacing,
  type HandShape,
} from './gestureClassifier.ts';
import { splitHandRoles } from './handRoles.ts';
import { computePalmAnchor, type PalmAnchor } from './palmAnchor.ts';
import type { SymbolKind } from './types';

export interface ARHandDebug {
  shape: HandShape;
  facing: HandFacing;
  extendedFingers: number;
  userRightLabel?: string;
  userLeftLabel?: string;
}

export interface ARHandState {
  symbol: SymbolKind;
  palmAnchor: PalmAnchor | null;
  userRightDetected: boolean;
  userLeftDetected: boolean;
  debug: ARHandDebug;
}

const DEFAULT_DEBUG: ARHandDebug = {
  shape: 'unknown',
  facing: 'unknown',
  extendedFingers: 0,
};

export function symbolForLeftHand(
  result: HandLandmarkerResult | null
): SymbolKind {
  const { userLeft } = splitHandRoles(result);
  const detected = hasHand(userLeft);
  return symbolForFingerCount(
    detected,
    detected ? countExtendedFingers(userLeft) : 0
  );
}

export function getARHandState(
  result: HandLandmarkerResult | null
): ARHandState {
  const roles = splitHandRoles(result);
  const userLeft = roles.userLeft;
  const userRight = roles.userRight;
  const leftDetected = hasHand(userLeft);
  const rightDetected = hasHand(userRight);
  const extendedFingers = leftDetected ? countExtendedFingers(userLeft) : 0;
  const shape = leftDetected ? classifyShape(userLeft) : 'unknown';
  const facing = leftDetected
    ? classifyFacing(userLeft, roles.userLeftLabel)
    : 'unknown';

  return {
    symbol: symbolForFingerCount(leftDetected, extendedFingers),
    palmAnchor: rightDetected ? computePalmAnchor(userRight) : null,
    userRightDetected: rightDetected,
    userLeftDetected: leftDetected,
    debug: {
      ...DEFAULT_DEBUG,
      shape,
      facing,
      extendedFingers,
      userRightLabel: roles.userRightLabel,
      userLeftLabel: roles.userLeftLabel,
    },
  };
}
