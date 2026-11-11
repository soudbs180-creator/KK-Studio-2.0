import { z } from "zod";

export const videoMediaSchema = z
  .object({
    kind: z.literal("video"),
    duration: z.union([z.literal(4), z.literal(6), z.literal(8)]),
    aspectRatio: z.enum(["16:9", "9:16"]),
    resolution: z.enum(["720p", "1080p"]),
    audio: z.boolean().optional(),
  })
  .strict();
export const audioMediaSchema = z
  .object({
    kind: z.literal("audio"),
    voice: z.enum([
      "alloy",
      "ash",
      "ballad",
      "coral",
      "echo",
      "fable",
      "nova",
      "onyx",
      "sage",
      "shimmer",
      "verse",
      "marin",
      "cedar",
    ]),
    format: z.enum(["mp3", "wav"]),
    speed: z.number().finite().min(0.25).max(4),
  })
  .strict();
export const creationMediaSchema = z.discriminatedUnion("kind", [
  videoMediaSchema,
  audioMediaSchema,
]);
export type CreationMedia = z.infer<typeof creationMediaSchema>;

/** Opaque acceptance only: no prompt, credentials or temporary output URL. */
export const mediaSubmissionReceiptSchema = z
  .object({
    connectionId: z.string().min(1).max(120),
    idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
    acceptance: z.enum(["accepted", "unknown", "rejected"]),
    providerJobId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{1,240}$/)
      .optional(),
  })
  .strict()
  .refine((receipt) =>
    receipt.acceptance === "accepted"
      ? Boolean(receipt.providerJobId)
      : receipt.acceptance !== "rejected" ||
        receipt.providerJobId === undefined,
  );
export type MediaSubmissionReceipt = z.infer<
  typeof mediaSubmissionReceiptSchema
>;
export const defaultVideoMedia: CreationMedia = {
  kind: "video",
  duration: 4,
  aspectRatio: "16:9",
  resolution: "720p",
  audio: false,
};
export const defaultAudioMedia: CreationMedia = {
  kind: "audio",
  voice: "alloy",
  format: "mp3",
  speed: 1,
};
