import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FINGERTIP_INDICES,
  assignHandPair,
  buildFacetBuffers,
  coverMetrics,
  dampMotionEnergy,
  expireStaleMotionTarget,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  motionAnchorsForCurrentHands,
  motionTargetForSpeed,
  normalizedAnchorSpeed,
  resampleRailToAnchors,
  updateFacetedWindowState,
  updateMotionSampleLifecycle,
} from './facetedWindowGeometry.mjs';

function assertPointClose(actual, expected, epsilon = 1e-9) {
  for (const key of ['x', 'y', 'z', 'u', 'v']) {
    assert.ok(
      Math.abs(actual[key] - expected[key]) < epsilon,
      `${key}: expected ${expected[key]}, received ${actual[key]}`,
    );
  }
}

function handFixture({ x = 0.5, pinch = false, z = 0 } = {}) {
  const points = Array.from({ length: 21 }, () => ({ x, y: 0.6, z }));
  points[0] = { x, y: 0.82, z: 0 };
  points[9] = { x, y: 0.52, z: 0 };
  const tips = [
    { x: x - 0.15, y: 0.55, z: -0.01 },
    { x: x - 0.08, y: 0.32, z: -0.04 },
    { x, y: 0.27, z: -0.08 },
    { x: x + 0.08, y: 0.32, z: -0.05 },
    { x: x + 0.14, y: 0.42, z: -0.02 },
  ];
  FINGERTIP_INDICES.forEach((index, i) => { points[index] = tips[i]; });
  if (pinch) points[4] = { ...points[8], x: points[8].x - 0.01 };
  return points;
}

function meshHand({ x, label = '', pinch = false }) {
  return handMeshInputFromLandmarks(
    handFixture({ x, pinch }),
    label ? [{ categoryName: label, score: 0.99 }] : [],
    { mirrored: true },
  );
}

function railSpread(rail) {
  return Math.hypot(
    rail[0].x - rail[4].x,
    rail[0].y - rail[4].y,
    rail[0].z - rail[4].z,
  );
}

function railSpread2d(rail) {
  return Math.hypot(
    rail[0].x - rail[4].x,
    rail[0].y - rail[4].y,
  );
}

function firstTriangleArea(positions) {
  const ab = [
    positions[3] - positions[0],
    positions[4] - positions[1],
    positions[5] - positions[2],
  ];
  const ac = [
    positions[6] - positions[0],
    positions[7] - positions[1],
    positions[8] - positions[2],
  ];
  return Math.hypot(
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ) * 0.5;
}

function railFixture({ x, z = 0, u = x }) {
  return Array.from({ length: 5 }, (_, index) => ({
    x,
    y: 0.25 + index * 0.1,
    z,
    u: u + index * 0.01,
    v: 0.75 - index * 0.1,
  }));
}

function bufferState(aRail, bRail) {
  return {
    ...initialFacetedWindowState(),
    armed: true,
    opacity: 1,
    pair: {
      a: { rail: aRail },
      b: { rail: bRail },
    },
  };
}

function screenPointFromWorld(position, metrics, camera) {
  const z = position[2];
  const distance = camera.z - z;
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance;
  const halfWidth = halfHeight * camera.aspect;
  return {
    x: ((position[0] / halfWidth + 1) / 2) * metrics.stageWidth,
    y: ((1 - position[1] / halfHeight) / 2) * metrics.stageHeight,
  };
}

describe('handMeshInputFromLandmarks', () => {
  it('extracts five anatomical tips and preserves source UVs while mirroring display x', () => {
    const input = handMeshInputFromLandmarks(
      handFixture(),
      [{ categoryName: 'Left', score: 0.98 }],
      { mirrored: true },
    );
    assert.ok(input);
    assert.equal(input.rail.length, 5);
    assert.deepEqual(FINGERTIP_INDICES, [4, 8, 12, 16, 20]);
    assert.equal(Number(input.rail[1].x.toFixed(2)), 0.58);
    assert.equal(Number(input.rail[1].u.toFixed(2)), 0.42);
  });

  it('drives collapse weight near one for a tight thumb-index pinch', () => {
    const input = handMeshInputFromLandmarks(handFixture({ pinch: true }), [], { mirrored: true });
    assert.ok(input);
    assert.ok(input.collapse > 0.95);
  });
});

