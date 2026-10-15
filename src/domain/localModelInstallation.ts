import { z } from "zod";
import {
  localChatModelPackages,
  localVideoModelPackages,
} from "./localModelPackages.ts";

const packages = new Map(
  [...localChatModelPackages, ...localVideoModelPackages].map((p) => [p.id, p]),
);
const id = z.string().regex(/^[a-f0-9]{32}$/);
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const localInstallSelectionSchema = z
  .object({
    packageIds: z
      .array(
        z.string().refine((value) => packages.has(value), "未知本地模型包"),
      )
      .min(1)
      .max(5)
      .refine((v) => new Set(v).size === v.length),
    runtimeBackend: z.enum(["cpu", "cuda-13.4", "none"]),
  })
  .strict()
  .refine(
    (v) =>
      v.packageIds.some((key) => packages.get(key)?.engine === "llama.cpp")
        ? v.runtimeBackend !== "none"
        : v.runtimeBackend === "none",
    "Qwen 需要推理引擎；H3 权重不安装 llama.cpp",
  );
export type LocalInstallSelection = z.infer<typeof localInstallSelectionSchema>;
export const localInstallStatusSchema = z
  .object({
    version: z.literal(1),
    operationId: id,
    state: z.enum([
      "prepared",
      "downloading",
      "verifying",
      "extracting",
      "installed",
      "cancelled",
      "failed",
    ]),
    sequence: count,
    completedBytes: count,
    totalBytes: count,
    installationIds: z.array(id).max(5),
    error: z.string().max(300).nullable(),
  })
  .strict()
  .refine((v) => v.completedBytes <= v.totalBytes);
export type LocalInstallStatus = z.infer<typeof localInstallStatusSchema>;
export const localDirectoryGrantSchema = z
  .object({
    version: z.literal(1),
    grantId: id,
    displayPath: z.string().min(1).max(32767),
  })
  .strict();
export const localInstallPlanSchema = z
  .object({
    version: z.literal(1),
    operationId: id,
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    selection: localInstallSelectionSchema,
    downloadBytes: count,
    requiredBytes: count,
    destination: z.string().min(1).max(32767),
  })
  .strict();
export type LocalInstallPlan = z.infer<typeof localInstallPlanSchema>;
export const localRuntimeStatusSchema = z
  .object({
    version: z.literal(1),
    installationId: id,
    instanceId: id.nullable(),
    state: z.enum(["stopped", "starting", "running", "failed"]),
    text: z.enum(["unverified", "loaded"]),
    vision: z.enum(["unverified", "loaded"]),
    inference: z.literal("unverified"),
    tools: z.literal("unverified"),
    error: z.string().max(300).nullable(),
  })
  .strict();
export type LocalRuntimeStatus = z.infer<typeof localRuntimeStatusSchema>;
export const localInstallationSummarySchema = z
  .object({
    version: z.literal(1),
    installationId: id,
    packageId: z.string().min(1).max(120),
    name: z.string().min(1).max(160),
    engine: z.enum(["llama.cpp", "comfyui"]),
    destination: z.string().min(1).max(32767),
    backend: z.enum(["cpu", "cuda-13.4", "none"]),
    associated: z.boolean(),
    acceptance: z.literal("unverified"),
  })
  .strict();
export type LocalInstallationSummary = z.infer<
  typeof localInstallationSummarySchema
>;
export const localModelInspectionSchema = z
  .object({
    version: z.literal(1),
    installationId: id,
    packageId: z.string().min(1).max(120),
    engine: z.enum(["llama.cpp", "comfyui"]),
    files: z.literal("verified"),
    runtime: z.enum(["installed", "missing"]),
    text: z.enum(["declared", "unverified"]),
    vision: z.literal("unverified"),
    inference: z.literal("unverified"),
    tools: z.literal("unverified"),
    dependencies: z.array(z.string().max(160)).max(32),
    license: z.string().min(1).max(300),
    licenseReview: z.enum(["declared", "required"]),
  })
  .strict();
export type LocalModelInspection = z.infer<typeof localModelInspectionSchema>;
