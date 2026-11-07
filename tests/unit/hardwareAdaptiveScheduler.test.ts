import assert from "node:assert/strict";
import test from "node:test";
import { planLocalModelDownloads } from "../../src/domain/localModelPackages.ts";
import {
  evaluateHardwareTier,
  evaluateVramWatermarkRisk,
  scheduleAdaptiveExecution,
} from "../../src/features/models/hardwareAdaptiveScheduler.ts";
import type { LocalHardwareReport } from "../../src/domain/localModelRecommendations.ts";

const GiB = 1024 ** 3;

function createMockReport(overrides: {
  vramDedicated?: number;
  vramFree?: number;
  hasCuda?: boolean;
  usableRam?: number;
  availableRam?: number;
}): LocalHardwareReport {
  return {
    version: 1,
    status: "supported",
    platform: "windows",
    measuredAtMs: Date.now(),
    cpu: { name: "AMD Ryzen 9 7950X", logicalCores: 32 },
    memory: {
      usableBytes: overrides.usableRam ?? 64 * GiB,
      availableBytes: overrides.availableRam ?? 48 * GiB,
    },
    os: { name: "Windows 11 Pro", architecture: "x86_64" },
    gpus: [
      {
        name: "NVIDIA GeForce RTX 4090",
        dedicatedBytes: overrides.vramDedicated ?? 24 * GiB,
        freeBytes: overrides.vramFree ?? 20 * GiB,
        driverVersion: "551.61",
        computeCapability: "8.9",
        computeBackend: (overrides.hasCuda ?? true) ? "cuda-reported" : null,
      },
    ],
    disks: [
      {
        drive: "C:",
        totalBytes: 1000 * GiB,
        freeBytes: 600 * GiB,
      },
    ],
    errors: [],
  };
}

test("evaluateHardwareTier identifies Ultra tier (24GB+ VRAM with CUDA)", () => {
  const report = createMockReport({ vramDedicated: 24 * GiB, hasCuda: true });
  const result = evaluateHardwareTier(report);
  assert.equal(result.tier, "ultra");
  assert.equal(result.hasCuda, true);
});

test("evaluateHardwareTier identifies Standard tier (12GB VRAM with CUDA)", () => {
  const report = createMockReport({ vramDedicated: 12 * GiB, hasCuda: true });
  const result = evaluateHardwareTier(report);
  assert.equal(result.tier, "standard");
});

test("evaluateHardwareTier identifies Lite tier (6GB VRAM with CUDA)", () => {
  const report = createMockReport({ vramDedicated: 6 * GiB, hasCuda: true });
  const result = evaluateHardwareTier(report);
  assert.equal(result.tier, "lite");
});

test("evaluateHardwareTier falls back to cpu-only when CUDA is absent or VRAM is 0", () => {
  const report = createMockReport({ vramDedicated: 8 * GiB, hasCuda: false });
  const result = evaluateHardwareTier(report);
  assert.equal(result.tier, "cpu-only");
});

test("evaluateVramWatermarkRisk correctly classifies low, medium and critical risks", () => {
  assert.equal(evaluateVramWatermarkRisk(18 * GiB, 24 * GiB), "low");
  assert.equal(evaluateVramWatermarkRisk(6 * GiB, 24 * GiB), "medium");
  assert.equal(evaluateVramWatermarkRisk(2 * GiB, 24 * GiB), "critical");
  assert.equal(evaluateVramWatermarkRisk(1 * GiB, 8 * GiB), "critical");
});

