const DEFAULTS = {
  startPinchRatio: 0.32,
  heightPinchRatio: 0.42,
  minWidth: 0.08,
  minHeight: 0.08,
  heightScale: 0.9,
  minVisibleSize: 0.025,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function displayPoint(point, mirrored) {
  return {
    x: mirrored ? 1 - point.x : point.x,
    y: point.y,
  };
}

function rectFromWidth(anchor, current, options) {
  const rawWidth = Math.abs(current.x - anchor.x);
  const width = clamp(Math.max(options.minWidth, rawWidth), options.minVisibleSize, 1);
  const left =
    rawWidth < options.minWidth
      ? clamp(anchor.x - width / 2, 0, 1 - width)
      : clamp(Math.min(anchor.x, current.x), 0, 1 - width);
  const centerY = clamp(current.y, options.minHeight / 2, 1 - options.minHeight / 2);
  return {
    x: left,
    y: clamp(centerY - options.minHeight / 2, 0, 1 - options.minHeight),
    w: width,
    h: options.minHeight,
  };
}

function rectFromHandPair(left, right, options) {
  const x1 = Math.min(left.center.x, right.center.x);
  const x2 = Math.max(left.center.x, right.center.x);
  const rawWidth = x2 - x1;
  const width = clamp(Math.max(options.minWidth, rawWidth), options.minVisibleSize, 1);
  const centerX = (left.center.x + right.center.x) / 2;
  const centerY = clamp(
    (left.center.y + right.center.y) / 2,
    options.minHeight / 2,
    1 - options.minHeight / 2,
  );
  return {
    x: rawWidth < options.minWidth ? clamp(centerX - width / 2, 0, 1 - width) : clamp(x1, 0, 1 - width),
    y: clamp(centerY - options.minHeight / 2, 0, 1 - options.minHeight),
    w: width,
    h: options.minHeight,
  };
}

function pairFromHands(hands) {
  if (!Array.isArray(hands) || hands.length < 2) return null;
  const sorted = hands
    .filter(Boolean)
    .slice()
    .sort((a, b) => a.center.x - b.center.x);
  if (sorted.length < 2) return null;
  const left = sorted[0];
  const right = sorted[sorted.length - 1];
  return {
    left,
    right,
    pinchRatio: Math.max(left.pinchRatio, right.pinchRatio),
    openPalm: Boolean(left.openPalm || right.openPalm),
    center: {
      x: (left.center.x + right.center.x) / 2,
      y: (left.center.y + right.center.y) / 2,
    },
  };
}

function rectWithHeight(widthRect, centerY, pinchRatio, startRatio, options) {
  const heightGain = Math.max(0, pinchRatio - startRatio) * options.heightScale;
  const height = clamp(
    Math.max(options.minHeight, options.minHeight + heightGain),
    options.minVisibleSize,
    1,
  );
  const y = clamp(centerY - height / 2, 0, 1 - height);
  return {
    x: widthRect.x,
    y,
    w: widthRect.w,
    h: height,
  };
}

function canStart(input, options) {
  return input && input.pinchRatio <= options.startPinchRatio;
}

function canPairStart(pair, options) {
  return (
    pair &&
    pair.left.pinchRatio <= options.startPinchRatio &&
    pair.right.pinchRatio <= options.startPinchRatio
  );
}

function withOptions(options) {
  return { ...DEFAULTS, ...options };
}

export function initialWindowGestureState() {
  return { phase: 'idle', rect: null };
}

export function updateWindowGesture(previous, input, optionsArg = {}) {
  const options = withOptions(optionsArg);
  const state = previous ?? initialWindowGestureState();

  if (!input) return state.phase === 'locked' ? state : state;

  if (state.phase === 'idle') {
    if (!canStart(input, options)) return state;
    const rect = rectFromWidth(input.center, input.center, options);
    return {
      phase: 'sizingWidth',
      anchor: input.center,
      widthRect: rect,
      heightStartRatio: options.heightPinchRatio,
      centerY: input.center.y,
      rect,
    };
  }

  if (state.phase === 'locked') {
    if (!canStart(input, options)) return state;
    const rect = rectFromWidth(input.center, input.center, options);
    return {
      phase: 'sizingWidth',
      anchor: input.center,
      widthRect: rect,
      heightStartRatio: options.heightPinchRatio,
      centerY: input.center.y,
      rect,
    };
  }

  if (state.phase === 'sizingWidth') {
    const widthRect = rectFromWidth(state.anchor, input.center, options);
    if (input.openPalm) {
      return { phase: 'locked', rect: state.rect ?? widthRect };
    }
    if (input.pinchRatio >= options.heightPinchRatio) {
      const centerY = clamp(input.center.y, 0, 1);
      const rect = rectWithHeight(
        widthRect,
        centerY,
        input.pinchRatio,
        options.heightPinchRatio,
        options,
      );
      return {
        phase: 'sizingHeight',
        anchor: state.anchor,
        widthRect,
        heightStartRatio: options.heightPinchRatio,
        centerY,
        rect,
      };
    }
    return {
      ...state,
      widthRect,
      centerY: input.center.y,
      rect: widthRect,
    };
  }

  if (state.phase === 'sizingHeight') {
    if (input.openPalm) {
      return { phase: 'locked', rect: state.rect };
    }
    const centerY = state.centerY ?? input.center.y;
    const rect = rectWithHeight(
      state.widthRect,
      centerY,
      input.pinchRatio,
      state.heightStartRatio ?? options.heightPinchRatio,
      options,
    );
    return {
      ...state,
      rect,
    };
  }

  return state;
}

export function updateWindowGestureFromHands(previous, hands, optionsArg = {}) {
  const options = withOptions(optionsArg);
  const state = previous ?? initialWindowGestureState();
  const pair = pairFromHands(hands);

  if (!pair) return state;

  if (state.phase === 'idle' || state.phase === 'locked') {
    if (!canPairStart(pair, options)) return state;
    const rect = rectFromHandPair(pair.left, pair.right, options);
    return {
      phase: 'sizingWidth',
      widthRect: rect,
      heightStartRatio: options.heightPinchRatio,
      centerY: pair.center.y,
      rect,
    };
  }

  if (pair.openPalm) {
    return { phase: 'locked', rect: state.rect };
  }

  const widthRect = rectFromHandPair(pair.left, pair.right, options);
  const centerY = clamp(pair.center.y, 0, 1);

  if (state.phase === 'sizingWidth') {
    if (pair.pinchRatio >= options.heightPinchRatio) {
      const rect = rectWithHeight(
        widthRect,
        centerY,
        pair.pinchRatio,
        options.heightPinchRatio,
        options,
      );
      return {
        phase: 'sizingHeight',
        widthRect,
        heightStartRatio: options.heightPinchRatio,
        centerY,
        rect,
      };
    }
    return {
      ...state,
      widthRect,
      centerY,
      rect: widthRect,
    };
  }

  if (state.phase === 'sizingHeight') {
    const rect = rectWithHeight(
      widthRect,
      centerY,
      pair.pinchRatio,
      state.heightStartRatio ?? options.heightPinchRatio,
      options,
    );
    return {
      ...state,
      widthRect,
      centerY,
      rect,
    };
  }

  return state;
}

export function displayRectToVideoSourceRect(rect, video, options = {}) {
  const mirrored = options.mirrored ?? true;
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const sourceX = mirrored ? 1 - rect.x - rect.w : rect.x;
  const sx = clamp(sourceX * videoWidth, 0, videoWidth - 1);
  const sy = clamp(rect.y * videoHeight, 0, videoHeight - 1);
  const sw = clamp(rect.w * videoWidth, 1, videoWidth - sx);
  const sh = clamp(rect.h * videoHeight, 1, videoHeight - sy);
  return {
    sx: Math.floor(sx),
    sy: Math.floor(sy),
    sw: Math.ceil(sw),
    sh: Math.ceil(sh),
    flipX: mirrored,
  };
}

export function handGestureInputFromLandmarks(landmarks, options = {}) {
  if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
  const mirrored = options.mirrored ?? true;
  const thumb = landmarks[4];
  const index = landmarks[8];
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  if (!thumb || !index || !wrist || !middleMcp) return null;

  const handSize = dist(wrist, middleMcp);
  if (!Number.isFinite(handSize) || handSize <= 0) return null;

  const thumbDisplay = displayPoint(thumb, mirrored);
  const indexDisplay = displayPoint(index, mirrored);
  const center = {
    x: clamp((thumbDisplay.x + indexDisplay.x) / 2),
    y: clamp((thumbDisplay.y + indexDisplay.y) / 2),
  };
  const pinchRatio = dist(thumb, index) / handSize;

  const extended = [8, 12, 16, 20].reduce((count, tipIndex) => {
    const tip = landmarks[tipIndex];
    const pip = landmarks[tipIndex - 2];
    if (!tip || !pip) return count;
    return dist(wrist, tip) > dist(wrist, pip) * 1.08 ? count + 1 : count;
  }, 0);
  const openPalm =
    pinchRatio >= 0.78 &&
    extended >= 3 &&
    [8, 12, 16, 20].some((tipIndex) => dist(wrist, landmarks[tipIndex]) / handSize > 1.55);

  return {
    center,
    pinchRatio,
    openPalm,
  };
}
