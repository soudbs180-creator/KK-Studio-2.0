import { z } from "zod";

// Contracts: https://doc.12ai.org/docs/api/async-image and /async-video/veo-3-1.
const imageModels = [
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
  "gpt-image-2",
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
] as const;
const videoModels = [
  "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-preview",
] as const;
export const TWELVE_AI_MAX_TASK_BYTES = 32 * 1024 * 1024;
export const twelveAiTaskIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,240}$/);
export const twelveAiIntentKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,160}$/);
const submissionReceiptSchema = z
  .object({
    connectionId: z.string().min(1).max(120),
    idempotencyKey: twelveAiIntentKeySchema,
    acceptance: z.enum(["accepted", "unknown", "rejected"]),
    providerJobId: twelveAiTaskIdSchema.optional(),
  })
  .strict()
  .refine((receipt) =>
    receipt.acceptance === "accepted"
      ? Boolean(receipt.providerJobId)
      : receipt.acceptance !== "rejected" ||
        receipt.providerJobId === undefined,
  );
export type TwelveAiSubmissionReceipt = z.infer<typeof submissionReceiptSchema>;

export function parseTwelveAiSubmissionReceipt(
  value: unknown,
  connectionId: string,
  idempotencyKey?: string,
): TwelveAiSubmissionReceipt {
  const parsed = submissionReceiptSchema.safeParse(value);
  if (
    !parsed.success ||
    parsed.data.connectionId !== connectionId ||
    (idempotencyKey !== undefined &&
      parsed.data.idempotencyKey !== idempotencyKey)
  )
    invalid();
  return parsed.data;
}

const imageReferenceSchema = z
  .string()
  .max(14_000_000)
  .regex(
    /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
  )
  .refine((value) => value.slice(value.indexOf(",") + 1).length > 0);
const imageMediaSchema = z
  .object({
    kind: z.literal("image"),
    aspectRatio: z
      .enum([
        "1:1",
        "2:3",
        "3:2",
        "3:4",
        "4:3",
        "4:5",
        "5:4",
        "9:16",
        "16:9",
        "21:9",
      ])
      .optional(),
    imageSize: z.enum(["512", "1K", "2K", "4K"]).optional(),
    size: z.string().max(20).optional(),
    quality: z
      .enum(["low", "medium", "high", "auto", "xhigh", "max"])
      .optional(),
  })
  .strict();
const videoMediaSchema = z
  .object({
    kind: z.literal("video"),
    duration: z.union([z.literal(4), z.literal(6), z.literal(8)]),
    aspectRatio: z.enum(["16:9", "9:16"]),
    resolution: z.enum(["720p", "1080p"]),
    audio: z.boolean().optional(),
    imageReferences: z.array(imageReferenceSchema).max(3).optional(),
    startFrame: imageReferenceSchema.optional(),
    endFrame: imageReferenceSchema.optional(),
  })
  .strict();
export type TwelveAiMediaInput =
  z.infer<typeof imageMediaSchema> | z.infer<typeof videoMediaSchema>;

export function twelveAiModelKind(
  model: string,
): "image" | "video" | undefined {
  if ((imageModels as readonly string[]).includes(model)) return "image";
  if ((videoModels as readonly string[]).includes(model)) return "video";
  return undefined;
}

/** Exact endpoints only; official troubleshooting documents api.12ai.org as the direct endpoint. */
export function twelveAiApiBase(value?: string): string | undefined {
  try {
    const url = new URL(value ?? "");
    if (
      url.protocol !== "https:" ||
      !["cdn.12ai.org", "api.12ai.org"].includes(url.hostname) ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["/", "/v1", "/v1/"].includes(url.pathname)
    )
      return undefined;
    return `${url.origin}/v1`;
  } catch {
    return undefined;
  }
}

function invalid(): never {
  throw new Error("INVALID_TWELVE_AI_PROTOCOL");
}
function validSize(size: string): boolean {
  if (size === "auto") return true;
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(size);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return (
    width % 16 === 0 &&
    height % 16 === 0 &&
    Math.max(width, height) <= 3840 &&
    Math.max(width, height) <= Math.min(width, height) * 3 &&
    width * height >= 655360 &&
    width * height <= 8294400
  );
}

function gptImageParameters(
  model: string,
  image: z.infer<typeof imageMediaSchema>,
): Record<string, unknown> {
  if (
    image.aspectRatio ||
    image.imageSize ||
    (image.size && !validSize(image.size)) ||
    (model === "gpt-image-2" && ["xhigh", "max"].includes(image.quality ?? ""))
  )
    invalid();
  return {
    ...(image.size ? { size: image.size } : {}),
    ...(image.quality ? { quality: image.quality } : {}),
  };
}

