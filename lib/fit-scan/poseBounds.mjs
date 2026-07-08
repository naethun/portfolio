const MIN_VISIBILITY = 0.45;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function visible(point) {
  return point && (point.visibility ?? 0) >= MIN_VISIBILITY;
}

function displayPoint(point) {
  return { x: 1 - point.x, y: point.y };
}

function rectFromPoints(points, paddingX = 0.04, paddingY = 0.04) {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  const width = Math.max(0.02, right - left);
  const height = Math.max(0.02, bottom - top);
  const x = clamp01(left - width * paddingX);
  const y = clamp01(top - height * paddingY);
  const w = clamp01(right + width * paddingX) - x;
  const h = clamp01(bottom + height * paddingY) - y;
  return { x, y, w, h };
}

function boundFromLandmarks({ id, kind, label, landmarks, paddingX, paddingY }) {
  if (!landmarks.every(visible)) return null;
  const points = landmarks.map(displayPoint);
  const rect = rectFromPoints(points, paddingX, paddingY);
  const anchor = {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  };
  return {
    id,
    kind,
    label,
    rect,
    anchor,
    confidence: Math.min(...landmarks.map((point) => point.visibility ?? 0)),
    derivedFrom: ['pose_landmarks', 'segmentation_mask'],
  };
}

export function derivePoseBounds({ landmarks, segmentationMasksPresent }) {
  if (!segmentationMasksPresent || !Array.isArray(landmarks) || landmarks.length < 33) {
    return [];
  }

  const upper = boundFromLandmarks({
    id: 'upper-body',
    kind: 'upper_body',
    label: 'Upper body',
    landmarks: [landmarks[11], landmarks[12], landmarks[23], landmarks[24]],
    paddingX: 0.42,
    paddingY: 0.18,
  });
  const lower = boundFromLandmarks({
    id: 'lower-body',
    kind: 'lower_body',
    label: 'Lower body',
    landmarks: [
      landmarks[23],
      landmarks[24],
      landmarks[25],
      landmarks[26],
      landmarks[27],
      landmarks[28],
    ],
    paddingX: 0.34,
    paddingY: 0.12,
  });
  const leftShoe = boundFromLandmarks({
    id: 'left-shoe',
    kind: 'left_shoe',
    label: 'Left shoe',
    landmarks: [landmarks[27], landmarks[29], landmarks[31]],
    paddingX: 0.7,
    paddingY: 0.8,
  });
  const rightShoe = boundFromLandmarks({
    id: 'right-shoe',
    kind: 'right_shoe',
    label: 'Right shoe',
    landmarks: [landmarks[28], landmarks[30], landmarks[32]],
    paddingX: 0.7,
    paddingY: 0.8,
  });

  return [upper, lower, leftShoe, rightShoe].filter(Boolean);
}

function distanceToRect(point, rect) {
  const cx = clamp01(Math.max(rect.x, Math.min(point.x, rect.x + rect.w)));
  const cy = clamp01(Math.max(rect.y, Math.min(point.y, rect.y + rect.h)));
  const edgeDistance = Math.hypot(point.x - cx, point.y - cy);
  if (edgeDistance === 0) return 0;
  return edgeDistance;
}

export function pickNearestBound(pointer, bounds, maxDistance = 0.18) {
  if (!pointer || !Array.isArray(bounds) || bounds.length === 0) return null;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const bound of bounds) {
    const distance = distanceToRect(pointer, bound.rect);
    if (distance < nearestDistance) {
      nearest = bound;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= maxDistance ? nearest : null;
}

export function clipBoundsToMask(
  bounds,
  { data, width, height, threshold = 0.2, mirrored = false },
) {
  if (!data || !width || !height) return [];
  const clipped = [];
  for (const bound of bounds) {
    const minX = Math.max(0, Math.floor(bound.rect.x * width));
    const maxX = Math.min(width - 1, Math.ceil((bound.rect.x + bound.rect.w) * width));
    const minY = Math.max(0, Math.floor(bound.rect.y * height));
    const maxY = Math.min(height - 1, Math.ceil((bound.rect.y + bound.rect.h) * height));
    let seen = false;
    let outMinX = width;
    let outMaxX = 0;
    let outMinY = height;
    let outMaxY = 0;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const sourceX = mirrored ? width - 1 - x : x;
        const value = data[y * width + sourceX] ?? 0;
        if (value < threshold) continue;
        seen = true;
        outMinX = Math.min(outMinX, x);
        outMaxX = Math.max(outMaxX, x);
        outMinY = Math.min(outMinY, y);
        outMaxY = Math.max(outMaxY, y);
      }
    }

    if (!seen) continue;
    const rect = {
      x: clamp01(outMinX / width),
      y: clamp01(outMinY / height),
      w: clamp01((outMaxX + 1) / width) - clamp01(outMinX / width),
      h: clamp01((outMaxY + 1) / height) - clamp01(outMinY / height),
    };
    clipped.push({
      ...bound,
      rect,
      anchor: {
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
      },
    });
  }
  return clipped;
}

export function displayRectToSourceRect(rect) {
  return {
    x: Number((1 - rect.x - rect.w).toFixed(6)),
    y: Number(rect.y.toFixed(6)),
    w: Number(rect.w.toFixed(6)),
    h: Number(rect.h.toFixed(6)),
  };
}

export function expandRect(rect, amount = 0.04) {
  const x = clamp01(rect.x - amount);
  const y = clamp01(rect.y - amount);
  const right = clamp01(rect.x + rect.w + amount);
  const bottom = clamp01(rect.y + rect.h + amount);
  return {
    x,
    y,
    w: Math.max(0.01, right - x),
    h: Math.max(0.01, bottom - y),
  };
}
