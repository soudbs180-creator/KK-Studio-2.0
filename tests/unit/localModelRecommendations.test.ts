import assert from "node:assert/strict";
import test from "node:test";
import {
  localHardwareReportSchema,
  recommendLocalModels,
  type LocalHardwareReport,
} from "../../src/domain/localModelRecommendations.ts";

const GiB = 1024 ** 3;
const now = 1_800_000_000_000;
function hardware(): LocalHardwareReport {
  return {
    version: 1,
    status: "supported",
    platform: "windows",
    measuredAtMs: now,
    cpu: { name: "Intel Core Ultra 7 270K Plus", logicalCores: 24 },
    memory: { usableBytes: 63.5 * GiB, availableBytes: 40 * GiB },
    os: { name: "Microsoft Windows 11", architecture: "x86_64" },
    gpus: [
      {
        name: "NVIDIA GeForce RTX 5080",
        dedicatedBytes: 16303 * 1024 ** 2,
        freeBytes: 9743 * 1024 ** 2,
        driverVersion: "610.88",
        computeCapability: "12.0",
        computeBackend: "cuda-reported",
      },
    ],
    disks: [{ drive: "D:", totalBytes: 1024 * GiB, freeBytes: 668 * GiB }],
    errors: [],
  };
}
const options = { diskDrive: "D:", nowMs: now };

test("64GB/16GB measured fixture prefers 9B with headroom, never 27B full GPU", () => {
  const result = recommendLocalModels(hardware(), options);
  assert.equal(result.preferredId, "qwen3.5-9b-q4-k-m");
  assert.deepEqual(
    result.profiles.map((p) => p.model.id),
    ["qwen3.5-9b-q4-k-m", "qwen3.5-4b-q4-k-m", "qwen3.8-27b-ud-q4-k-m"],
  );
  assert.equal(result.profiles[2].status, "optional");
  assert.equal(result.profiles[2].execution, "cpu-offload");
  assert.equal(result.profiles[0].contextTokens, 8192);
  assert.equal(result.profiles[1].contextTokens, 4096);
  assert.ok(result.profiles.every((p) => p.slots === 1));
  assert.ok(result.profiles.every((p) => p.evidence === "estimate"));
  assert.ok(result.profiles.every((p) => p.runtimeAcceptance === "unverified"));
  assert.equal(result.manualSelectionAllowed, true);
  assert.equal(result.installationValidationRequired, true);
});

test("current free VRAM controls selection; capacity cannot make busy 16GB fit", () => {
  const report = hardware();
  report.gpus[0].freeBytes = 7 * GiB;
  const result = recommendLocalModels(report, options);
  assert.equal(result.preferredId, "qwen3.5-4b-q4-k-m");
  assert.ok(result.profiles[0].reasons.includes("insufficient-free-vram"));
  report.gpus[0].freeBytes = 3 * GiB;
  assert.equal(recommendLocalModels(report, options).preferredId, null);
});

test("unknown GPU/free memory and stale snapshots stay unknown", () => {
  for (const change of [
    (r: LocalHardwareReport) => (r.gpus = []),
    (r: LocalHardwareReport) => (r.gpus[0].freeBytes = null),
    (r: LocalHardwareReport) => (r.memory = null),
    (r: LocalHardwareReport) => (r.measuredAtMs = now - 60_001),
    (r: LocalHardwareReport) => (r.measuredAtMs = now + 5_001),
  ]) {
    const report = hardware();
    change(report);
    const result = recommendLocalModels(report, options);
    assert.equal(result.preferredId, null);
    assert.ok(result.profiles.every((p) => p.status === "unknown"));
  }
});

test("RAM and selected-drive staging space are required, zero stays real zero", () => {
  const report = hardware();
  report.memory!.availableBytes = 0;
  assert.ok(
    recommendLocalModels(report, options).profiles.every((p) =>
      p.reasons.includes("insufficient-free-ram"),
    ),
  );
  report.memory!.availableBytes = 40 * GiB;
  report.disks[0].freeBytes = 0;
  assert.equal(recommendLocalModels(report, options).preferredId, null);
  assert.ok(
    recommendLocalModels(report, options).profiles.every((p) =>
      p.reasons.includes("insufficient-disk"),
    ),
  );
  assert.equal(
    recommendLocalModels(hardware(), { ...options, diskDrive: "C:" })
      .preferredId,
    null,
  );
});