describe('faceted window state', () => {
  it('arms only when two hands are tightly pinched', () => {
    let state = initialFacetedWindowState();
    state = updateFacetedWindowState(
      state,
      [
        meshHand({ x: 0.3, label: 'Left', pinch: true }),
        meshHand({ x: 0.7, label: 'Right' }),
      ],
      0,
    );
    assert.equal(state.armed, false);
    assert.equal(state.pair, null);

    state = updateFacetedWindowState(
      state,
      [
        meshHand({ x: 0.3, label: 'Left', pinch: true }),
        meshHand({ x: 0.7, label: 'Right', pinch: true }),
      ],
      16,
    );
    assert.equal(state.armed, true);
    assert.equal(state.opacity, 1);
    assert.ok(state.pair);
    assert.ok(railSpread(state.pair.a.rail) > 0.005);
    assert.ok(railSpread(state.pair.b.rail) > 0.005);
    const pinchedFacets = buildFacetBuffers(
      state,
      coverMetrics(540, 960, 1920, 1080),
      { fov: 50, z: 3, depthScale: 0.32, aspect: 540 / 960 },
    );
    assert.equal(pinchedFacets.length, 3);
    const pinchedAreas = pinchedFacets.map((facet) => firstTriangleArea(facet.positions));
    assert.ok(pinchedAreas.filter((area) => area > 1e-8).length >= 3);
    assert.ok(pinchedAreas.reduce((total, area) => total + area, 0) > 0.001);
  });

  it('keeps anatomical roles stable when detector array order reverses', () => {
    const left = meshHand({ x: 0.3, label: 'Left', pinch: true });
    const right = meshHand({ x: 0.7, label: 'Right', pinch: true });
    const first = assignHandPair([right, left], null);
    assert.ok(first);
    assert.equal(first.a.label, 'Left');
    assert.equal(first.b.label, 'Right');

    const reversed = assignHandPair([left, right], first);
    assert.ok(reversed);
    assert.equal(reversed.a.label, 'Left');
    assert.equal(reversed.b.label, 'Right');

    const low = meshHand({ x: 0.8, pinch: true });
    const high = meshHand({ x: 0.2, pinch: true });
    const unlabeled = assignHandPair([high, low], null);
    assert.ok(unlabeled);
    const continued = assignHandPair([
      meshHand({ x: 0.22, pinch: true }),
      meshHand({ x: 0.78, pinch: true }),
    ], unlabeled);
    assert.ok(continued);
    assert.ok(continued.a.center.x < continued.b.center.x);
  });

  it('collapses one rail while leaving an open rail spread', () => {
    let state = updateFacetedWindowState(
      initialFacetedWindowState(),
      [
        meshHand({ x: 0.3, label: 'Left', pinch: true }),
        meshHand({ x: 0.7, label: 'Right', pinch: true }),
      ],
      0,
    );
    state = updateFacetedWindowState(
      state,
      [
        meshHand({ x: 0.3, label: 'Left', pinch: true }),
        meshHand({ x: 0.7, label: 'Right' }),
      ],
      750,
    );

    assert.ok(railSpread(state.pair.a.rail) > 0.005);
    assert.ok(railSpread(state.pair.a.rail) < 0.05);
    assert.ok(railSpread(state.pair.b.rail) > 0.25);
  });

  it('expands a fully open fan by 20% without changing its camera UVs', () => {
    const pinchedHands = [
      meshHand({ x: 0.3, label: 'Left', pinch: true }),
      meshHand({ x: 0.7, label: 'Right', pinch: true }),
    ];
    const openHands = [
      meshHand({ x: 0.3, label: 'Left', pinch: true }),
      meshHand({ x: 0.7, label: 'Right' }),
    ];
    const baselineArmed = updateFacetedWindowState(
      initialFacetedWindowState(),
      pinchedHands,
      0,
      { dampingLambda: 100, openFanBoost: 0 },
    );
    const boostedArmed = updateFacetedWindowState(
      initialFacetedWindowState(),
      pinchedHands,
      0,
      { dampingLambda: 100, openFanBoost: 0.2 },
    );
    const baselineOpen = updateFacetedWindowState(
      baselineArmed,
      openHands,
      1000,
      { dampingLambda: 100, openFanBoost: 0 },
    );
    const boostedOpen = updateFacetedWindowState(
      boostedArmed,
      openHands,
      1000,
      { dampingLambda: 100, openFanBoost: 0.2 },
    );

    const spreadRatio = railSpread2d(boostedOpen.pair.b.rail)
      / railSpread2d(baselineOpen.pair.b.rail);
    assert.ok(Math.abs(spreadRatio - 1.2) < 1e-9);
    assert.equal(boostedOpen.pair.b.rail[4].u, baselineOpen.pair.b.rail[4].u);
    assert.equal(boostedOpen.pair.b.rail[4].v, baselineOpen.pair.b.rail[4].v);
    assert.ok(
      Math.abs(
        railSpread2d(boostedOpen.pair.a.rail)
          - railSpread2d(baselineOpen.pair.a.rail),
      ) < 1e-9,
    );
  });

  it('damps equivalent elapsed time consistently across frame rates', () => {
    const startHands = [
      meshHand({ x: 0.3, label: 'Left', pinch: true }),
      meshHand({ x: 0.7, label: 'Right', pinch: true }),
    ];
    const targetHands = [
      meshHand({ x: 0.2, label: 'Left' }),
      meshHand({ x: 0.8, label: 'Right' }),
    ];
    const start = updateFacetedWindowState(
      initialFacetedWindowState(),
      startHands,
      0,
      { dampingLambda: 6 },
    );
    const oneFrame = updateFacetedWindowState(
      start,
      targetHands,
      1000,
      { dampingLambda: 6 },
    );
    let tenFrames = start;
    for (let timestampMs = 100; timestampMs <= 1000; timestampMs += 100) {
      tenFrames = updateFacetedWindowState(
        tenFrames,
        targetHands,
        timestampMs,
        { dampingLambda: 6 },
      );
    }

    assert.ok(Math.abs(oneFrame.pair.a.rail[0].x - tenFrames.pair.a.rail[0].x) < 1e-10);
    assert.ok(Math.abs(oneFrame.pair.a.rail[0].u - tenFrames.pair.a.rail[0].u) < 1e-10);
    assert.ok(Math.abs(oneFrame.pair.a.collapse - tenFrames.pair.a.collapse) < 1e-10);
  });

  it('holds briefly, fades, then resets after sustained hand loss', () => {
    const options = { holdMs: 150, fadeMs: 450 };
    const armed = updateFacetedWindowState(
      initialFacetedWindowState(),
      [
        meshHand({ x: 0.3, label: 'Left', pinch: true }),
        meshHand({ x: 0.7, label: 'Right', pinch: true }),
      ],
      0,
      options,
    );
    const heldAt16 = updateFacetedWindowState(armed, [], 16, options);
    const heldAt150 = updateFacetedWindowState(heldAt16, [], 150, options);
    const fadedAt300 = updateFacetedWindowState(heldAt150, [], 300, options);
    const resetAt750 = updateFacetedWindowState(fadedAt300, [], 750, options);

    assert.equal(heldAt16.opacity, 1);
    assert.deepEqual(heldAt150.pair, armed.pair);
    assert.equal(heldAt150.opacity, 1);
    assert.ok(fadedAt300.opacity > 0 && fadedAt300.opacity < 1);
    assert.equal(resetAt750.armed, false);
    assert.equal(resetAt750.pair, null);
    assert.equal(resetAt750.opacity, 0);
  });
});

