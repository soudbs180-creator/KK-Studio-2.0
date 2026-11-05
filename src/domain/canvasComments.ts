import { z } from "zod";
export const canvasCommentsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(160),
        text: z.string().trim().min(1).max(2000),
        resolved: z.boolean(),
      })
      .strict(),
  )
  .max(100)
  .refine(
    (rows) => new Set(rows.map((r) => r.id)).size === rows.length,
    "评论 ID 重复",
  );
