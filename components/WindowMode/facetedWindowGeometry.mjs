export const FINGERTIP_INDICES = Object.freeze([4, 8, 12, 16, 20]);

const DEFAULTS = Object.freeze({
  armPinchRatio: 0.32,
  openPinchRatio: 0.78,
  maxCollapse: 0.94,
  openFanBoost: 0.20,
  depthLimit: 0.9,
  dampingLambda: 18,
  holdMs: 150,
  fadeMs: 450,
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function handMeshInputFromLandmarks(landmarks, handedness = [], optionsArg = {}) {
  const options = { ...DEFAULTS, ...optionsArg };
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const thumb = landmarks[4];
  const index = landmarks[8];
  if (!wrist || !middleMcp || !thumb || !index) return null;
  const handSize = Math.hypot(
    wrist.x - middleMcp.x,
    wrist.y - middleMcp.y,
    (wrist.z ?? 0) - (middleMcp.z ?? 0),
  );
  if (!Number.isFinite(handSize) || handSize <= 1e-6) return null;
  const pinchRatio = Math.hypot(
    thumb.x - index.x,
    thumb.y - index.y,
    (thumb.z ?? 0) - (index.z ?? 0),
  ) / handSize;
  const collapse = 1 - smoothstep(
    options.armPinchRatio,
    options.openPinchRatio,
    pinchRatio,
  );
  const toPoint = (point) => ({
    x: options.mirrored === false ? point.x : 1 - point.x,
    y: point.y,
    z: clamp(
      ((wrist.z ?? 0) - (point.z ?? 0)) / handSize,
      -options.depthLimit,
      options.depthLimit,
    ),
    u: point.x,
    v: 1 - point.y,
  });
  return {
    label: handedness[0]?.categoryName || '',
    score: handedness[0]?.score ?? 0,
    pinchRatio,
    collapse,
    center: toPoint(middleMcp),
    pinch: toPoint({
      x: (thumb.x + index.x) / 2,
      y: (thumb.y + index.y) / 2,
      z: ((thumb.z ?? 0) + (index.z ?? 0)) / 2,
    }),
    rail: FINGERTIP_INDICES.map((tipIndex) => toPoint(landmarks[tipIndex])),
  };
}

export function initialFacetedWindowState() {
  return {
    armed: false,
    pair: null,
    opacity: 0,
    lastSeenMs: 0,
    lastUpdateMs: 0,
  };
}

function handLabel(hand) {
  return typeof hand?.label === 'string' ? hand.label.toLowerCase() : '';
}

function centerDistance(a, b) {
  if (!a?.center || !b?.center) return Number.POSITIVE_INFINITY;
  return Math.hypot(
    a.center.x - b.center.x,
    a.center.y - b.center.y,
    (a.center.z ?? 0) - (b.center.z ?? 0),
  );
}

export function assignHandPair(hands, previousPair = null) {
  if (!Array.isArray(hands)) return null;
  const candidates = hands.filter((hand) => hand?.center).slice(0, 2);
  if (candidates.length < 2) return null;

  const leftIndex = candidates.findIndex((hand) => handLabel(hand) === 'left');
  const rightIndex = candidates.findIndex((hand) => handLabel(hand) === 'right');
  if (leftIndex >= 0 && rightIndex >= 0 && leftIndex !== rightIndex) {
    return { a: candidates[leftIndex], b: candidates[rightIndex] };
  }
  if (leftIndex >= 0) {
    return { a: candidates[leftIndex], b: candidates[1 - leftIndex] };
  }
  if (rightIndex >= 0) {
    return { a: candidates[1 - rightIndex], b: candidates[rightIndex] };
  }

  if (previousPair?.a && previousPair?.b) {
    const direct = centerDistance(candidates[0], previousPair.a)
      + centerDistance(candidates[1], previousPair.b);
    const swapped = centerDistance(candidates[0], previousPair.b)
      + centerDistance(candidates[1], previousPair.a);
    return direct <= swapped
      ? { a: candidates[0], b: candidates[1] }
      : { a: candidates[1], b: candidates[0] };
  }

  return candidates[0].center.x <= candidates[1].center.x
    ? { a: candidates[0], b: candidates[1] }
    : { a: candidates[1], b: candidates[0] };
}

export function damp(current, target, lambda, deltaSeconds) {
  return target + (current - target) * Math.exp(-lambda * Math.max(0, deltaSeconds));
}

export function normalizedAnchorSpeed(
  previousAnchors,
  nextAnchors,
  metrics,
  deltaSeconds,
) {
  if (
    !Array.isArray(previousAnchors)
    || !Array.isArray(nextAnchors)
    || previousAnchors.length === 0
    || previousAnchors.length !== nextAnchors.length
    || !metrics
    || !Number.isFinite(metrics.stageWidth)
    || metrics.stageWidth <= 0
    || !Number.isFinite(metrics.stageHeight)
    || metrics.stageHeight <= 0
    || !Number.isFinite(metrics.displayWidth)
    || metrics.displayWidth <= 0
    || !Number.isFinite(metrics.displayHeight)
    || metrics.displayHeight <= 0
    || !Number.isFinite(deltaSeconds)
    || deltaSeconds <= 0
  ) {
    return 0;
  }

  const averagePixels = previousAnchors.reduce((total, point, index) => {
    const next = nextAnchors[index];
    return total + Math.hypot(
      (next.x - point.x) * metrics.displayWidth,
      (next.y - point.y) * metrics.displayHeight,
    );
  }, 0) / previousAnchors.length;
  const stageDiagonal = Math.hypot(metrics.stageWidth, metrics.stageHeight);
  return averagePixels / Math.max(1, stageDiagonal) / deltaSeconds;
}

export function motionTargetForSpeed(speed) {
  return smoothstep(0.03, 0.45, Number.isFinite(speed) ? speed : 0);
}

export function updateMotionSampleLifecycle(
  previous,
  currentAnchors,
  metrics,
  timestampMs,
  resultChanged,
  dimensionsChanged,
) {
  if (!resultChanged && !dimensionsChanged) return previous;
  if (Array.isArray(currentAnchors) && currentAnchors.length > 0 && metrics) {
    let target = 0;
    if (
      resultChanged
      && !dimensionsChanged
      && previous?.anchors
      && previous.timestampMs !== null
    ) {
      const speed = normalizedAnchorSpeed(
        previous.anchors,
        currentAnchors,
        metrics,
        Math.max(0, timestampMs - previous.timestampMs) / 1000,
      );
      target = motionTargetForSpeed(speed);
    }
    return {
      target,
      anchors: currentAnchors,
      timestampMs,
    };
  }
  if (resultChanged) {
    return {
      target: 0,
      anchors: null,
      timestampMs: null,
    };
  }
  return previous;
}

export function expireStaleMotionTarget(target, lastSampleMs, timestampMs) {
  const sampleAgeMs = lastSampleMs === null
    ? Number.POSITIVE_INFINITY
    : timestampMs - lastSampleMs;
  return sampleAgeMs > 100 ? 0 : target;
}

export function dampMotionEnergy(
  current,
  target,
  deltaSeconds,
  optionsArg,
) {
  const attackLambda = optionsArg?.attackLambda ?? 14;
  const releaseLambda = optionsArg?.releaseLambda ?? 5;
  const safeCurrent = clamp(Number.isFinite(current) ? current : 0);
  const safeTarget = clamp(Number.isFinite(target) ? target : 0);
  const lambda = safeTarget > safeCurrent
    ? attackLambda
    : releaseLambda;
  return clamp(damp(safeCurrent, safeTarget, lambda, deltaSeconds));
}

function interpolatePoint(point, pinch, collapse) {
  return {
    x: point.x + (pinch.x - point.x) * collapse,
    y: point.y + (pinch.y - point.y) * collapse,
    z: point.z + (pinch.z - point.z) * collapse,
    u: point.u + (pinch.u - point.u) * collapse,
    v: point.v + (pinch.v - point.v) * collapse,
  };
}

export function fanScaleForCollapse(
  collapse,
  maxCollapse = DEFAULTS.maxCollapse,
  openFanBoost = DEFAULTS.openFanBoost,
) {
  const safeMax = Math.max(1e-6, maxCollapse);
  const openness = clamp(1 - clamp(collapse, 0, safeMax) / safeMax);
  return 1 + Math.max(0, openFanBoost) * openness;
}

function collapseHand(hand, maxCollapse, openFanBoost) {
  const collapse = clamp(hand.collapse, 0, maxCollapse);
  const fanScale = fanScaleForCollapse(collapse, maxCollapse, openFanBoost);
  return {
    ...hand,
    collapse,
    center: { ...hand.center },
    pinch: { ...hand.pinch },
    rail: hand.rail.map((point) => {
      const collapsed = interpolatePoint(point, hand.pinch, collapse);
      return {
        ...collapsed,
        x: hand.pinch.x + (collapsed.x - hand.pinch.x) * fanScale,
        y: hand.pinch.y + (collapsed.y - hand.pinch.y) * fanScale,
      };
    }),
  };
}

function dampPoint(current, target, lambda, deltaSeconds) {
  return {
    x: damp(current.x, target.x, lambda, deltaSeconds),
    y: damp(current.y, target.y, lambda, deltaSeconds),
    z: damp(current.z, target.z, lambda, deltaSeconds),
    u: damp(current.u, target.u, lambda, deltaSeconds),
    v: damp(current.v, target.v, lambda, deltaSeconds),
  };
}

function dampHand(current, target, lambda, deltaSeconds) {
  return {
    ...target,
    collapse: damp(current.collapse, target.collapse, lambda, deltaSeconds),
    center: dampPoint(current.center, target.center, lambda, deltaSeconds),
    pinch: dampPoint(current.pinch, target.pinch, lambda, deltaSeconds),
    rail: target.rail.map((point, index) => (
      current.rail[index]
        ? dampPoint(current.rail[index], point, lambda, deltaSeconds)
        : point
    )),
  };
}

function isTightlyPinched(hand, armPinchRatio) {
  return Number.isFinite(hand?.pinchRatio) && hand.pinchRatio <= armPinchRatio;
}

export function updateFacetedWindowState(
  previous = initialFacetedWindowState(),
  hands,
  timestampMs,
  optionsArg = {},
) {
  const options = { ...DEFAULTS, ...optionsArg };
  const timestamp = Number.isFinite(timestampMs) ? timestampMs : previous.lastUpdateMs;
  const assigned = assignHandPair(hands, previous.pair);

  if (assigned) {
    if (!previous.armed && !(
      isTightlyPinched(assigned.a, options.armPinchRatio)
      && isTightlyPinched(assigned.b, options.armPinchRatio)
    )) {
      return {
        ...initialFacetedWindowState(),
        lastUpdateMs: timestamp,
      };
    }

    const targetPair = {
      a: collapseHand(assigned.a, options.maxCollapse, options.openFanBoost),
      b: collapseHand(assigned.b, options.maxCollapse, options.openFanBoost),
    };
    const deltaSeconds = Math.max(0, timestamp - previous.lastUpdateMs) / 1000;
    const pair = previous.armed && previous.pair
      ? {
          a: dampHand(
            previous.pair.a,
            targetPair.a,
            options.dampingLambda,
            deltaSeconds,
          ),
          b: dampHand(
            previous.pair.b,
            targetPair.b,
            options.dampingLambda,
            deltaSeconds,
          ),
        }
      : targetPair;

    return {
      armed: true,
      pair,
      opacity: 1,
      lastSeenMs: timestamp,
      lastUpdateMs: timestamp,
    };
  }

  if (!previous.armed || !previous.pair) {
    return {
      ...initialFacetedWindowState(),
      lastUpdateMs: timestamp,
    };
  }

  const lossMs = Math.max(0, timestamp - previous.lastSeenMs);
  if (lossMs <= options.holdMs) {
    return {
      ...previous,
      opacity: 1,
      lastUpdateMs: timestamp,
    };
  }
  if (lossMs < options.holdMs + options.fadeMs) {
    return {
      ...previous,
      opacity: clamp(1 - (lossMs - options.holdMs) / Math.max(1, options.fadeMs)),
      lastUpdateMs: timestamp,
    };
  }
  return initialFacetedWindowState();
}

export function coverMetrics(stageWidth, stageHeight, videoWidth, videoHeight) {
  if (![stageWidth, stageHeight, videoWidth, videoHeight].every((value) => value > 0)) {
    return null;
  }
  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight);
  const displayWidth = videoWidth * scale;
  const displayHeight = videoHeight * scale;
  return {
    stageWidth,
    stageHeight,
    displayWidth,
    displayHeight,
    offsetX: (stageWidth - displayWidth) / 2,
    offsetY: (stageHeight - displayHeight) / 2,
  };
}

const RENDER_ANCHOR_COUNT = 4;
const MIN_RAIL_LENGTH = 1e-6;

function interpolateRailPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    u: a.u + (b.u - a.u) * t,
    v: a.v + (b.v - a.v) * t,
  };
}

