import { z } from "zod";
export const comfyWorkflowCardSchema = z
  .object({
    workflowId: z.string().min(1).max(160).optional(),
    dismissedOutputIds: z
      .array(z.string().regex(/^comfy-output-[a-f0-9]{24}$/))
      .optional(),
    submission: z
      .object({
        key: z.string().min(1).max(160),
        promptId: z.string().min(1).max(160).optional(),
        state: z.enum(["intent", "submitted", "unknown"]),
      })
      .optional(),
  })
  .passthrough();
export type ComfyWorkflowCardState = z.infer<typeof comfyWorkflowCardSchema>;