test("scheduleAdaptiveExecution matches canonical 27B package and Qwen-Image on Ultra hardware", () => {
  const report = createMockReport({
    vramDedicated: 24 * GiB,
    vramFree: 22 * GiB,
  });

  const chatResult = scheduleAdaptiveExecution({ type: "chat" }, report);
  assert.equal(chatResult.tier, "ultra");
  assert.equal(chatResult.executionTarget, "local-gpu");
  assert.equal(chatResult.recommendedModelId, "qwen3.8-27b-ud-q4-k-m");
  assert.ok(
    planLocalModelDownloads([chatResult.recommendedModelId]).downloadBytes > 0,
  );

  const imageResult = scheduleAdaptiveExecution({ type: "image" }, report);
  assert.equal(imageResult.executionTarget, "local-gpu");
  assert.equal(imageResult.recommendedModelId, "qwen-image-2.1-turbo");

  const videoResult = scheduleAdaptiveExecution({ type: "video" }, report);
  assert.equal(videoResult.executionTarget, "local-gpu");
  assert.equal(videoResult.recommendedModelId, "minimax-h3-16g-hifi-fl2va");
  assert.ok(
    planLocalModelDownloads([videoResult.recommendedModelId]).downloadBytes > 0,
  );
});

test("scheduleAdaptiveExecution matches canonical 9B package on Standard hardware", () => {
  const report = createMockReport({
    vramDedicated: 12 * GiB,
    vramFree: 10 * GiB,
  });

  const chatResult = scheduleAdaptiveExecution({ type: "chat" }, report);
  assert.equal(chatResult.tier, "standard");
  assert.equal(chatResult.recommendedModelId, "qwen3.5-9b-q4-k-m");
  assert.ok(
    planLocalModelDownloads([chatResult.recommendedModelId]).downloadBytes > 0,
  );

  const imageResult = scheduleAdaptiveExecution({ type: "image" }, report);
  assert.equal(imageResult.executionTarget, "cloud-gateway");
  assert.equal(imageResult.recommendedModelId, "cloud-imagen-3-fast");
});

test("scheduleAdaptiveExecution matches canonical 4B package and routes image to Cloud on Lite hardware", () => {
  const report = createMockReport({
    vramDedicated: 6 * GiB,
    vramFree: 5 * GiB,
  });

  const chatResult = scheduleAdaptiveExecution({ type: "chat" }, report);
  assert.equal(chatResult.tier, "lite");
  assert.equal(chatResult.recommendedModelId, "qwen3.5-4b-q4-k-m");
  assert.ok(
    planLocalModelDownloads([chatResult.recommendedModelId]).downloadBytes > 0,
  );

  const imageResult = scheduleAdaptiveExecution({ type: "image" }, report);
  assert.equal(imageResult.executionTarget, "cloud-gateway");
});

test("scheduleAdaptiveExecution triggers anti-OOM watermark protection under critical VRAM pressure", () => {
  const report = createMockReport({
    vramDedicated: 24 * GiB,
    vramFree: 1 * GiB,
    availableRam: 32 * GiB,
  });

  const result = scheduleAdaptiveExecution({ type: "chat" }, report);
  assert.equal(result.vramWatermarkRisk, "critical");
  assert.equal(result.autoOffloadToCpu, true);
  assert.equal(result.executionTarget, "local-cpu");
  assert.equal(result.recommendedModelId, "qwen3.5-4b-q4-k-m");
  assert.ok(
    planLocalModelDownloads([result.recommendedModelId]).downloadBytes > 0,
  );
  assert.ok(result.fallbackReason?.includes("防 OOM 保护"));
});

test("scheduleAdaptiveExecution routes to external bridge when Topaz or Photoshop is detected", () => {
  const report = createMockReport({
    vramDedicated: 12 * GiB,
    vramFree: 10 * GiB,
  });

  const upscaleResult = scheduleAdaptiveExecution(
    { type: "upscale" },
    report,
    (tool) => tool === "topaz",
  );
  assert.equal(upscaleResult.executionTarget, "external-bridge");
  assert.equal(upscaleResult.recommendedModelId, "topaz-gigapixel-ai");

  const outpaintResult = scheduleAdaptiveExecution(
    { type: "outpaint" },
    report,
    (tool) => tool === "photoshop",
  );
  assert.equal(outpaintResult.executionTarget, "external-bridge");
  assert.equal(outpaintResult.recommendedModelId, "adobe-photoshop-uxp");
});
