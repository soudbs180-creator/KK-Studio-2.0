import { z } from "zod";

export interface ShotBoundary {
  frameIndex: number;
  timestampSeconds: number;
  rgbDifferenceRatio: number;
  histogramDifferenceRatio: number;
  isCut: boolean;
}
export interface VideoFramePixels {
  pixels: Uint8ClampedArray;
  timestampSeconds: number;
}
const difference = z.object({
  rgbDiff: z.number().finite().min(0).max(1),
  histDiff: z.number().finite().min(0).max(1),
});

/** Normalized per-channel RGB distance and 16-bin/channel histogram distance. */
export function compareVideoFrames(
  before: Uint8ClampedArray,
  after: Uint8ClampedArray,
) {
  if (!before.length || before.length !== after.length || before.length % 4)
    throw new Error("视频帧尺寸不一致或为空");
  let delta = 0;
  const a = new Float64Array(48),
    b = new Float64Array(48);
  for (let i = 0; i < before.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      delta += Math.abs(before[i + c] - after[i + c]);
      a[c * 16 + (before[i + c] >> 4)]++;
      b[c * 16 + (after[i + c] >> 4)]++;
    }
  }
  const channels = (before.length / 4) * 3;
  return {
    rgbDiff: delta / (channels * 255),
    histDiff:
      a.reduce((sum, count, i) => sum + Math.abs(count - b[i]), 0) /
      (2 * channels),
  };
}

export function detectVideoShots(
  frames: ReadonlyArray<
    { rgbDiff: number; histDiff: number } | VideoFramePixels
  >,
  threshold = 0.45,
  fps = 24,
): ShotBoundary[] {
  z.number().finite().min(0).max(1).parse(threshold);
  z.number().finite().positive().max(1000).parse(fps);
  return frames.map((frame, index) => {
    const previous = frames[index - 1];
    const d =
      "pixels" in frame
        ? previous && "pixels" in previous
          ? compareVideoFrames(previous.pixels, frame.pixels)
          : { rgbDiff: 0, histDiff: 0 }
        : difference.parse(frame);
    const timestamp =
      "pixels" in frame
        ? frame.timestampSeconds
        : Number((index / fps).toFixed(2));
    z.number().finite().nonnegative().parse(timestamp);
    return {
      frameIndex: index,
      timestampSeconds: timestamp,
      rgbDifferenceRatio: d.rgbDiff,
      histogramDifferenceRatio: d.histDiff,
      isCut: 0.75 * d.rgbDiff + 0.25 * d.histDiff >= threshold,
    };
  });
}