function imageParameters(
  model: string,
  image?: z.infer<typeof imageMediaSchema>,
): Record<string, unknown> {
  if (!image) return {};
  if (model.startsWith("gpt-image-")) return gptImageParameters(model, image);
  if (image.size || image.quality) invalid();
  return {
    ...(image.aspectRatio ? { aspect_ratio: image.aspectRatio } : {}),
    ...(image.imageSize ? { image_size: image.imageSize } : {}),
  };
}

function videoParameters(
  model: string,
  video: z.infer<typeof videoMediaSchema>,
): Record<string, unknown> {
  const references = video.imageReferences ?? [];
  if (
    Boolean(video.startFrame) !== Boolean(video.endFrame) ||
    (references.length &&
      (video.startFrame || model === "veo-3.1-fast-generate-preview"))
  )
    invalid();
  return {
    duration: video.duration,
    aspect_ratio: video.aspectRatio,
    resolution: video.resolution,
    ...(video.audio === undefined ? {} : { audio: video.audio }),
    ...(references.length ? { image_references: references } : {}),
    ...(video.startFrame
      ? { start_frames: [video.startFrame], end_frames: [video.endFrame] }
      : {}),
  };
}

export function buildTwelveAiTaskBody(request: {
  model: string;
  prompt: string;
  requestedOutputs: number;
  images: string[];
  media?: TwelveAiMediaInput;
}): { model: string; input: Record<string, unknown> } {
  const common = z
    .object({
      model: z.string(),
      prompt: z
        .string()
        .min(1)
        .max(5000)
        .refine((value) => Boolean(value.trim())),
      requestedOutputs: z.literal(1),
      images: z.array(imageReferenceSchema).max(16),
      media: z.union([imageMediaSchema, videoMediaSchema]).optional(),
    })
    .safeParse(request);
  if (!common.success) invalid();
  const { model, prompt, images, media } = common.data;
  const kind = twelveAiModelKind(model);
  if (!kind || (media && media.kind !== kind)) invalid();
  const input: Record<string, unknown> = { prompt, n: 1 };
  if (kind === "image") {
    Object.assign(
      input,
      imageParameters(model, media?.kind === "image" ? media : undefined),
    );
    if (images.length) input.images = images;
  } else {
    if (media?.kind !== "video" || images.length) invalid();
    Object.assign(input, videoParameters(model, media));
  }
  const body = { model, input };
  // Validated references are ASCII; count them before allocating a payload-sized JSON string.
  const metadata = { ...input };
  let referenceBytes = 0;
  for (const [name, value] of Object.entries(input)) {
    if (!Array.isArray(value)) continue;
    metadata[name] = value.map(() => "");
    for (const reference of value) referenceBytes += reference.length;
  }
  const metadataBytes = new TextEncoder().encode(
    JSON.stringify({ model, input: metadata }),
  ).byteLength;
  if (metadataBytes + referenceBytes > TWELVE_AI_MAX_TASK_BYTES) invalid();
  return body;
}

const outputUrlSchema = z
  .string()
  .max(8192)
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !url.hash &&
        !url.port &&
        /^[a-z0-9](?:[a-z0-9.-]*\.)[a-z]{2,}$/i.test(url.hostname) &&
        !/\.(?:localhost|local|internal|invalid|test|example)$/i.test(
          url.hostname,
        )
      );
    } catch {
      return false;
    }
  });
const taskSchema = z.object({
  id: twelveAiTaskIdSchema,
  status: z.enum([
    "queued",
    "processing",
    "in_progress",
    "completed",
    "partial_completed",
    "failed",
  ]),
  outputs: z.array(outputUrlSchema).max(100).optional(),
  error: z.unknown().optional(),
});
export type TwelveAiProviderStatus = z.infer<typeof taskSchema>["status"];
export interface TwelveAiTaskState {
  id: string;
  providerStatus: TwelveAiProviderStatus;
  outputs: string[];
  terminal: boolean;
  partial: boolean;
  failure?: {
    kind: "partial_completion" | "provider_failed";
    providerErrorPresent: boolean;
  };
}

export function parseTwelveAiTask(
  value: unknown,
  expectedId?: string,
): TwelveAiTaskState {
  const parsed = taskSchema.safeParse(value);
  if (!parsed.success) invalid();
  const task = parsed.data;
  if (expectedId && task.id !== expectedId) invalid();
  const successful =
    task.status === "completed" || task.status === "partial_completed";
  if (successful ? !task.outputs?.length : Boolean(task.outputs?.length))
    invalid();
  const partial = task.status === "partial_completed";
  return {
    id: task.id,
    providerStatus: task.status,
    outputs: task.outputs ?? [],
    terminal: successful || task.status === "failed",
    partial,
    ...(partial || task.status === "failed"
      ? {
          failure: {
            kind: partial
              ? ("partial_completion" as const)
              : ("provider_failed" as const),
            providerErrorPresent:
              typeof task.error === "string"
                ? Boolean(task.error.trim())
                : task.error !== null && typeof task.error === "object",
          },
        }
      : {}),
  };
}
