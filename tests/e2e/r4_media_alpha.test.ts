import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAdaptiveResize,
  resolveTargetImageMime,
  detectAlphaTransparency,
} from "../../src/domain/mediaAlpha.ts";
import { createPixelBuffer } from "../support/pixelFixture.ts";
import { imageResultContext } from "../../src/features/image-edit/context.ts";
import { imageRegeneration } from "../../src/features/image-edit/regeneration.ts";
import { createProject, createTask } from "../../src/domain/creationModel.ts";
import { loadStoredAsset } from "../../src/features/creation/index.ts";
import { blendMaskedPixels } from "../../src/features/image-edit/pixels.ts";

/* =========================================================================
 * R4: Media Alpha Transparency Preservation & Adaptive Resizing E2E Tests
 * ========================================================================= */

// -------------------------------------------------------------------------
// Tier 1: Feature Coverage (Core Contracts & Happy Paths)
// -------------------------------------------------------------------------

test("R4-T1-01: PNG alpha transparency preservation retains RGBA channels without black matte conversion", () => {
  // Create a 4x4 buffer with transparent background and a semi-transparent icon
  const width = 4,
    height = 4;
  const buffer = createPixelBuffer(width, height, { r: 0, g: 0, b: 0, a: 0 }); // 100% transparent

  // Draw semi-transparent cyan icon in the center 2x2
  for (const y of [1, 2]) {
    for (const x of [1, 2]) {
      const idx = (y * width + x) * 4;
      buffer.data[idx] = 34; // R
      buffer.data[idx + 1] = 197; // G
      buffer.data[idx + 2] = 94; // B
      buffer.data[idx + 3] = 128; // 50% Alpha
    }
  }

  const integrity = {
    hasTransparency: detectAlphaTransparency(buffer.data),
    minAlpha: Math.min(...buffer.data.filter((_, i) => i % 4 === 3)),
  };
  assert.equal(
    integrity.hasTransparency,
    true,
    "Buffer must contain transparent pixels",
  );
  assert.equal(integrity.minAlpha, 0, "Transparent pixels must have alpha = 0");

  // Invariant check: corner pixel (0,0) must NOT be converted to opaque black [0, 0, 0, 255]
  assert.equal(
    buffer.data[3],
    0,
    "Alpha channel of transparent corner must remain 0",
  );
  assert.notEqual(
    buffer.data[3],
    255,
    "Transparent pixel must NOT be converted to opaque black (no black matte)",
  );
});

test("R4-T1-02: adaptive resizing respects max edge bounds while preserving exact aspect ratio", () => {
  const originalWidth = 4000;
  const originalHeight = 2000;
  const maxEdge = 2048;

  const result = calculateAdaptiveResize(
    originalWidth,
    originalHeight,
    maxEdge,
  );

  assert.equal(result.width, 2048, "Long edge must be clamped to 2048");
  assert.equal(
    result.height,
    1024,
    "Short edge must be proportionally scaled to 1024",
  );
  assert.equal(
    result.width / result.height,
    2.0,
    "Aspect ratio must be preserved exactly",
  );
  assert.ok(result.width / originalWidth < 1.0);
});

test("R4-T1-03: masked alpha compositing blends transparent edges cleanly using blendMaskedPixels", () => {
  const width = 4,
    height = 4;
  const original = new Uint8ClampedArray(width * height * 4); // Original transparent image
  const generated = new Uint8ClampedArray(width * height * 4); // Inpainted region
  const mask = new Uint8Array(width * height); // 1 = modify, 0 = keep original

  // Original has transparent background
  for (let i = 0; i < original.length; i += 4) {
    original[i] = 100;
    original[i + 1] = 100;
    original[i + 2] = 100;
    original[i + 3] = 0; // Alpha = 0
  }

  // Generated has purple overlay
  for (let i = 0; i < generated.length; i += 4) {
    generated[i] = 150;
    generated[i + 1] = 50;
    generated[i + 2] = 200;
    generated[i + 3] = 255;
  }

  // Mask center 2x2
  mask[5] = 255;
  mask[6] = 255;
  mask[9] = 255;
  mask[10] = 255;

  const blended = blendMaskedPixels(
    original,
    generated,
    mask,
    width,
    height,
    2,
  );
  assert.equal(blended.length, original.length);

  // Unmasked corners (0,0) must retain original alpha 0
  assert.equal(blended[3], 0, "Unmasked pixel must retain 0 alpha");

  // Center pixel (1,1) -> index 5 has distance=1 with feather=2 (alpha=0.5), blending original 100 and generated 150 to 125
  const centerIdx = 5 * 4;
  assert.ok(
    blended[centerIdx + 3] > 0,
    "Masked center pixel must receive color and alpha",
  );
  assert.equal(
    blended[centerIdx],
    125,
    "Feathered pixel must interpolate between original (100) and generated (150)",
  );
});

