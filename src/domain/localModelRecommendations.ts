import { z } from "zod";

const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const label = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine((value) =>
    Array.from(value).every((character) => {
      const code = character.codePointAt(0)!;
      return code >= 32 && (code < 127 || code > 159);
    }),
  );
const memory = z
  .object({ usableBytes: bytes.positive(), availableBytes: bytes })
  .strict()
  .refine((v) => v.availableBytes <= v.usableBytes);
const gpu = z
  .object({
    name: label,
    dedicatedBytes: bytes.positive().nullable(),
    freeBytes: bytes.nullable(),
    driverVersion: z
      .string()
      .regex(/^\d{1,4}\.\d{1,4}(?:\.\d{1,4}){0,2}$/)
      .nullable(),
    computeCapability: z
      .string()
      .regex(/^\d{1,2}\.\d{1,2}$/)
      .nullable(),
    computeBackend: z.literal("cuda-reported").nullable(),
  })
  .strict()
  .refine(
    (v) =>
      v.freeBytes === null ||
      (v.dedicatedBytes !== null && v.freeBytes <= v.dedicatedBytes),
  );
const reportedGpu = gpu.refine(
  (v) => (v.computeBackend === null) === (v.computeCapability === null),
);
const disk = z
  .object({
    drive: z.string().regex(/^[A-Z]:$/),
    totalBytes: bytes.positive(),
    freeBytes: bytes,
  })
  .strict()
  .refine((v) => v.freeBytes <= v.totalBytes);
export const localHardwareReportSchema = z
  .object({
    version: z.literal(1),
    status: z.enum(["supported", "unsupported"]),
    platform: z.enum(["windows", "linux", "macos", "web", "unknown"]),
    measuredAtMs: bytes,
    cpu: z
      .object({ name: label, logicalCores: z.number().int().min(1).max(4096) })
      .strict()
      .nullable(),
    memory: memory.nullable(),
    os: z.object({ name: label, architecture: label }).strict().nullable(),
    gpus: z.array(reportedGpu).max(32),
    disks: z.array(disk).max(26),
    errors: z
      .array(
        z
          .object({
            probe: z.enum([
              "platform",
              "cpu",
              "system",
              "gpu",
              "nvidia",
              "disk",
            ]),
            code: z.enum([
              "unsupported",
              "unavailable",
              "timeout",
              "output-limit",
              "invalid-output",
            ]),
          })
          .strict(),
      )
      .max(8),
  })
  .strict()
  .refine((v) => new Set(v.disks.map((d) => d.drive)).size === v.disks.length)
  .refine((v) =>
    v.status === "supported"
      ? v.platform === "windows"
      : v.cpu === null &&
        v.memory === null &&
        v.os === null &&
        !v.gpus.length &&
        !v.disks.length,
  );
export type LocalHardwareReport = z.infer<typeof localHardwareReportSchema>;

const GiB = 1024 ** 3;
const reserveRamBytes = 4 * GiB;
const reserveVramBytes = 2 * GiB;
const modelCatalog = [
  {
    id: "qwen3.5-9b-q4-k-m",
    name: "Qwen3.5-9B Q4_K_M",
    repository: "unsloth/Qwen3.5-9B-GGUF",
    revision: "3885219b6810b007914f3a7950a8d1b469d598a5",
    filename: "Qwen3.5-9B-Q4_K_M.gguf",
    mainBytes: 5_680_522_464,
    visionBytes: 918_166_080,
    contextTokens: 8192,
    estimatedRamBytes: 8 * GiB,
  },
  {
    id: "qwen3.5-4b-q4-k-m",
    name: "Qwen3.5-4B Q4_K_M",
    repository: "unsloth/Qwen3.5-4B-GGUF",
    revision: "e87f176479d0855a907a41277aca2f8ee7a09523",
    filename: "Qwen3.5-4B-Q4_K_M.gguf",
    mainBytes: 2_740_937_888,
    visionBytes: 672_423_616,
    contextTokens: 4096,
    estimatedRamBytes: 6 * GiB,
  },
  {
    id: "qwen3.8-27b-ud-q4-k-m",
    name: "Qwen3.8-27B UD-Q4_K_M",
    repository: "unsloth/Qwen3.8-27B-GGUF",
    revision: "4ca720788d1e01f1bff70c033e0d0028fd02e502",
    filename: "Qwen3.8-27B-UD-Q4_K_M.gguf",
    mainBytes: 16_464_440_224,
    visionBytes: 927_607_488,
    contextTokens: 4096,
    estimatedRamBytes: 21 * GiB,
  },
] as const;

type RecommendationReason =
  | "unsupported-platform"
  | "stale-report"
  | "unknown-ram"
  | "unknown-vram"
  | "unknown-disk"
  | "runtime-architecture-unverified"
  | "insufficient-free-ram"
  | "insufficient-free-vram"
  | "insufficient-disk";
type RecommendationStatus =
  "recommended" | "alternative" | "optional" | "insufficient" | "unknown";

