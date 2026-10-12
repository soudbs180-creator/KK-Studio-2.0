import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKGROUND_MAX_SCALE,
  BACKGROUND_MIN_SCALE,
  backgroundScaleProgress,
  canvasPatternDotSize,
  canvasPatternGridLine,
  canvasPatternOpacity,
  canvasPatternPitch,
} from "../../src/domain/canvasViewport.ts";

const EPSILON = 1e-9;

function assertClose(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < EPSILON,
    `expected ${actual} to be within ${EPSILON} of ${expected}`,
  );
}

test("background pattern reaches its minimum and maximum at the range bounds", () => {
  const minPitch = canvasPatternPitch(BACKGROUND_MIN_SCALE);
  const maxPitch = canvasPatternPitch(BACKGROUND_MAX_SCALE);

  assert.equal(minPitch, 12);
  assert.equal(maxPitch, 96);
  assert.equal(backgroundScaleProgress(BACKGROUND_MIN_SCALE), 0);
  assert.equal(backgroundScaleProgress(BACKGROUND_MAX_SCALE), 1);
});

test("background pattern fades out completely at 50% zoom", () => {
  assert.equal(canvasPatternOpacity(BACKGROUND_MIN_SCALE), 0);
  assert.equal(canvasPatternOpacity(0.5), 0);
  // Anything below the floor stays hidden rather than lingering at a fixed size.
  assert.equal(canvasPatternOpacity(0.2), 0);
  assert.equal(canvasPatternOpacity(0), 0);
});

test("background pattern is fully opaque at the upper bound", () => {
  assert.equal(canvasPatternOpacity(BACKGROUND_MAX_SCALE), 1);
  // 100% is the default working zoom: the pattern must be fully legible there.
  assertClose(canvasPatternOpacity(1), 1);
  for (let step = 1; step <= 50; step += 1) {
    const scale = 1 + ((BACKGROUND_MAX_SCALE - 1) * step) / 50;
    assert.equal(canvasPatternOpacity(scale), 1);
  }
});

test("background pitch interpolates linearly with no jumps across the range", () => {
  const minPitch = canvasPatternPitch(BACKGROUND_MIN_SCALE);
  const maxPitch = canvasPatternPitch(BACKGROUND_MAX_SCALE);
  const span = BACKGROUND_MAX_SCALE - BACKGROUND_MIN_SCALE;
  const steps = 200;

  let previous = minPitch;
  for (let step = 1; step <= steps; step += 1) {
    const scale = BACKGROUND_MIN_SCALE + (span * step) / steps;
    const pitch = canvasPatternPitch(scale);
    const expected = minPitch + ((maxPitch - minPitch) * step) / steps;

    assertClose(pitch, expected);
    // Monotonic and strictly bounded by a tiny per-step delta: no discontinuity.
    assert.ok(pitch >= previous, `pitch must not decrease at scale ${scale}`);
    assert.ok(
      pitch - previous < (maxPitch - minPitch) / steps + EPSILON,
      `pitch jumped at scale ${scale}`,
    );
    previous = pitch;
  }
});

test("background pitch stays continuous across the legacy 49%/50% seam", () => {
  // The previous power-of-two coarsening jumped 23.52px -> 12px here.
  const before = canvasPatternPitch(0.49);
  const after = canvasPatternPitch(0.5);
  assert.ok(
    Math.abs(after - before) < 1,
    `pitch must stay continuous across 0.5, got ${before} then ${after}`,
  );
});

test("dot size and grid line track the zoom range", () => {
  assert.equal(canvasPatternDotSize(BACKGROUND_MIN_SCALE), 1);
  assert.equal(canvasPatternDotSize(BACKGROUND_MAX_SCALE), 8);
  assert.equal(canvasPatternGridLine(BACKGROUND_MIN_SCALE), 0.5);
  assert.equal(canvasPatternGridLine(BACKGROUND_MAX_SCALE), 1.5);

  // Dot diameter must stay smaller than the tile pitch, otherwise the tiling
  // overlaps and the background reads as a solid block instead of a lattice.
  for (let step = 0; step <= 100; step += 1) {
    const scale = BACKGROUND_MIN_SCALE + (span() * step) / 100;
    assert.ok(
      canvasPatternDotSize(scale) < canvasPatternPitch(scale),
      `dot must stay smaller than the tile at scale ${scale}`,
    );
    assert.ok(
      canvasPatternGridLine(scale) < canvasPatternPitch(scale),
      `grid line must stay smaller than the tile at scale ${scale}`,
    );
  }
});

test("background metrics ignore non-finite scales", () => {
  assert.equal(canvasPatternPitch(Number.NaN), 96);
  assert.equal(canvasPatternDotSize(Number.NaN), 8);
  assert.equal(canvasPatternOpacity(Number.NaN), 0);
});

function span(): number {
  return BACKGROUND_MAX_SCALE - BACKGROUND_MIN_SCALE;
}