describe('three-facet rail resampling', () => {
  const metrics = {
    stageWidth: 300,
    stageHeight: 300,
    displayWidth: 300,
    displayHeight: 300,
    offsetX: 0,
    offsetY: 0,
  };

  it('preserves endpoints and samples interior anchors by display-space length', () => {
    const rail = [
      { x: 0, y: 0, z: 0, u: 0, v: 1 },
      { x: 0.1, y: 0, z: 1, u: 0.1, v: 0.9 },
      { x: 0.4, y: 0, z: 2, u: 0.4, v: 0.6 },
      { x: 0.9, y: 0, z: 3, u: 0.9, v: 0.1 },
      { x: 1, y: 0, z: 4, u: 1, v: 0 },
    ];

    const anchors = resampleRailToAnchors(rail, metrics);

    assert.equal(anchors.length, 4);
    assert.deepEqual(anchors[0], rail[0]);
    assert.deepEqual(anchors[3], rail[4]);
    assertPointClose(anchors[1], {
      x: 1 / 3,
      y: 0,
      z: 1 + (7 / 9),
      u: 1 / 3,
      v: 2 / 3,
    });
    assertPointClose(anchors[2], {
      x: 2 / 3,
      y: 0,
      z: 2 + (8 / 15),
      u: 2 / 3,
      v: 1 / 3,
    });
  });

  it('uses finite index interpolation for a zero-length display rail', () => {
    const rail = Array.from({ length: 5 }, (_, index) => ({
      x: 0.5,
      y: 0.5,
      z: index,
      u: index * 0.1,
      v: 1 - index * 0.1,
    }));

    const anchors = resampleRailToAnchors(rail, metrics);

    assert.equal(anchors.length, 4);
    assertPointClose(anchors[1], {
      x: 0.5,
      y: 0.5,
      z: 4 / 3,
      u: 2 / 15,
      v: 13 / 15,
    });
    assertPointClose(anchors[2], {
      x: 0.5,
      y: 0.5,
      z: 8 / 3,
      u: 4 / 15,
      v: 11 / 15,
    });
  });
});

