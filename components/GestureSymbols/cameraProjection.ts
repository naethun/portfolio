export interface FrameSize {
  width: number;
  height: number;
}

export interface VideoSize {
  width: number;
  height: number;
}

export interface Point2 {
  x: number;
  y: number;
}

function hasPositiveSize(size: FrameSize | VideoSize): boolean {
  return size.width > 0 && size.height > 0;
}

export function mediaPipeToCoveredFramePoint(
  point: Point2,
  video: VideoSize,
  frame: FrameSize,
  mirrored: boolean
): Point2 {
  if (!hasPositiveSize(video) || !hasPositiveSize(frame)) {
    return { x: 0, y: 0 };
  }

  const displayedX = mirrored ? 1 - point.x : point.x;
  const coverScale = Math.max(frame.width / video.width, frame.height / video.height);
  const coveredWidth = video.width * coverScale;
  const coveredHeight = video.height * coverScale;
  const offsetX = (frame.width - coveredWidth) / 2;
  const offsetY = (frame.height - coveredHeight) / 2;

  return {
    x: offsetX + displayedX * coveredWidth,
    y: offsetY + point.y * coveredHeight,
  };
}

export function framePointToWorld(
  point: Point2,
  frame: FrameSize,
  worldHeight: number
): Point2 {
  if (!hasPositiveSize(frame) || worldHeight <= 0) return { x: 0, y: 0 };
  const worldWidth = worldHeight * (frame.width / frame.height);

  return {
    x: (point.x / frame.width - 0.5) * worldWidth,
    y: (0.5 - point.y / frame.height) * worldHeight,
  };
}