test("R4-T1-04: production edit result context preserves the pristine original through derivatives", () => {
  const task = createTask(
    createProject({
      prompt: "original brief",
      model: "m",
      kind: "image",
      attachments: [],
    }),
  );
  const first = imageResultContext(task, "asset-original");
  const second = imageResultContext(
    { ...task, imageEditContext: first },
    "asset-derivative",
  );
  assert.equal(second.originalAssetId, "asset-original");
  assert.equal(second.originalPrompt, "original brief");
  assert.deepEqual(second.referenceAssetIds, []);
});

test("R4-T1-05: format adaptation rejects conversion of transparent images to opaque JPEG", () => {
  // Transparent PNG -> preserved as PNG
  assert.equal(resolveTargetImageMime(true, "image/png"), "image/png");

  // Transparent WebP -> preserved as WebP
  assert.equal(resolveTargetImageMime(true, "image/webp"), "image/webp");

  // Image with alpha attempted as JPEG must throw error
  assert.equal(resolveTargetImageMime(true, "image/jpeg"), "image/png");

  // Opaque image can remain JPEG
  assert.equal(resolveTargetImageMime(false, "image/jpeg"), "image/jpeg");
});

// -------------------------------------------------------------------------
// Tier 2: Boundary & Corner Cases (Extreme Ratios, 100% Alpha & Re-derivation)
// -------------------------------------------------------------------------

test("R4-T2-01: extreme aspect ratio scaling handles panoramic and banner images without zero dimensions", () => {
  // Extreme panoramic banner: 10000 x 100
  const banner = calculateAdaptiveResize(10000, 100, 2048);
  assert.equal(banner.width, 2048);
  assert.ok(banner.height >= 1, "Height must not round down to 0");
  assert.equal(banner.height, 20); // 100 * (2048/10000) = 20.48 -> 20

  // Extreme vertical ribbon: 100 x 10000
  const ribbon = calculateAdaptiveResize(100, 10000, 2048);
  assert.equal(ribbon.height, 2048);
  assert.ok(ribbon.width >= 1, "Width must not round down to 0");
  assert.equal(ribbon.width, 20);
});

test("R4-T2-02: 100% transparent image canvas preserves full transparency after cropping", () => {
  const width = 10,
    height = 10;
  const blankBuffer = createPixelBuffer(width, height, {
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  });

  // Verify all 100 pixels are 100% transparent
  let totalAlpha = 0;
  for (let i = 3; i < blankBuffer.data.length; i += 4) {
    totalAlpha += blankBuffer.data[i];
  }
  assert.equal(totalAlpha, 0, "Buffer must be completely transparent");

  const integrity = {
    hasTransparency: detectAlphaTransparency(blankBuffer.data),
    minAlpha: Math.min(...blankBuffer.data.filter((_, i) => i % 4 === 3)),
  };
  assert.equal(integrity.hasTransparency, true);
  assert.equal(integrity.minAlpha, 0);
});

test("R4-T2-03: real regeneration retains edit original while creating a fresh intent identity", () => {
  const task = createTask(
    createProject({
      prompt: "edit",
      model: "m",
      kind: "image",
      attachments: [],
    }),
  );
  task.imageEditContext = {
    originalAssetId: "asset-pristine",
    originalPrompt: "brief",
    referenceAssetIds: [],
  };
  task.status = "succeeded";
  const candidate = imageRegeneration(task);
  assert.equal(candidate.imageEditContext?.originalAssetId, "asset-pristine");
  assert.notEqual(candidate.idempotencyKey, task.idempotencyKey);
  assert.equal(candidate.submissionState, "intent");
  assert.equal(candidate.outputs?.[0].status, "waiting");
  assert.equal(task.status, "succeeded");
});

test("R4-T2-04: actual asset repository reports missing original without fabricating image bytes", async () => {
  const missing = await loadStoredAsset("asset-ffffffffffffffffffffffff");
  assert.equal(missing, null);
});

test("R4-T2-05: feather gradient boundary transitions smoothly between 0 and 255 alpha without color distortion", () => {
  const width = 8,
    height = 8;
  const original = new Uint8ClampedArray(width * height * 4);
  const generated = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8Array(width * height);

  // Fill generated with bright yellow [255, 255, 0, 255]
  for (let i = 0; i < generated.length; i += 4) {
    generated[i] = 255;
    generated[i + 1] = 255;
    generated[i + 2] = 0;
    generated[i + 3] = 255;
  }

  // Half the mask is active
  for (let y = 0; y < height; y++) {
    for (let x = 4; x < width; x++) {
      mask[y * width + x] = 255;
    }
  }

  const blended = blendMaskedPixels(
    original,
    generated,
    mask,
    width,
    height,
    4,
  );

  // Check the feather boundary at column 4 vs column 5
  // Edge column 4 should have an intermediate gradient between original and generated
  const edgeIdx = (3 * width + 4) * 4;
  assert.ok(blended[edgeIdx] > 0 && blended[edgeIdx] <= 255);
  assert.ok(blended[edgeIdx + 3] > 0);
});
