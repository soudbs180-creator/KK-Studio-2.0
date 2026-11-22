import { z } from "zod";
import { probeFastVideo } from "../../integrations/generation/fastVideoProbe.ts";

const STORAGE_KEY = "kk:fastvideo-runtime:v1";

export const fastVideoRuntimeSettingsSchema = z
  .object({
    version: z.literal(1),
    runnerConfigured: z.boolean(),
    outputDirectory: z.string().min(1).max(32767).default("fastvideo-output"),
    modelId: z
      .string()
      .min(1)
      .max(200)
      .default("FastVideo/FastWan2.1-T2V-1.3B-Diffusers"),
  })
  .strict();
export type FastVideoRuntimeSettings = z.infer<
  typeof fastVideoRuntimeSettingsSchema
>;

export function defaultFastVideoRuntimeSettings(): FastVideoRuntimeSettings {
  return fastVideoRuntimeSettingsSchema.parse({
    version: 1,
    runnerConfigured: false,
  });
}

export function readFastVideoRuntimeSettings(
  storage: Pick<Storage, "getItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): FastVideoRuntimeSettings {
  if (!storage) return defaultFastVideoRuntimeSettings();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultFastVideoRuntimeSettings();
    return fastVideoRuntimeSettingsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultFastVideoRuntimeSettings();
  }
}

export function writeFastVideoRuntimeSettings(
  value: FastVideoRuntimeSettings,
  storage: Pick<Storage, "setItem"> | null = typeof window === "undefined"
    ? null
    : window.localStorage,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify(fastVideoRuntimeSettingsSchema.parse(value)),
    );
    return true;
  } catch {
    return false;
  }
}

export function describeFastVideoRuntime(input: {
  settings?: FastVideoRuntimeSettings;
  platform: "windows" | "linux" | "macos" | "web" | "unknown";
  cudaReported?: boolean;
  dedicatedVramBytes?: number | null;
}) {
  const settings = input.settings ?? readFastVideoRuntimeSettings();
  const probe = probeFastVideo({
    platform: input.platform,
    runnerConfigured: settings.runnerConfigured,
    cudaReported: input.cudaReported,
    dedicatedVramBytes: input.dedicatedVramBytes,
  });
  return { settings, probe };
}
