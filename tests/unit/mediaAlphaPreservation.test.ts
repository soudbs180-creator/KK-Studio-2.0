import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAdaptiveResize,
  detectAlphaTransparency,
  resolveTargetImageMime,
} from "../../src/features/creation/mediaAlphaPreservation.ts";
import { resolveImageAttachments } from "../../src/features/creation/resolveAttachments.ts";
import { imageResultContext } from "../../src/features/image-edit/context.ts";
import type {
  CreationAttachment,
  CreationTask,
} from "../../src/features/creation/model.ts";
import type { StoredGeneratedAsset } from "../../src/features/creation/assetRepository.ts";

test("resolveTargetImageMime rejects image/jpeg when alpha exists", () => {
  // When alpha exists, JPEG MUST NEVER be selected as it creates black matte artifacts
  assert.equal(
    resolveTargetImageMime(true, "image/jpeg"),
    "image/png",
    "Should reject image/jpeg and fallback to image/png when alpha exists",
  );
  assert.equal(
    resolveTargetImageMime(true, "image/jpg"),
    "image/png",
    "Should reject image/jpg and fallback to image/png when alpha exists",
  );
  // WebP supports alpha and is allowed if requested
  assert.equal(
    resolveTargetImageMime(true, "image/webp"),
    "image/webp",
    "Should allow image/webp when alpha exists",
  );
  // PNG supports alpha and is allowed
  assert.equal(
    resolveTargetImageMime(true, "image/png"),
    "image/png",
    "Should allow image/png when alpha exists",
  );
  // Default without preferredMime when alpha exists must be image/png
  assert.equal(
    resolveTargetImageMime(true),
    "image/png",
    "Should default to image/png when alpha exists",
  );
});

test("resolveTargetImageMime allows image/jpeg or image/webp when no alpha exists", () => {
  assert.equal(
    resolveTargetImageMime(false, "image/jpeg"),
    "image/jpeg",
    "Should allow image/jpeg when no alpha exists",
  );
  assert.equal(
    resolveTargetImageMime(false, "image/webp"),
    "image/webp",
    "Should allow image/webp when no alpha exists",
  );
  assert.equal(
    resolveTargetImageMime(false, "image/png"),
    "image/png",
    "Should allow image/png when explicitly requested even without alpha",
  );
  assert.equal(
    resolveTargetImageMime(false),
    "image/jpeg",
    "Should default to image/jpeg when no alpha exists",
  );
});

test("calculateAdaptiveResize preserves exact aspect ratio across panoramic, banner, and square", () => {
  // 1. Panoramic (width > height)
  const panoramic = calculateAdaptiveResize(3840, 1080, 1920);
  assert.equal(panoramic.width, 1920, "Longest edge clamped to maxEdge");
  assert.equal(panoramic.height, 540, "Height scaled with exact ratio");
  assert.equal(
    panoramic.width / panoramic.height,
    3840 / 1080,
    "Exact aspect ratio must be preserved for panoramic",
  );

  // 2. Banner / Vertical banner (height > width)
  const banner = calculateAdaptiveResize(1080, 3840, 1920);
  assert.equal(banner.width, 540, "Width scaled with exact ratio");
  assert.equal(banner.height, 1920, "Longest edge clamped to maxEdge");
  assert.equal(
    banner.width / banner.height,
    1080 / 3840,
    "Exact aspect ratio must be preserved for vertical banner",
  );

  // 3. Square (width === height)
  const square = calculateAdaptiveResize(2048, 2048, 1024);
  assert.equal(square.width, 1024);
  assert.equal(square.height, 1024);
  assert.equal(square.width / square.height, 1);

  // 4. Smaller than maxEdge: stays unchanged
  const smaller = calculateAdaptiveResize(800, 600, 1024);
  assert.equal(smaller.width, 800);
  assert.equal(smaller.height, 600);

  // 5. Extreme panoramic: 6000x1000 clamped to 3000
  const extremePano = calculateAdaptiveResize(6000, 1000, 3000);
  assert.equal(extremePano.width, 3000);
  assert.equal(extremePano.height, 500);
  assert.equal(extremePano.width / extremePano.height, 6);

  // 6. Invalid inputs throw
  assert.throws(() => calculateAdaptiveResize(-10, 100, 500));
  assert.throws(() => calculateAdaptiveResize(100, 0, 500));
  assert.throws(() => calculateAdaptiveResize(100, 100, -50));
});

