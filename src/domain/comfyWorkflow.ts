import { z } from "zod";
export const comfyApiWorkflowSchema = z.record(
  z.string().min(1),
  z
    .object({
      class_type: z.string().min(1),
      inputs: z.record(z.string(), z.unknown()).optional(),
      _meta: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
);
export const workflowRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500),
  source: z.enum(["starter", "imported", "created"]),
  tags: z.array(z.string().min(1).max(32)).max(12),
  workflow: comfyApiWorkflowSchema,
  editorWorkflow: z.record(z.string(), z.unknown()).optional(),
  needsConversion: z.boolean().optional(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type ComfyWorkflow = z.infer<typeof comfyApiWorkflowSchema>;
export type WorkflowRecord = z.infer<typeof workflowRecordSchema>;
export const comfyWorkflowCardSchema = z
  .object({
    workflowId: z.string().min(1).max(160).optional(),
    snapshot: workflowRecordSchema.optional(),
    endpoint: z.string().max(200).optional(),
    parametersOpen: z.boolean().optional(),
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
