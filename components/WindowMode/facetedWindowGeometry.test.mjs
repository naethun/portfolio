import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FINGERTIP_INDICES,
  assignHandPair,
  buildFacetBuffers,
  coverMetrics,
  handMeshInputFromLandmarks,
  initialFacetedWindowState,
  updateFacetedWindowState,
} from './facetedWindowGeometry.mjs';

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

describe('facet buffers', () => {
  const metrics = coverMetrics(540, 960, 1920, 1080);
  const camera = { fov: 50, z: 3, depthScale: 0.32, aspect: 540 / 960 };

  it('creates four quads with consistent vertex and UV ordering', () => {
    const aRail = railFixture({ x: 0.3, u: 0.1 });
    const bRail = railFixture({ x: 0.7, u: 0.6 });
    const facets = buildFacetBuffers(bufferState(aRail, bRail), metrics, camera);

    assert.equal(facets.length, 4);
    assert.equal(facets[0].positions.length, 18);
    assert.equal(facets[0].uvs.length, 12);
    assert.deepEqual(facets[0].uvs, [
      0.1, 0.75,
      0.6, 0.75,
      0.61, 0.65,
      0.1, 0.75,
      0.61, 0.65,
      0.11, 0.65,
    ]);
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
