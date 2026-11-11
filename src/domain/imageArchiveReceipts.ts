import { z } from "zod";

export const imageArchiveReceiptsSchema = z
  .record(
    z.string().regex(/^chatgpt-[a-f0-9]{32}$/),
    z
      .object({
        jobId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        assetId: z.string(),
        chatId: z.string().min(1).max(160).nullable(),
      })
      .passthrough()
      .refine(
        (receipt) => receipt.assetId === `asset-${receipt.sha256.slice(0, 24)}`,
        "图片归档回执身份无效，已保留原件。",
      ),
  )
  .refine((receipts) => Object.keys(receipts).length <= 10000);

export type ImageArchiveReceipts = z.infer<typeof imageArchiveReceiptsSchema>;