function resourceReasons(
  report: LocalHardwareReport,
  diskDrive: string,
  nowMs: number,
) {
  const reasons: RecommendationReason[] = [];
  if (report.status === "unsupported") reasons.push("unsupported-platform");
  if (
    nowMs - report.measuredAtMs > 60_000 ||
    report.measuredAtMs - nowMs > 5_000
  )
    reasons.push("stale-report");
  if (report.os?.architecture !== "x86_64")
    reasons.push("runtime-architecture-unverified");
  if (report.memory === null) reasons.push("unknown-ram");
  const freeVramBytes = report.gpus.reduce<number | null>(
    (best, item) =>
      item.freeBytes === null ? best : Math.max(best ?? 0, item.freeBytes),
    null,
  );
  if (freeVramBytes === null) reasons.push("unknown-vram");
  const selectedDisk = report.disks.find((item) => item.drive === diskDrive);
  if (!selectedDisk) reasons.push("unknown-disk");
  return { reasons, freeVramBytes, selectedDisk };
}

/** Arithmetic estimates only; loading, peak memory, vision and tools need runtime acceptance. */
export function recommendLocalModels(
  reportValue: unknown,
  options: { diskDrive: string; nowMs: number },
) {
  const report = localHardwareReportSchema.parse(reportValue);
  const { diskDrive, nowMs } = z
    .object({ diskDrive: disk.shape.drive, nowMs: bytes })
    .strict()
    .parse(options);
  const resources = resourceReasons(report, diskDrive, nowMs);
  const profiles = modelCatalog.map((entry, index) => {
    const optional = index === 2;
    const downloadBytes = entry.mainBytes + entry.visionBytes;
    // File bytes omit cache/buffers; these reserves are policy estimates, never measured peaks.
    const estimatedVramBytes = optional ? 4 * GiB : downloadBytes + GiB;
    const requiredFreeVramBytes = estimatedVramBytes + reserveVramBytes;
    const requiredFreeRamBytes = entry.estimatedRamBytes + reserveRamBytes;
    const requiredDiskBytes = 2 * downloadBytes + 2 * GiB;
    const reasons = [...resources.reasons];
    if (report.memory && report.memory.availableBytes < requiredFreeRamBytes)
      reasons.push("insufficient-free-ram");
    if (
      resources.freeVramBytes !== null &&
      resources.freeVramBytes < requiredFreeVramBytes
    )
      reasons.push("insufficient-free-vram");
    if (
      resources.selectedDisk &&
      resources.selectedDisk.freeBytes < requiredDiskBytes
    )
      reasons.push("insufficient-disk");
    const status: RecommendationStatus = resources.reasons.length
      ? "unknown"
      : reasons.length
        ? "insufficient"
        : optional
          ? "optional"
          : "alternative";
    return {
      model: {
        ...entry,
        license: "Apache-2.0",
        maintainer: "Unsloth",
        sourceUrl: `https://huggingface.co/${entry.repository}/tree/${entry.revision}`,
        text: "declared",
        vision: "declared",
        imageGeneration: false,
      },
      status,
      reasons,
      selectionReason: optional
        ? "optional-larger-cpu-offload-estimate"
        : index === 0
          ? "balanced-chat-vision-estimate"
          : "light-chat-vision-estimate",
      engine: "llama.cpp",
      execution: optional ? "cpu-offload" : "gpu-offload",
      contextTokens: entry.contextTokens,
      slots: 1,
      downloadBytes,
      requiredDiskBytes,
      estimatedVramBytes,
      requiredFreeVramBytes,
      estimatedRamBytes: entry.estimatedRamBytes,
      requiredFreeRamBytes,
      reserveRamBytes,
      reserveVramBytes,
      evidence: "estimate",
      runtimeAcceptance: "unverified",
      toolAcceptance: "unverified",
    };
  });
  const preferred = profiles.find((item) => item.status === "alternative");
  return {
    preferredId: preferred?.model.id ?? null,
    profiles: profiles.map((profile) => ({
      ...profile,
      status: profile === preferred ? ("recommended" as const) : profile.status,
    })),
    manualSelectionAllowed: true,
    installationValidationRequired: true,
    agentFramework: {
      name: "Qwen-Agent",
      kind: "framework",
      toolAcceptance: "unverified",
    },
    experimental: [
      {
        id: "qwen-image-2.1-turbo",
        modality: "image",
        weightBytes: 32_440_133_648,
        sourceUrl:
          "https://huggingface.co/Qwen/Qwen-Image-2.1-Turbo/tree/fc13ba1986fcb905854dc8de2f52eee395f49b5b",
        revision: "fc13ba1986fcb905854dc8de2f52eee395f49b5b",
        license: "Qwen Research License",
        runtimeAcceptance: "unverified",
        reason: "license-engine-and-peak-memory-validation-required",
      },
      {
        id: "minimax-h3-existing-workflows",
        modality: "video",
        weightBytes: null,
        sourceUrl:
          "https://docs.comfy.org/tutorials/video/minimax/minimax-h3-native",
        revision: null,
        license: null,
        runtimeAcceptance: "unverified",
        reason: "verify-existing-local-workflow-first",
      },
    ],
  };
}
