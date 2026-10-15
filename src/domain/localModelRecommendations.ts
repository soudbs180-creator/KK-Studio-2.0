import { z } from "zod";
import {
  localChatModelPackages,
  localVideoModelPackages,
  planLocalModelDownloads,
} from "./localModelPackages.ts";

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
  const profiles = localChatModelPackages.map((entry, index) => {
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
    videoPackages: recommendVideoPackages(report, resources),
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

function recommendVideoPackages(
  report: LocalHardwareReport,
  resources: ReturnType<typeof resourceReasons>,
) {
  const gpus = report.gpus.filter(
    (item) => item.computeBackend === "cuda-reported",
  );
  const guidanceUnknown =
    report.status !== "supported" ||
    resources.reasons.includes("stale-report") ||
    resources.reasons.includes("runtime-architecture-unverified") ||
    report.memory === null ||
    !gpus.some((item) => item.dedicatedBytes !== null);
  return localVideoModelPackages.map((entry) => {
    const capableGpus = gpus.filter(
      (item) => (item.dedicatedBytes ?? 0) >= entry.declaredMinVramBytes,
    );
    const capacityStatus = guidanceUnknown
      ? ("unknown" as const)
      : capableGpus.length &&
          report.memory!.usableBytes >= entry.declaredMinRamBytes
        ? ("candidate" as const)
        : ("below-guidance" as const);
    const downloadBytes = planLocalModelDownloads([entry.id]).downloadBytes;
    const requiredDiskBytes = 2 * downloadBytes + 2 * GiB;
    const diskUnknown =
      !resources.selectedDisk || resources.reasons.includes("stale-report");
    const installationSpace = diskUnknown
      ? ("unknown" as const)
      : resources.selectedDisk!.freeBytes >= requiredDiskBytes
        ? ("sufficient" as const)
        : ("insufficient" as const);
    const warnings: string[] = [
      "runtime-and-node-validation-required",
      "derivative-license-review-required",
    ];
    const free = capableGpus.reduce<number | null>(
      (best, item) =>
        item.freeBytes === null ? best : Math.max(best ?? 0, item.freeBytes),
      null,
    );
    // Publisher's 16GB/32GB profile leaves ~2GB GPU/~10GB RAM; these are not measured peaks.
    if (free === null) warnings.push("unknown-current-vram");
    else if (free < 14_000_000_000) warnings.push("busy-gpu");
    if (report.memory === null) warnings.push("unknown-current-ram");
    else if (report.memory.availableBytes < 22_000_000_000)
      warnings.push("busy-ram");
    return {
      id: entry.id,
      name: entry.name,
      sourceUrl: entry.sourceUrl,
      revision: entry.revision,
      maintainer: entry.maintainer,
      license: entry.license,
      defaultMode: entry.defaultMode,
      downloadBytes,
      requiredDiskBytes,
      capacityStatus,
      installationSpace,
      warnings,
      runtimeAcceptance: entry.runtimeAcceptance,
      canStart: false as const,
    };
  });
}
