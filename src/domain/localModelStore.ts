import { z } from "zod";
import {
  localChatModelPackages,
  localVideoModelPackages,
} from "./localModelPackages.ts";

const packageId = z.string().min(1).max(120);
const revision = z.string().min(1).max(80);
const bytes = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const localModelSourceKindSchema = z.enum([
  "official",
  "community",
  "external-runtime",
]);
export type LocalModelSourceKind = z.infer<typeof localModelSourceKindSchema>;

export const localModelFitTierSchema = z.enum([
  "recommended",
  "tight",
  "unsuitable",
  "unknown",
]);
export type LocalModelFitTier = z.infer<typeof localModelFitTierSchema>;

export const localInstalledPackageSchema = z
  .object({
    packageId,
    name: z.string().min(1).max(160),
    revision,
    engine: z.enum(["llama.cpp", "comfyui", "fastvideo", "external"]),
    sourceKind: localModelSourceKindSchema,
    bytesOnDisk: bytes,
    destination: z.string().min(1).max(32767),
    installedAtMs: bytes,
  })
  .strict();
export type LocalInstalledPackage = z.infer<typeof localInstalledPackageSchema>;

export const localStorePresetSchema = z
  .object({
    packageId,
    name: z.string().min(1).max(160),
    modality: z.enum(["text", "vision-language", "image", "video", "audio"]),
    sourceKind: localModelSourceKindSchema,
    installable: z.boolean(),
    catalogRevision: revision.nullable(),
    sourceUrl: z.string().url(),
    notes: z.string().max(400),
    /** Declared download size for UX; null when not pin-verified. */
    declaredBytes: bytes.nullable(),
  })
  .strict();
export type LocalStorePreset = z.infer<typeof localStorePresetSchema>;

const catalogById = new Map(
  [...localChatModelPackages, ...localVideoModelPackages].map((entry) => [
    entry.id,
    entry,
  ]),
);

/** Curated store surface: official pins + community/runtime placeholders. */
export const localStorePresets: readonly LocalStorePreset[] = [
  ...localChatModelPackages.map(
    (entry): LocalStorePreset => ({
      packageId: entry.id,
      name: entry.name,
      modality: "vision-language",
      sourceKind: "official",
      installable: true,
      catalogRevision: entry.revision,
      sourceUrl: entry.sourceUrl,
      notes: "精选 GGUF；首次安装不自动下载。",
      declaredBytes: entry.mainBytes + entry.visionBytes,
    }),
  ),
  {
    packageId: "inkling-2-mini-iq4-nl",
    name: "Inkling 2 Mini IQ4_NL（社区参考）",
    modality: "vision-language",
    sourceKind: "community",
    installable: false,
    catalogRevision: null,
    sourceUrl: "https://huggingface.co/ggml-org/Inkling-2-Mini-GGUF",
    notes:
      "适合约 16GB 显存档的图文理解候选；mmproj 与完整 SHA 未 pin 前不可一键安装。",
    declaredBytes: 17_600_000_000,
  },
  ...localVideoModelPackages.map(
    (entry): LocalStorePreset => ({
      packageId: entry.id,
      name: entry.name,
      modality: "video",
      sourceKind: "community",
      installable: true,
      catalogRevision: entry.revision,
      sourceUrl: entry.sourceUrl,
      notes: "社区视频权重；许可与运行时验收未完成。",
      declaredBytes: entry.artifacts.reduce((sum, file) => sum + file.bytes, 0),
    }),
  ),
  {
    packageId: "fastvideo-runtime",
    name: "FastVideo 本地视频运行时",
    modality: "video",
    sourceKind: "external-runtime",
    installable: false,
    catalogRevision: null,
    sourceUrl: "https://github.com/hao-ai-lab/FastVideo",
    notes: "可选外部引擎；由 Desktop 适配器连接，不打进安装包。",
    declaredBytes: null,
  },
  {
    packageId: "ollama-external",
    name: "Ollama（外部运行时）",
    modality: "text",
    sourceKind: "external-runtime",
    installable: false,
    catalogRevision: null,
    sourceUrl: "https://ollama.com",
    notes: "只连接用户已安装实例；不认领其进程为自有引擎。",
    declaredBytes: null,
  },
];