function sampleRailByIndex(rail, sourcePosition) {
  const startIndex = Math.min(
    rail.length - 1,
    Math.max(0, Math.floor(sourcePosition)),
  );
  const endIndex = Math.min(rail.length - 1, startIndex + 1);
  return interpolateRailPoint(
    rail[startIndex],
    rail[endIndex],
    sourcePosition - startIndex,
  );
}

export function resampleRailToAnchors(rail, metrics) {
  if (
    !Array.isArray(rail)
    || rail.length < 2
    || !metrics
    || metrics.displayWidth <= 0
    || metrics.displayHeight <= 0
  ) {
    return [];
  }

  const cumulative = [0];
  for (let index = 1; index < rail.length; index += 1) {
    const dx = (rail[index].x - rail[index - 1].x) * metrics.displayWidth;
    const dy = (rail[index].y - rail[index - 1].y) * metrics.displayHeight;
    cumulative.push(cumulative[index - 1] + Math.hypot(dx, dy));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= MIN_RAIL_LENGTH) {
    return Array.from({ length: RENDER_ANCHOR_COUNT }, (_, anchorIndex) => {
      const sourcePosition = (
        anchorIndex * (rail.length - 1) / (RENDER_ANCHOR_COUNT - 1)
      );
      return sampleRailByIndex(rail, sourcePosition);
    });
  }

  return Array.from({ length: RENDER_ANCHOR_COUNT }, (_, anchorIndex) => {
    if (anchorIndex === 0) return { ...rail[0] };
    if (anchorIndex === RENDER_ANCHOR_COUNT - 1) {
      return { ...rail[rail.length - 1] };
    }

    const targetLength = totalLength * anchorIndex / (RENDER_ANCHOR_COUNT - 1);
    let segmentIndex = 0;
    while (
      segmentIndex < cumulative.length - 2
      && cumulative[segmentIndex + 1] < targetLength
    ) {
      segmentIndex += 1;
    }
    const segmentLength = cumulative[segmentIndex + 1] - cumulative[segmentIndex];
    const localT = (targetLength - cumulative[segmentIndex])
      / Math.max(MIN_RAIL_LENGTH, segmentLength);
    return interpolateRailPoint(
      rail[segmentIndex],
      rail[segmentIndex + 1],
      localT,
    );
  });
}

