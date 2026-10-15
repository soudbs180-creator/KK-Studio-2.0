import { z } from "zod";
import source from "../../config/local-model-packages.json" with { type: "json" };

const bytes = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const revision = z.string().regex(/^[a-f0-9]{40}$/);
const artifact = z
  .object({
    path: z
      .string()
      .min(1)
      .max(240)
      .refine(
        (value) =>
          !/[\\:]/.test(value) &&
          !value
            .split("/")
            .some((part) => !part || part === "." || part === ".."),
      ),
    bytes,
    sha256: digest,
    role: z.enum([
      "model",
      "projector",
      "text-encoder",
      "video-vae",
      "audio-vae",
    ]),
  })
  .strict();
export type LocalModelArtifact = z.infer<typeof artifact>;
const shared = {
  id: z.string().regex(/^[a-z0-9.-]+$/),
  name: z.string().min(1),
  maintainer: z.string().min(1),
  license: z.string().min(1),
  revision,
  sourceUrl: z.string().url(),
  artifactBaseUrl: z.string().url(),
  artifacts: z.array(artifact).min(1),
};
const chat = z
  .object({
    ...shared,
    engine: z.literal("llama.cpp"),
    repository: z.string().min(1),
    filename: z.string().min(1),
    mainBytes: bytes,
    visionBytes: bytes,
    mainSha256: digest,
    visionSha256: digest,
    contextTokens: z.number().int().min(512).max(32768),
    estimatedRamBytes: bytes,
  })
  .strict();
const video = z
  .object({
    ...shared,
    engine: z.literal("comfyui"),
    mode: z.enum(["fl2va", "ref2va"]),
    defaultMode: z.boolean(),
    licenseReview: z.literal("required"),
    declaredMinVramBytes: bytes,
    declaredMinRamBytes: bytes,
    workflowFormat: z.literal("comfy-ui-graph"),
    workflowConversionRequired: z.literal(true),
    accelerationAcceptance: z.literal("unverified"),
    runtimeAcceptance: z.literal("unverified"),
  })
  .strict();
export const localModelCatalogSchema = z
  .object({
    version: z.literal(1),
    chat: z.array(chat).min(1),
    video: z.array(video).min(1),
    runtimes: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-zA-Z0-9._-]+\.zip$/),
            release: z.string().regex(/^b\d+$/),
            revision,
            backend: z.enum(["cpu", "cuda-13.4"]),
            archiveRole: z.enum(["server", "cuda-runtime"]),
            sourceUrl: z.string().url(),
            bytes,
            sha256: digest,
            license: z.string().min(1),
            licenseReview: z.enum(["declared", "required"]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const catalog = localModelCatalogSchema.parse(source);
// Sizes and digests are pinned publisher metadata, not locally verified files.
export const localChatModelPackages = catalog.chat;
export const localVideoModelPackages = catalog.video;
export const localRuntimeArchives = catalog.runtimes;

/** Weight files only; engines, nodes and workflows need independent validation. */
export function planLocalModelDownloads(packageIds: readonly string[]) {
  const entries = [...localChatModelPackages, ...localVideoModelPackages];
  const selected = [...new Set(packageIds)].map((id) => {
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) throw new Error("未知本地模型包");
    return entry;
  });
  const artifacts = new Map<
    string,
    LocalModelArtifact & { sourceUrl: string }
  >();
  for (const entry of selected) {
    for (const file of entry.artifacts) {
      artifacts.set(file.sha256, {
        ...file,
        sourceUrl: `${entry.artifactBaseUrl}/${file.path.split("/").map(encodeURIComponent).join("/")}`,
      });
    }
  }
  const files = [...artifacts.values()];
  return {
    files,
    downloadBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  };
}