export function listLocalStorePresets(modality?: LocalStorePreset["modality"]) {
  return modality
    ? localStorePresets.filter((item) => item.modality === modality)
    : [...localStorePresets];
}

export function catalogRevisionFor(packageIdValue: string): string | null {
  const id = packageId.parse(packageIdValue);
  return catalogById.get(id)?.revision ?? null;
}

export const packageReplacementPlanSchema = z
  .object({
    packageId,
    fromRevision: revision,
    toRevision: revision,
    replaceInPlace: z.literal(true),
    deleteOldDefault: z.boolean(),
    requireDeleteConfirmation: z.literal(true),
    bytesFreedIfDelete: bytes.nullable(),
    installable: z.boolean(),
    blockedReason: z.string().max(300).nullable(),
  })
  .strict();
export type PackageReplacementPlan = z.infer<
  typeof packageReplacementPlanSchema
>;

/**
 * Default product policy: replace in place and recommend deleting the old
 * revision to save disk; UI must still confirm deletion.
 */
export function planPackageReplacement(input: {
  packageId: string;
  installedRevision: string;
  catalogRevision?: string | null;
  installedBytes?: number | null;
}): PackageReplacementPlan {
  const packageIdValue = packageId.parse(input.packageId);
  const fromRevision = revision.parse(input.installedRevision);
  const preset = localStorePresets.find(
    (item) => item.packageId === packageIdValue,
  );
  const toRevision =
    input.catalogRevision === undefined
      ? (catalogRevisionFor(packageIdValue) ?? fromRevision)
      : input.catalogRevision === null
        ? fromRevision
        : revision.parse(input.catalogRevision);

  if (!preset?.installable && !catalogById.has(packageIdValue)) {
    return packageReplacementPlanSchema.parse({
      packageId: packageIdValue,
      fromRevision,
      toRevision: fromRevision,
      replaceInPlace: true,
      deleteOldDefault: true,
      requireDeleteConfirmation: true,
      bytesFreedIfDelete: input.installedBytes ?? null,
      installable: false,
      blockedReason: "该包尚未 pin 校验摘要，不能自动替换安装。",
    });
  }

  if (fromRevision === toRevision) {
    return packageReplacementPlanSchema.parse({
      packageId: packageIdValue,
      fromRevision,
      toRevision,
      replaceInPlace: true,
      deleteOldDefault: true,
      requireDeleteConfirmation: true,
      bytesFreedIfDelete: 0,
      installable: true,
      blockedReason: "已是目录中的同一 revision，无需替换。",
    });
  }

  return packageReplacementPlanSchema.parse({
    packageId: packageIdValue,
    fromRevision,
    toRevision,
    replaceInPlace: true,
    deleteOldDefault: true,
    requireDeleteConfirmation: true,
    bytesFreedIfDelete: input.installedBytes ?? null,
    installable: true,
    blockedReason: null,
  });
}

/** Map recommendation status + headroom into a user-facing fit tier. */
export function fitTierFromRecommendation(input: {
  status: string;
  requiredFreeVramBytes: number;
  freeVramBytes: number | null;
}): LocalModelFitTier {
  if (
    input.status === "unknown" ||
    input.status === "insufficient" ||
    input.freeVramBytes === null
  ) {
    if (input.status === "insufficient") return "unsuitable";
    return "unknown";
  }
  if (input.status === "recommended") return "recommended";
  const headroom = input.freeVramBytes - input.requiredFreeVramBytes;
  if (headroom < 0) return "unsuitable";
  if (headroom < 2 * 1024 ** 3) return "tight";
  if (input.status === "optional") return "tight";
  return "recommended";
}
