import { z } from "zod";
export const canvasPresentationSchema = z
  .object({
    width: z.number().finite().min(80).max(4000).optional(),
    height: z.number().finite().min(44).max(4000).optional(),
    locked: z.boolean().optional(),
    color: z.enum(["default", "accent", "warning", "success"]).optional(),
  })
  .strict();
export type CanvasPresentation = z.infer<typeof canvasPresentationSchema>;
