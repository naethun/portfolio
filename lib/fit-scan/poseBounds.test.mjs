import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clipBoundsToMask,
  derivePoseBounds,
  displayRectToSourceRect,
  pickNearestBound,
} from './poseBounds.mjs';

function landmark(x, y, visibility = 0.9) {
  return { x, y, z: 0, visibility };
}

function basePose() {
  const pose = Array.from({ length: 33 }, () => landmark(0.5, 0.5, 0));
  pose[11] = landmark(0.36, 0.24);
  pose[12] = landmark(0.64, 0.24);
  pose[23] = landmark(0.42, 0.52);
  pose[24] = landmark(0.58, 0.52);
  pose[25] = landmark(0.44, 0.74);
  pose[26] = landmark(0.56, 0.74);
  pose[27] = landmark(0.44, 0.91);
  pose[28] = landmark(0.56, 0.91);
  pose[29] = landmark(0.42, 0.94);
  pose[30] = landmark(0.58, 0.94);
  pose[31] = landmark(0.40, 0.96);
  pose[32] = landmark(0.60, 0.96);
  return pose;
}

describe('derivePoseBounds', () => {
  it('derives selectable garment regions from visible pose landmarks and segmentation', () => {
    const bounds = derivePoseBounds({
      landmarks: basePose(),
      segmentationMasksPresent: true,
    });

    assert.deepEqual(
      bounds.map((bound) => bound.kind),
      ['upper_body', 'lower_body', 'left_shoe', 'right_shoe'],
    );
    assert.equal(bounds[0].label, 'Upper body');
    assert.ok(bounds[0].rect.x > 0.2 && bounds[0].rect.x < 0.5);
    assert.ok(bounds[0].rect.w > 0.25);
    assert.ok(bounds[0].derivedFrom.includes('pose_landmarks'));
    assert.ok(bounds[0].derivedFrom.includes('segmentation_mask'));
  });

  it('returns no bounds when segmentation is unavailable', () => {
    const bounds = derivePoseBounds({
      landmarks: basePose(),
      segmentationMasksPresent: false,
    });

    assert.deepEqual(bounds, []);
  });

  it('does not invent bounds when required landmarks are not visible', () => {
    const pose = basePose();
    pose[11] = landmark(0.36, 0.24, 0.1);
    pose[12] = landmark(0.64, 0.24, 0.1);

    const bounds = derivePoseBounds({
      landmarks: pose,
      segmentationMasksPresent: true,
    });

    assert.equal(bounds.some((bound) => bound.kind === 'upper_body'), false);
  });
});

describe('pickNearestBound', () => {
  it('selects the nearest real bound to the index pointer', () => {
    const bounds = derivePoseBounds({
      landmarks: basePose(),
      segmentationMasksPresent: true,
    });

    const selected = pickNearestBound({ x: 0.5, y: 0.37 }, bounds);

    assert.equal(selected?.kind, 'upper_body');
  });

  it('returns null when the pointer is too far from every bound', () => {
    const bounds = derivePoseBounds({
      landmarks: basePose(),
      segmentationMasksPresent: true,
    });

    const selected = pickNearestBound({ x: 0.02, y: 0.02 }, bounds, 0.08);

    assert.equal(selected, null);
  });
});

describe('clipBoundsToMask', () => {
  it('tightens bounds to real person-mask pixels and drops empty regions', () => {
    const bounds = [
      {
        id: 'upper-body',
        kind: 'upper_body',
        label: 'Upper body',
        rect: { x: 0.1, y: 0.1, w: 0.6, h: 0.6 },
        anchor: { x: 0.4, y: 0.4 },
        confidence: 0.9,
        derivedFrom: ['pose_landmarks', 'segmentation_mask'],
      },
      {
        id: 'shoe',
        kind: 'left_shoe',
        label: 'Left shoe',
        rect: { x: 0.8, y: 0.8, w: 0.1, h: 0.1 },
        anchor: { x: 0.85, y: 0.85 },
        confidence: 0.9,
        derivedFrom: ['pose_landmarks', 'segmentation_mask'],
      },
    ];
    const mask = new Float32Array(100);
    for (let y = 3; y <= 5; y++) {
      for (let x = 3; x <= 4; x++) {
        mask[y * 10 + x] = 0.9;
      }
    }

    const clipped = clipBoundsToMask(bounds, {
      data: mask,
      width: 10,
      height: 10,
    });

    assert.equal(clipped.length, 1);
    assert.equal(clipped[0].kind, 'upper_body');
    assert.ok(clipped[0].rect.w < bounds[0].rect.w);
    assert.ok(clipped[0].rect.h < bounds[0].rect.h);
  });
});

describe('displayRectToSourceRect', () => {
  it('mirrors display-space rects back to source video coordinates', () => {
    const source = displayRectToSourceRect({ x: 0.62, y: 0.2, w: 0.2, h: 0.3 });

    assert.deepEqual(source, { x: 0.18, y: 0.2, w: 0.2, h: 0.3 });
  });
});
