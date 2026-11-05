import { z } from "zod";
export const blueprintNodeSchema = z
  .object({
    kind: z.enum([
      "ui",
      "service",
      "worker",
      "feature",
      "data",
      "library",
      "external",
    ]),
    paths: z.array(z.string().max(1000)).max(100),
    summary: z.string().max(3000),
    parentId: z.string().min(1).max(160).optional(),
  })
  .strict();
export type BlueprintNode = z.infer<typeof blueprintNodeSchema>;