export function motionAnchorsForCurrentHands(pair, metrics, currentHandCount) {
  if (
    !Number.isFinite(currentHandCount)
    || currentHandCount < 2
    || !pair?.a?.rail
    || !pair?.b?.rail
    || !metrics
  ) {
    return null;
  }
  const aAnchors = resampleRailToAnchors(pair.a.rail, metrics);
  const bAnchors = resampleRailToAnchors(pair.b.rail, metrics);
  if (aAnchors.length !== 4 || bAnchors.length !== 4) return null;
  return [...aAnchors, ...bAnchors];
}

function projectedWorldPoint(point, metrics, camera) {
  const px = metrics.offsetX + point.x * metrics.displayWidth;
  const py = metrics.offsetY + point.y * metrics.displayHeight;
  const ndcX = (px / metrics.stageWidth) * 2 - 1;
  const ndcY = 1 - (py / metrics.stageHeight) * 2;
  const z = point.z * camera.depthScale;
  const distance = camera.z - z;
  const halfHeight = Math.tan((camera.fov * Math.PI) / 360) * distance;
  const halfWidth = halfHeight * (camera.aspect ?? metrics.stageWidth / metrics.stageHeight);
  return { x: ndcX * halfWidth, y: ndcY * halfHeight, z };
}

export function buildFacetBuffers(state, metrics, camera) {
  const aRail = state?.pair?.a?.rail;
  const bRail = state?.pair?.b?.rail;
  if (!metrics || !camera || aRail?.length < 5 || bRail?.length < 5) return [];

  const aAnchors = resampleRailToAnchors(aRail, metrics);
  const bAnchors = resampleRailToAnchors(bRail, metrics);
  if (aAnchors.length !== 4 || bAnchors.length !== 4) return [];

  const triangleOrder = [0, 1, 2, 0, 2, 3];
  return Array.from({ length: 3 }, (_, index) => {
    const corners = [
      aAnchors[index],
      bAnchors[index],
      bAnchors[index + 1],
      aAnchors[index + 1],
    ];
    const positions = [];
    const uvs = [];
    triangleOrder.forEach((cornerIndex) => {
      const point = corners[cornerIndex];
      const world = projectedWorldPoint(point, metrics, camera);
      positions.push(world.x, world.y, world.z);
      uvs.push(point.u, point.v);
    });
    return { positions, uvs };
  });
}