describe('motion energy', () => {
  const metrics = {
    stageWidth: 300,
    stageHeight: 400,
    displayWidth: 600,
    displayHeight: 400,
    offsetX: -150,
    offsetY: 0,
  };

  function motionAnchors(x) {
    return Array.from({ length: 8 }, (_, index) => ({
      x,
      y: index / 10,
      z: 0,
      u: x,
      v: 1 - index / 10,
    }));
  }

  it('starts the first valid changed motion sample at zero', () => {
    assert.equal(
      typeof updateMotionSampleLifecycle,
      'function',
    );
    const anchors = motionAnchors(0.2);

    const next = updateMotionSampleLifecycle(
      { target: 0, anchors: null, timestampMs: null },
      anchors,
      metrics,
      1_000,
      true,
      false,
    );

    assert.equal(next.target, 0);
    assert.equal(next.anchors, anchors);
    assert.equal(next.timestampMs, 1_000);
  });

  it('derives the next changed sample target from normalized speed', () => {
    const previousAnchors = motionAnchors(0.2);
    const currentAnchors = motionAnchors(0.21);
    const expectedSpeed = normalizedAnchorSpeed(
      previousAnchors,
      currentAnchors,
      metrics,
      0.1,
    );

    const next = updateMotionSampleLifecycle(
      { target: 0, anchors: previousAnchors, timestampMs: 1_000 },
      currentAnchors,
      metrics,
      1_100,
      true,
      false,
    );

    assert.equal(next.target, motionTargetForSpeed(expectedSpeed));
    assert.ok(next.target > 0 && next.target < 1);
    assert.equal(next.anchors, currentAnchors);
    assert.equal(next.timestampMs, 1_100);
  });

  it('rebases instead of deriving velocity when dimensions and result change together', () => {
    const rail = [
      { x: 0.1, y: 0.1, z: 0, u: 0.1, v: 0.9 },
      { x: 0.12, y: 0.5, z: 0, u: 0.12, v: 0.5 },
      { x: 0.5, y: 0.52, z: 0, u: 0.5, v: 0.48 },
      { x: 0.52, y: 0.8, z: 0, u: 0.52, v: 0.2 },
      { x: 0.9, y: 0.82, z: 0, u: 0.9, v: 0.18 },
    ];
    const previousMetrics = {
      stageWidth: 400,
      stageHeight: 300,
      displayWidth: 400,
      displayHeight: 300,
    };
    const nextMetrics = {
      stageWidth: 1_600,
      stageHeight: 900,
      displayWidth: 1_600,
      displayHeight: 900,
    };
    const previousRail = resampleRailToAnchors(rail, previousMetrics);
    const currentRail = resampleRailToAnchors(rail, nextMetrics);
    const previousAnchors = [...previousRail, ...previousRail];
    const currentAnchors = [...currentRail, ...currentRail];
    const falseResizeSpeed = normalizedAnchorSpeed(
      previousAnchors,
      currentAnchors,
      nextMetrics,
      0.016,
    );
    assert.ok(falseResizeSpeed > 0.8);

    const next = updateMotionSampleLifecycle(
      { target: 0.4, anchors: previousAnchors, timestampMs: 1_000 },
      currentAnchors,
      nextMetrics,
      1_016,
      true,
      true,
    );

    assert.equal(next.target, 0);
    assert.equal(next.anchors, currentAnchors);
    assert.equal(next.timestampMs, 1_016);
  });

  it('clears target and history when a changed result has no valid pair', () => {
    const previousAnchors = motionAnchors(0.2);

    const next = updateMotionSampleLifecycle(
      { target: 0.8, anchors: previousAnchors, timestampMs: 1_000 },
      null,
      metrics,
      1_016,
      true,
      false,
    );

    assert.deepEqual(next, {
      target: 0,
      anchors: null,
      timestampMs: null,
    });
  });

  it('keeps cleared history empty through held-pair resize and restarts reacquisition', () => {
    assert.equal(
      typeof motionAnchorsForCurrentHands,
      'function',
    );
    const pair = {
      a: { rail: railFixture({ x: 0.2 }) },
      b: { rail: railFixture({ x: 0.7 }) },
    };
    const movedPair = {
      a: { rail: railFixture({ x: 0.21 }) },
      b: { rail: railFixture({ x: 0.71 }) },
    };
    const firstAnchors = motionAnchorsForCurrentHands(
      pair,
      metrics,
      2,
    );
    const first = updateMotionSampleLifecycle(
      { target: 0, anchors: null, timestampMs: null },
      firstAnchors,
      metrics,
      1_000,
      true,
      false,
    );
    const movedAnchors = motionAnchorsForCurrentHands(
      movedPair,
      metrics,
      2,
    );
    const history = updateMotionSampleLifecycle(
      first,
      movedAnchors,
      metrics,
      1_016,
      true,
      false,
    );
    assert.ok(history.target > 0);

    const noHandAnchors = motionAnchorsForCurrentHands(
      movedPair,
      metrics,
      0,
    );
    const cleared = updateMotionSampleLifecycle(
      history,
      noHandAnchors,
      metrics,
      1_032,
      true,
      false,
    );
    assert.deepEqual(cleared, {
      target: 0,
      anchors: null,
      timestampMs: null,
    });

    const resizedMetrics = {
      ...metrics,
      stageWidth: 900,
      stageHeight: 500,
      displayWidth: 900,
      displayHeight: 500,
    };
    const heldPairResizeAnchors = motionAnchorsForCurrentHands(
      movedPair,
      resizedMetrics,
      0,
    );
    const afterResize = updateMotionSampleLifecycle(
      cleared,
      heldPairResizeAnchors,
      resizedMetrics,
      1_048,
      false,
      true,
    );
    assert.equal(heldPairResizeAnchors, null);
    assert.equal(afterResize, cleared);
    assert.equal(afterResize.anchors, null);
    assert.equal(afterResize.timestampMs, null);

    const reacquiredAnchors = motionAnchorsForCurrentHands(
      movedPair,
      resizedMetrics,
      2,
    );
    const reacquired = updateMotionSampleLifecycle(
      afterResize,
      reacquiredAnchors,
      resizedMetrics,
      1_064,
      true,
      false,
    );
    assert.equal(reacquired.target, 0);
    assert.equal(reacquired.anchors, reacquiredAnchors);
    assert.equal(reacquired.timestampMs, 1_064);
  });

  it('preserves the exact sample and history object on an unchanged frame', () => {
    const previous = {
      target: 0.7,
      anchors: motionAnchors(0.2),
      timestampMs: 1_000,
    };

    const next = updateMotionSampleLifecycle(
      previous,
      null,
      metrics,
      1_016,
      false,
      false,
    );

    assert.equal(next, previous);
    assert.equal(next.anchors, previous.anchors);
  });

  it('expires a stale target only after the 100ms boundary', () => {
    assert.equal(
      typeof expireStaleMotionTarget,
      'function',
    );

    assert.equal(
      expireStaleMotionTarget(0.7, null, 1_000),
      0,
    );
    assert.equal(
      expireStaleMotionTarget(0.7, 1_000, 1_100),
      0.7,
    );
    assert.equal(
      expireStaleMotionTarget(0.7, 1_000, 1_100.001),
      0,
    );
  });

  it('averages varied display-space displacement by stage diagonal and time', () => {
    const previous = motionAnchors(0.2).slice(0, 4);
    const displacements = [
      { x: 0.05, y: 0 },
      { x: 0, y: 0.1 },
      { x: 0.05, y: 0.1 },
      { x: 0, y: 0 },
    ];
    const next = previous.map((point, index) => ({
      ...point,
      x: point.x + displacements[index].x,
      y: point.y + displacements[index].y,
    }));

    const speed = normalizedAnchorSpeed(previous, next, metrics, 0.5);

    assert.ok(Math.abs(speed - 0.12) < 1e-9);
  });

  it('maps the approved speed range into zero-to-one motion', () => {
    const speed = 0.2;
    const t = (speed - 0.03) / (0.45 - 0.03);
    const expected = t * t * (3 - 2 * t);

    assert.equal(motionTargetForSpeed(0.03), 0);
    assert.ok(Math.abs(motionTargetForSpeed(speed) - expected) < 1e-12);
    assert.equal(motionTargetForSpeed(0.45), 1);
  });

  it('attacks faster than it releases and decays toward zero', () => {
    const attacked = dampMotionEnergy(0, 1, 0.1);
    const released = dampMotionEnergy(1, 0, 0.1);
    const decayed = dampMotionEnergy(released, 0, 0.5);

    assert.ok(attacked > 1 - released);
    assert.ok(decayed < released);
    assert.ok(decayed >= 0 && decayed <= 1);
  });

  it('keeps attack damping equivalent across split time steps', () => {
    const singleStep = dampMotionEnergy(0, 1, 0.1);
    const splitStep = dampMotionEnergy(
      dampMotionEnergy(0, 1, 0.04),
      1,
      0.06,
    );

    assert.ok(Math.abs(singleStep - splitStep) < 1e-12);
  });

  it('keeps release damping equivalent across split time steps', () => {
    const singleStep = dampMotionEnergy(1, 0, 0.1);
    const splitStep = dampMotionEnergy(
      dampMotionEnergy(1, 0, 0.04),
      0,
      0.06,
    );

    assert.ok(Math.abs(singleStep - splitStep) < 1e-12);
  });

  it('uses the exact default attack lambda of 14', () => {
    const attacked = dampMotionEnergy(0, 1, 0.1);
    const expected = 1 - Math.exp(-14 * 0.1);

    assert.ok(Math.abs(attacked - expected) < 1e-12);
  });

  it('uses the exact default release lambda of 5', () => {
    const released = dampMotionEnergy(1, 0, 0.1);
    const expected = Math.exp(-5 * 0.1);

    assert.ok(Math.abs(released - expected) < 1e-12);
  });

  it('keeps the no-options damping path free of object construction', () => {
    const source = dampMotionEnergy.toString();

    assert.doesNotMatch(source, /optionsArg\s*=\s*\{\}/);
    assert.doesNotMatch(source, /\.\.\.optionsArg/);
    assert.doesNotMatch(source, /const options\s*=\s*\{/);
    assert.ok(
      Math.abs(dampMotionEnergy(0, 1, 0.1) - (1 - Math.exp(-1.4)))
        < 1e-12,
    );
  });

  it('honors a custom attack lambda override', () => {
    const attacked = dampMotionEnergy(0.25, 0.75, 0.2, {
      attackLambda: 3,
      releaseLambda: 99,
    });
    const expected = 0.75 + (0.25 - 0.75) * Math.exp(-3 * 0.2);

    assert.ok(Math.abs(attacked - expected) < 1e-12);
  });

  it('honors a custom release lambda override', () => {
    const released = dampMotionEnergy(0.75, 0.25, 0.2, {
      attackLambda: 99,
      releaseLambda: 2,
    });
    const expected = 0.25 + (0.75 - 0.25) * Math.exp(-2 * 0.2);

    assert.ok(Math.abs(released - expected) < 1e-12);
  });

  it('clamps current and target inputs to zero-to-one', () => {
    assert.equal(
      dampMotionEnergy(-2, 2, 0.1),
      dampMotionEnergy(0, 1, 0.1),
    );
    assert.equal(
      dampMotionEnergy(2, -2, 0.1),
      dampMotionEnergy(1, 0, 0.1),
    );
  });

  it('clamps damped output to zero-to-one', () => {
    assert.equal(dampMotionEnergy(0, 1, 1, { attackLambda: -1 }), 0);
    assert.equal(dampMotionEnergy(1, 0, 1, { releaseLambda: -1 }), 1);
  });

  it('returns zero for missing, empty, or mismatched anchors', () => {
    assert.equal(normalizedAnchorSpeed(null, motionAnchors(0.3), metrics, 0.5), 0);
    assert.equal(normalizedAnchorSpeed([], motionAnchors(0.3), metrics, 0.5), 0);
    assert.equal(normalizedAnchorSpeed(
      motionAnchors(0.2).slice(0, 7),
      motionAnchors(0.3),
      metrics,
      0.5,
    ), 0);
  });

  it('returns zero unless every motion metric is finite and positive', () => {
    const previous = motionAnchors(0.2);
    const next = motionAnchors(0.3);

    assert.equal(normalizedAnchorSpeed(previous, next, null, 0.5), 0);
    for (const key of [
      'stageWidth',
      'stageHeight',
      'displayWidth',
      'displayHeight',
    ]) {
      for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.equal(
          normalizedAnchorSpeed(previous, next, { ...metrics, [key]: value }, 0.5),
          0,
          `${key} must reject ${value}`,
        );
      }
    }
  });

  it('returns zero for non-finite or non-positive elapsed time', () => {
    const previous = motionAnchors(0.2);
    const next = motionAnchors(0.3);

    for (const deltaSeconds of [
      0,
      -0.1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ]) {
      assert.equal(
        normalizedAnchorSpeed(previous, next, metrics, deltaSeconds),
        0,
        `deltaSeconds must reject ${deltaSeconds}`,
      );
    }
  });
});

