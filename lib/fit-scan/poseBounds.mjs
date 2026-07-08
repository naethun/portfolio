const MIN_VISIBILITY = 0.45;
const MIN_BLOB_AREA_RATIO = 0.004;
const MIN_OBJECT_SCORE = 0.28;
const IGNORED_OBJECT_LABELS = new Set(['person']);

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

function area(rect) {
  return rect.w * rect.h;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'object';
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function round6(value) {
  return Number(value.toFixed(6));
}

export function derivePoseBounds({ landmarks, segmentationMasksPresent }) {
  if (!segmentationMasksPresent || !Array.isArray(landmarks) || landmarks.length < 33) {
    return [];
  }

  const head = boundFromLandmarks({
    id: 'head',
    kind: 'head',
    label: 'Head / face',
    landmarks: [
      landmarks[0],
      landmarks[2],
      landmarks[5],
      landmarks[7],
      landmarks[8],
      landmarks[9],
      landmarks[10],
    ],
    paddingX: 0.95,
    paddingY: 0.82,
  });
  const upper = boundFromLandmarks({
    id: 'upper-body',
    kind: 'upper_body',
    label: 'Shirt / upper body',
    landmarks: [landmarks[11], landmarks[12], landmarks[23], landmarks[24]],
    paddingX: 0.42,
    paddingY: 0.18,
  });
  const lower = boundFromLandmarks({
    id: 'lower-body',
    kind: 'lower_body',
    label: 'Pants / lower body',
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
  const leftArm = boundFromLandmarks({
    id: 'left-arm',
    kind: 'left_arm',
    label: 'Left arm',
    landmarks: [landmarks[11], landmarks[13], landmarks[15]],
    paddingX: 0.38,
    paddingY: 0.42,
  });
  const rightArm = boundFromLandmarks({
    id: 'right-arm',
    kind: 'right_arm',
    label: 'Right arm',
    landmarks: [landmarks[12], landmarks[14], landmarks[16]],
    paddingX: 0.38,
    paddingY: 0.42,
  });
  const leftHand = boundFromLandmarks({
    id: 'left-hand',
    kind: 'left_hand',
    label: 'Left hand',
    landmarks: [landmarks[15], landmarks[17], landmarks[19], landmarks[21]],
    paddingX: 0.82,
    paddingY: 0.82,
  });
  const rightHand = boundFromLandmarks({
    id: 'right-hand',
    kind: 'right_hand',
    label: 'Right hand',
    landmarks: [landmarks[16], landmarks[18], landmarks[20], landmarks[22]],
    paddingX: 0.82,
    paddingY: 0.82,
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

  return [
    head,
    upper,
    lower,
    leftArm,
    rightArm,
    leftHand,
    rightHand,
    leftShoe,
    rightShoe,
  ].filter(Boolean);
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
  let nearestArea = Infinity;
  for (const bound of bounds) {
    const distance = distanceToRect(pointer, bound.rect);
    const boundArea = area(bound.rect);
    if (
      distance < nearestDistance - 0.0001 ||
      (Math.abs(distance - nearestDistance) <= 0.0001 && boundArea < nearestArea)
    ) {
      nearest = bound;
      nearestDistance = distance;
      nearestArea = boundArea;
    }
  }
  return nearestDistance <= maxDistance ? nearest : null;
}

export function deriveMaskBlobBounds({
  data,
  width,
  height,
  threshold = 0.32,
  mirrored = false,
  maxBlobs = 6,
  minAreaRatio = MIN_BLOB_AREA_RATIO,
}) {
  if (!data || !width || !height) return [];
  const visited = new Uint8Array(width * height);
  const minArea =
    minAreaRatio <= 0 ? 1 : Math.max(18, Math.floor(width * height * minAreaRatio));
  const blobs = [];
  const queue = [];

  for (let start = 0; start < data.length; start++) {
    if (visited[start] || (data[start] ?? 0) < threshold) continue;
    visited[start] = 1;
    queue.length = 0;
    queue.push(start);

    let areaPx = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const index = queue[cursor];
      const sourceX = index % width;
      const y = Math.floor(index / width);
      const x = mirrored ? width - 1 - sourceX : sourceX;
      areaPx++;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (ox === 0 && oy === 0) continue;
          const nx = sourceX + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || (data[next] ?? 0) < threshold) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
    }

    if (areaPx < minArea) continue;
    const rect = {
      x: clamp01(minX / width),
      y: clamp01(minY / height),
      w: clamp01((maxX + 1) / width) - clamp01(minX / width),
      h: clamp01((maxY + 1) / height) - clamp01(minY / height),
    };
    blobs.push({
      id: `mask-blob-${blobs.length}`,
      kind: 'mask_blob',
      label: blobs.length === 0 ? 'Body blob' : `Body blob ${blobs.length + 1}`,
      rect,
      anchor: {
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
      },
      confidence: Math.min(1, Math.max(0.2, areaPx / (width * height))),
      derivedFrom: ['segmentation_mask'],
    });
  }

  return blobs.sort((a, b) => area(b.rect) - area(a.rect)).slice(0, maxBlobs);
}

export function deriveObjectBounds({
  detections,
  videoWidth,
  videoHeight,
  mirrored = true,
  minScore = MIN_OBJECT_SCORE,
  includePerson = false,
}) {
  if (!Array.isArray(detections) || !videoWidth || !videoHeight) return [];
  const bounds = [];
  for (const detection of detections) {
    const category = detection.categories?.[0];
    const box = detection.boundingBox;
    const score = category?.score ?? 0;
    const rawLabel = category?.displayName || category?.categoryName || 'Object';
    const normalizedLabel = rawLabel.toLowerCase();
    if (!box || score < minScore) continue;
    if (!includePerson && IGNORED_OBJECT_LABELS.has(normalizedLabel)) continue;

    const w = clamp01(box.width / videoWidth);
    const h = clamp01(box.height / videoHeight);
    if (w < 0.02 || h < 0.02) continue;
    const sourceX = clamp01(box.originX / videoWidth);
    const x = mirrored ? clamp01(1 - sourceX - w) : sourceX;
    const y = clamp01(box.originY / videoHeight);
    const rect = {
      x: round6(x),
      y: round6(y),
      w: round6(Math.min(w, 1 - x)),
      h: round6(Math.min(h, 1 - y)),
    };
    const label = titleCase(rawLabel);
    bounds.push({
      id: `object-${slug(rawLabel)}-${bounds.length}`,
      kind: `object_${slug(rawLabel).replace(/-/g, '_')}`,
      label,
      rect,
      anchor: {
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2,
      },
      confidence: score,
      derivedFrom: ['object_detector'],
    });
  }
  return bounds;
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
