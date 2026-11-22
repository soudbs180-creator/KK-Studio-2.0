import { z } from "zod";
import { fastVideoDisableReason } from "./fastVideoAdapter.ts";

export const fastVideoProbeSchema = z
  .object({
    version: z.literal(1),
    available: z.boolean(),
    platform: z.enum(["windows", "linux", "macos", "web", "unknown"]),
    pythonModule: z.enum(["missing", "declared", "unverified"]),
    gpuHint: z.enum(["unknown", "cuda-reported", "insufficient", "ok"]),
    disableReason: z.string().max(300),
    modelSuggestion: z.string().min(1).max(200),
  })
  .strict();
export type FastVideoProbe = z.infer<typeof fastVideoProbeSchema>;

/**
 * Desktop capability probe for FastVideo. Does not import or execute FastVideo;
 * callers pass observed environment facts from Native/settings.
 */
export function probeFastVideo(input: {
  platform: FastVideoProbe["platform"];
  runnerConfigured: boolean;
  cudaReported?: boolean;
  dedicatedVramBytes?: number | null;
}): FastVideoProbe {
  const platform = input.platform;
  if (platform === "web") {
    return fastVideoProbeSchema.parse({
      version: 1,
      available: false,
      platform,
      pythonModule: "missing",
      gpuHint: "unknown",
      disableReason: "FastVideo 仅支持 Desktop，网页版不可用",
      modelSuggestion: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
    });
  }
  if (!input.runnerConfigured) {
    return fastVideoProbeSchema.parse({
      version: 1,
      available: false,
      platform,
      pythonModule: "missing",
      gpuHint: input.cudaReported ? "cuda-reported" : "unknown",
      disableReason: fastVideoDisableReason(false),
      modelSuggestion: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
    });
  }
  const vram = input.dedicatedVramBytes ?? null;
  const gpuHint =
    !input.cudaReported || vram === null
      ? ("unknown" as const)
      : vram < 8 * 1024 ** 3
        ? ("insufficient" as const)
        : ("ok" as const);
  const available = gpuHint !== "insufficient";
  return fastVideoProbeSchema.parse({
    version: 1,
    available,
    platform,
    pythonModule: "declared",
    gpuHint,
    disableReason: available ? "" : "当前显存估计不足以运行推荐 FastVideo 权重",
    modelSuggestion: "FastVideo/FastWan2.1-T2V-1.3B-Diffusers",
  });
}