test("large CPU fallback remains optional even when smaller GPU profiles cannot fit", () => {
  const report = hardware();
  report.gpus[0].freeBytes = 6 * GiB;
  const result = recommendLocalModels(report, options);
  assert.equal(result.preferredId, null);
  assert.equal(result.profiles[2].status, "optional");
});

test("untrusted reports reject invalid, overflow, NaN and inconsistent resources", () => {
  const invalid = [null, {}, { ...hardware(), measuredAtMs: NaN }];
  for (const value of [-1, Infinity, Number.MAX_SAFE_INTEGER + 1, 1.5]) {
    invalid.push({
      ...hardware(),
      memory: { usableBytes: value, availableBytes: 0 },
    });
  }
  invalid.push(
    { ...hardware(), memory: { usableBytes: GiB, availableBytes: 2 * GiB } },
    {
      ...hardware(),
      gpus: [
        {
          ...hardware().gpus[0],
          name: "GPU",
          dedicatedBytes: null,
          freeBytes: GiB,
        },
      ],
    },
    {
      ...hardware(),
      gpus: [
        {
          ...hardware().gpus[0],
          name: "GPU",
          dedicatedBytes: GiB,
          freeBytes: 2 * GiB,
        },
      ],
    },
    {
      ...hardware(),
      disks: [{ drive: "C:\\private", totalBytes: GiB, freeBytes: 0 }],
    },
    {
      ...hardware(),
      disks: [{ drive: "D:", totalBytes: GiB, freeBytes: 2 * GiB }],
    },
    { ...hardware(), cpu: { name: "CPU\nprivate", logicalCores: 24 } },
  );
  for (const report of invalid) {
    assert.equal(localHardwareReportSchema.safeParse(report).success, false);
    assert.throws(() => recommendLocalModels(report, options));
  }
  assert.throws(() =>
    recommendLocalModels(hardware(), { ...options, nowMs: NaN }),
  );
});

test("disk/input order and duplicate GPU capacity do not change deterministic choice", () => {
  const report = hardware();
  report.gpus.push({
    name: "Unknown integrated GPU",
    dedicatedBytes: null,
    freeBytes: null,
    driverVersion: null,
    computeCapability: null,
    computeBackend: null,
  });
  report.disks.push({
    drive: "C:",
    totalBytes: 512 * GiB,
    freeBytes: 300 * GiB,
  });
  const first = recommendLocalModels(report, options);
  report.gpus.reverse();
  report.disks.reverse();
  assert.deepEqual(recommendLocalModels(report, options), first);
  report.gpus = [
    {
      ...report.gpus[0],
      name: "small-a",
      dedicatedBytes: 8 * GiB,
      freeBytes: 5 * GiB,
    },
    {
      ...report.gpus[0],
      name: "small-b",
      dedicatedBytes: 8 * GiB,
      freeBytes: 5 * GiB,
    },
  ];
  assert.equal(recommendLocalModels(report, options).preferredId, null);
});

test("all chat candidates pin source/license and separate vision from image/Agent acceptance", () => {
  const result = recommendLocalModels(hardware(), options);
  assert.equal(result.profiles[0].model.mainBytes, 5_680_522_464);
  assert.equal(result.profiles[0].model.visionBytes, 918_166_080);
  for (const profile of result.profiles) {
    assert.match(profile.model.revision, /^[a-f0-9]{40}$/);
    assert.equal(profile.model.license, "Apache-2.0");
    assert.equal(profile.engine, "llama.cpp");
    assert.equal(profile.model.imageGeneration, false);
    assert.equal(profile.toolAcceptance, "unverified");
    assert.ok(profile.requiredFreeVramBytes > profile.estimatedVramBytes);
    assert.ok(profile.requiredFreeRamBytes > profile.estimatedRamBytes);
    assert.ok(
      profile.requiredDiskBytes >
        profile.model.mainBytes + profile.model.visionBytes,
    );
  }
  assert.equal(result.agentFramework.kind, "framework");
  assert.ok(
    result.experimental.every((p) => p.runtimeAcceptance === "unverified"),
  );
  assert.equal(result.experimental[0].weightBytes, 32_440_133_648);
  assert.equal(result.experimental[0].license, "Qwen Research License");
});

