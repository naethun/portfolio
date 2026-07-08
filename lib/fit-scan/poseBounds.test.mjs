import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clipBoundsToMask,
  deriveMaskBlobBounds,
  deriveObjectBounds,
  derivePoseBounds,
  displayRectToSourceRect,
  pickNearestBound,
} from './poseBounds.mjs';

function landmark(x, y, visibility = 0.9) {
  return { x, y, z: 0, visibility };
}

function basePose() {
  const pose = Array.from({ length: 33 }, () => landmark(0.5, 0.5, 0));
  pose[0] = landmark(0.50, 0.12);
  pose[2] = landmark(0.47, 0.11);
  pose[5] = landmark(0.53, 0.11);
  pose[7] = landmark(0.43, 0.13);
  pose[8] = landmark(0.57, 0.13);
  pose[9] = landmark(0.47, 0.17);
  pose[10] = landmark(0.53, 0.17);
  pose[11] = landmark(0.36, 0.24);
  pose[12] = landmark(0.64, 0.24);
  pose[13] = landmark(0.30, 0.42);
  pose[14] = landmark(0.70, 0.42);
  pose[15] = landmark(0.25, 0.58);
  pose[16] = landmark(0.75, 0.58);
  pose[17] = landmark(0.23, 0.60);
  pose[18] = landmark(0.77, 0.60);
  pose[19] = landmark(0.24, 0.62);
  pose[20] = landmark(0.76, 0.62);
  pose[21] = landmark(0.26, 0.61);
  pose[22] = landmark(0.74, 0.61);
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
      [
        'head',
        'upper_body',
        'lower_body',
        'left_arm',
        'right_arm',
        'left_hand',
        'right_hand',
        'left_shoe',
        'right_shoe',
      ],
    );
    assert.equal(bounds[0].label, 'Head / face');
    assert.equal(bounds[1].label, 'Shirt / upper body');
    assert.ok(bounds[1].rect.x > 0.2 && bounds[1].rect.x < 0.5);
    assert.ok(bounds[1].rect.w > 0.25);
    assert.ok(bounds[1].derivedFrom.includes('pose_landmarks'));
    assert.ok(bounds[1].derivedFrom.includes('segmentation_mask'));
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

  it('prefers the smallest overlapping blob under the pointer', () => {
    const selected = pickNearestBound(
      { x: 0.5, y: 0.5 },
      [
        {
          id: 'large',
          kind: 'mask_blob',
          label: 'Body blob',
          rect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
          anchor: { x: 0.5, y: 0.5 },
          confidence: 0.9,
          derivedFrom: ['segmentation_mask'],
        },
        {
          id: 'small',
          kind: 'upper_body',
          label: 'Shirt / upper body',
          rect: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
          anchor: { x: 0.5, y: 0.5 },
          confidence: 0.9,
          derivedFrom: ['pose_landmarks', 'segmentation_mask'],
        },
      ],
    );

    assert.equal(selected?.id, 'small');
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

describe('deriveMaskBlobBounds', () => {
  it('turns connected segmentation components into blob bounds', () => {
    const mask = new Float32Array(100);
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        mask[y * 10 + x] = 0.9;
      }
    }
    for (let y = 7; y <= 8; y++) {
      for (let x = 7; x <= 8; x++) {
        mask[y * 10 + x] = 0.9;
      }
    }

    const blobs = deriveMaskBlobBounds({
      data: mask,
      width: 10,
      height: 10,
      threshold: 0.2,
      minAreaRatio: 0,
    });

    assert.equal(blobs.length, 2);
    assert.equal(blobs[0].kind, 'mask_blob');
    assert.ok(blobs[0].rect.w > 0);
    assert.ok(blobs[0].derivedFrom.includes('segmentation_mask'));
  });
});

describe('deriveObjectBounds', () => {
  it('mirrors detector pixel boxes into display-space object bounds', () => {
    const bounds = deriveObjectBounds({
      detections: [
        {
          categories: [{ score: 0.8, categoryName: 'cell phone' }],
          boundingBox: { originX: 10, originY: 20, width: 30, height: 40 },
        },
      ],
      videoWidth: 100,
      videoHeight: 100,
      mirrored: true,
    });

    assert.equal(bounds.length, 1);
    assert.equal(bounds[0].kind, 'object_cell_phone');
    assert.equal(bounds[0].label, 'Cell Phone');
    assert.deepEqual(bounds[0].rect, { x: 0.6, y: 0.2, w: 0.3, h: 0.4 });
  });

  it('skips low-confidence detections and duplicate person boxes by default', () => {
    const bounds = deriveObjectBounds({
      detections: [
        {
          categories: [{ score: 0.9, categoryName: 'person' }],
          boundingBox: { originX: 0, originY: 0, width: 100, height: 100 },
        },
        {
          categories: [{ score: 0.1, categoryName: 'cup' }],
          boundingBox: { originX: 0, originY: 0, width: 20, height: 20 },
        },
      ],
      videoWidth: 100,
      videoHeight: 100,
    });

    assert.deepEqual(bounds, []);
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