test("detectAlphaTransparency correctly identifies transparent vs opaque buffers", () => {
  // Test with Buffer
  // 1. Fully opaque 2-pixel buffer (RGBA: [R, G, B, 255, R, G, B, 255])
  const opaqueBuffer = Buffer.from([255, 0, 0, 255, 0, 255, 0, 255]);
  assert.equal(
    detectAlphaTransparency(opaqueBuffer),
    false,
    "Buffer with alpha 255 should be identified as opaque",
  );

  // 2. Threshold boundary: alpha = 250 is considered opaque (requirement: alpha < 250)
  const boundaryBuffer = Buffer.from([100, 100, 100, 250]);
  assert.equal(
    detectAlphaTransparency(boundaryBuffer),
    false,
    "Alpha = 250 should not trigger transparency",
  );

  // 3. Just below threshold: alpha = 249 is considered transparent
  const slightlyTransparent = Buffer.from([100, 100, 100, 249]);
  assert.equal(
    detectAlphaTransparency(slightlyTransparent),
    true,
    "Alpha = 249 should trigger transparency",
  );

  // 4. Fully transparent pixel: alpha = 0
  const fullyTransparent = Buffer.from([0, 0, 0, 255, 0, 0, 0, 0]);
  assert.equal(
    detectAlphaTransparency(fullyTransparent),
    true,
    "Alpha = 0 should trigger transparency",
  );

  // 5. Semi-transparent pixel: alpha = 128
  const semiTransparent = Buffer.from([20, 40, 60, 128]);
  assert.equal(
    detectAlphaTransparency(semiTransparent),
    true,
    "Alpha = 128 should trigger transparency",
  );

  // Test with Uint8ClampedArray (Canvas ImageData representation)
  const opaqueClamped = new Uint8ClampedArray([
    255, 255, 255, 255, 10, 20, 30, 255,
  ]);
  assert.equal(detectAlphaTransparency(opaqueClamped), false);

  const transparentClamped = new Uint8ClampedArray([
    255, 255, 255, 255, 10, 20, 30, 100,
  ]);
  assert.equal(detectAlphaTransparency(transparentClamped), true);
});

test("resolveImageAttachments retains originalAssetId and preserves alpha MIME", async () => {
  const rootAssetId = "asset-0123456789abcdef01234567";
  const derivedAssetId = "asset-89abcdef0123456789abcdef";

  const rootAsset: StoredGeneratedAsset = {
    assetId: rootAssetId,
    preview:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
    sha256: "0123456789abcdef01234567".padEnd(64, "0"),
    mime: "image/png",
    tags: ["原图"],
    provenance: { generatedAt: "2026-10-16T00:00:00.000Z" },
  };

  const derivedAsset: StoredGeneratedAsset = {
    assetId: derivedAssetId,
    parentId: rootAssetId, // Chained from root
    preview:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==",
    sha256: "89abcdef0123456789abcdef".padEnd(64, "0"),
    mime: "image/png",
    tags: ["编辑输出"],
    provenance: { generatedAt: "2026-10-16T00:01:00.000Z" },
  };

  const read = async (id: string) => {
    if (id === rootAssetId) return rootAsset;
    if (id === derivedAssetId) return derivedAsset;
    return null;
  };

  const attachments: CreationAttachment[] = [
    {
      id: "att-1",
      assetId: derivedAssetId,
      name: "derived.png",
      mime: "image/jpeg", // Mistakenly set to JPEG for an image with PNG data
      size: 100,
    },
  ];

  const resolved = await resolveImageAttachments(attachments, read);
  assert.equal(resolved.length, 1);
  // Must preserve PNG MIME to prevent alpha degradation
  assert.equal(resolved[0].mime, "image/png");
  // Must retain original root asset id across generational edits
  assert.equal(
    resolved[0].originalAssetId,
    rootAssetId,
    "Should retain root assetId from parentId to prevent generational compression loss",
  );
});

test("imageResultContext retains root originalAssetId across successive edit tasks", () => {
  const rootAssetId = "asset-0123456789abcdef01234567";
  const gen1AssetId = "asset-111111111111111111111111";
  const gen2AssetId = "asset-222222222222222222222222";

  // Task 1: First edit from root
  const task1: CreationTask = {
    id: "task-1",
    kind: "image",
    prompt: "Edit 1",
    model: "test-model",
    status: "succeeded",
    attachments: [
      {
        id: "att-0",
        assetId: rootAssetId,
        name: "root.png",
        mime: "image/png",
        size: 50,
      },
    ],
    submissionState: "terminal",
    outputs: [
      {
        index: 0,
        status: "succeeded",
        model: "test-model",
        assetId: gen1AssetId,
        createdAt: Date.now(),
      },
    ],
    createdAt: Date.now(),
  };

  const contextGen1 = imageResultContext(task1, gen1AssetId);
  assert.equal(contextGen1.originalAssetId, gen1AssetId);

  // Task 2: Second derived edit with existing imageEditContext pointing to root
  const task2: CreationTask = {
    ...task1,
    id: "task-2",
    prompt: "Edit 2",
    imageEditContext: {
      originalPrompt: "Root prompt",
      originalAssetId: rootAssetId, // Preserved root asset
      referenceAssetIds: [rootAssetId],
      lastInstruction: "Edit 1",
    },
  };

  const contextGen2 = imageResultContext(task2, gen2AssetId);
  assert.equal(
    contextGen2.originalAssetId,
    rootAssetId,
    "Chained edits must retain the original root assetId",
  );
});