test("driver and reported compute metadata remain nullable and never imply runtime acceptance", () => {
  const report = hardware();
  assert.equal(
    localHardwareReportSchema.parse(report).gpus[0].driverVersion,
    "610.88",
  );
  for (const invalid of ["driver\nprivate", "latest", "610", "610.88.exe"]) {
    assert.equal(
      localHardwareReportSchema.safeParse({
        ...report,
        gpus: [{ ...report.gpus[0], driverVersion: invalid }],
      }).success,
      false,
    );
  }
  assert.equal(
    localHardwareReportSchema.safeParse({
      ...report,
      gpus: [{ ...report.gpus[0], computeCapability: "12.0;execute" }],
    }).success,
    false,
  );
  report.gpus[0].driverVersion = null;
  report.gpus[0].computeCapability = null;
  report.gpus[0].computeBackend = null;
  assert.equal(
    recommendLocalModels(report, options).profiles[0].runtimeAcceptance,
    "unverified",
  );
});

test("a busy 16GB PC can be an H3 installation candidate without being ready to run", () => {
  const report = hardware();
  report.gpus[0].freeBytes = 3 * GiB;
  const result = recommendLocalModels(report, options);
  const h3 = result.videoPackages.find(
    (p) => p.id === "minimax-h3-16g-hifi-fl2va",
  )!;
  assert.equal(h3.capacityStatus, "candidate");
  assert.equal(h3.runtimeAcceptance, "unverified");
  assert.ok(h3.warnings.includes("busy-gpu"));
  assert.equal(h3.downloadBytes, 64_730_399_025);
  assert.equal(h3.canStart, false);
  assert.equal(result.manualSelectionAllowed, true);
});

test("H3 capacity is per GPU, independent of current free memory and never sums cards", () => {
  const report = hardware();
  report.gpus = [
    { ...report.gpus[0], dedicatedBytes: 8 * GiB, freeBytes: 7 * GiB },
    { ...report.gpus[0], dedicatedBytes: 8 * GiB, freeBytes: 7 * GiB },
  ];
  const result = recommendLocalModels(report, options);
  assert.ok(
    result.videoPackages.every((p) => p.capacityStatus === "below-guidance"),
  );
  report.gpus[0].dedicatedBytes = 16 * GiB;
  report.memory!.usableBytes = 24 * GiB;
  report.memory!.availableBytes = 20 * GiB;
  assert.ok(
    recommendLocalModels(report, options).videoPackages.every(
      (p) => p.capacityStatus === "below-guidance",
    ),
  );
});

test("H3 disk, stale and missing probes remain distinct from author hardware guidance", () => {
  const report = hardware();
  report.disks[0].freeBytes = 20 * GiB;
  let result = recommendLocalModels(report, options);
  assert.equal(result.videoPackages[0].capacityStatus, "candidate");
  assert.equal(result.videoPackages[0].installationSpace, "insufficient");
  report.measuredAtMs = now - 60_001;
  result = recommendLocalModels(report, options);
  assert.ok(result.videoPackages.every((p) => p.capacityStatus === "unknown"));
  assert.ok(result.videoPackages.every((p) => p.canStart === false));
});

test("unknown free VRAM does not erase known H3 capacity or pretend runtime readiness", () => {
  const report = hardware();
  report.gpus[0].freeBytes = null;
  const result = recommendLocalModels(report, options);
  assert.equal(result.preferredId, null);
  assert.equal(result.videoPackages[0].capacityStatus, "candidate");
  assert.ok(result.videoPackages[0].warnings.includes("unknown-current-vram"));
  assert.equal(result.videoPackages[0].canStart, false);
  report.gpus = [];
  assert.ok(
    recommendLocalModels(report, options).videoPackages.every(
      (p) => p.capacityStatus === "unknown",
    ),
  );
});