describe('facet buffers', () => {
  const metrics = coverMetrics(540, 960, 1920, 1080);
  const camera = { fov: 50, z: 3, depthScale: 0.32, aspect: 540 / 960 };

  it('creates three connected quads with consistent vertex and UV ordering', () => {
    const aRail = railFixture({ x: 0.3, u: 0.1 });
    const bRail = railFixture({ x: 0.7, u: 0.6 });
    const facets = buildFacetBuffers(bufferState(aRail, bRail), metrics, camera);

    assert.equal(facets.length, 3);
    assert.equal(facets[0].positions.length, 18);
    assert.equal(facets[0].uvs.length, 12);
    assert.deepEqual(facets[0].uvs.map((value) => Number(value.toFixed(6))), [
      0.1, 0.75,
      0.6, 0.75,
      0.613333, 0.616667,
      0.1, 0.75,
      0.613333, 0.616667,
      0.113333, 0.616667,
    ]);
    assert.deepEqual(
      facets[0].positions.slice(6, 9),
      facets[1].positions.slice(3, 6),
    );
    assert.deepEqual(
      facets[0].positions.slice(15, 18),
      facets[1].positions.slice(0, 3),
    );
  });

  it('maps mirrored video coordinates through object-cover cropping', () => {
    assert.ok(metrics);
    assert.equal(metrics.displayHeight, 960);
    assert.equal(Number(metrics.displayWidth.toFixed(2)), 1706.67);
    assert.equal(Number(metrics.offsetX.toFixed(2)), -583.33);

    const mirrored = meshHand({ x: 0.5, label: 'Left' });
    const facets = buildFacetBuffers(
      bufferState(mirrored.rail, railFixture({ x: 0.8 })),
      metrics,
      camera,
    );
    const sourcePoint = mirrored.rail[0];
    const screenPoint = screenPointFromWorld(facets[0].positions.slice(0, 3), metrics, camera);
    const expectedX = metrics.offsetX + sourcePoint.x * metrics.displayWidth;

    assert.equal(Number((sourcePoint.x + sourcePoint.u).toFixed(6)), 1);
    assert.ok(Math.abs(screenPoint.x - expectedX) < 1e-9);
    assert.equal(facets[0].uvs[0], sourcePoint.u);
  });

  it('projects depth without moving the final screen anchor', () => {
    const near = buildFacetBuffers(
      bufferState(railFixture({ x: 0.4, z: 0.5 }), railFixture({ x: 0.7, z: 0.5 })),
      metrics,
      camera,
    );
    const far = buildFacetBuffers(
      bufferState(railFixture({ x: 0.4, z: -0.5 }), railFixture({ x: 0.7, z: -0.5 })),
      metrics,
      camera,
    );
    const nearScreen = screenPointFromWorld(near[0].positions.slice(0, 3), metrics, camera);
    const farScreen = screenPointFromWorld(far[0].positions.slice(0, 3), metrics, camera);

    assert.notEqual(near[0].positions[0], far[0].positions[0]);
    assert.ok(Math.abs(nearScreen.x - farScreen.x) < 1e-9);
    assert.ok(Math.abs(nearScreen.y - farScreen.y) < 1e-9);
  });
});
