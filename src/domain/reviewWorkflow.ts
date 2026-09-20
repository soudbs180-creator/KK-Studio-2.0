import { z } from "zod";
import { agentRoleSchema } from "./agentWorkflow.ts";

export const reviewRegionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(0).max(1),
  height: z.number().min(0).max(1),
});
export type ReviewRegion = z.infer<typeof reviewRegionSchema>;
export const reviewCommentSchema = z.object({
  id: z.string().max(160),
  sourceTaskId: z.string().max(160),
  assetId: z.string().max(160).optional(),
  content: z.string().min(1).max(2000),
  region: reviewRegionSchema.optional(),
  regionLabel: z.string().max(60),
  assignee: agentRoleSchema,
  reviewTaskId: z.string().max(160).optional(),
  status: z.enum(["comment", "open", "done"]),
  createdAt: z.number(),
});
export type ReviewComment = z.infer<typeof reviewCommentSchema>;
export function normalizeReviewComments(value: unknown): ReviewComment[] {
  return Array.isArray(value)
    ? value.slice(0, 500).flatMap((entry) => {
        const result = reviewCommentSchema.safeParse(entry);
        return result.success ? [result.data] : [];
      })
    : [];
}
