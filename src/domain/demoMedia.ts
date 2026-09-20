import { z } from "zod";
import manifest from "./fixtures/demo-manifest.json";
import type { DemoResult } from "./canvasItems";

const localAsset = z
  .string()
  .regex(/^\/fixtures\/demo\/[a-z0-9-]+\.(png|webm|wav|txt)$/);
const sampleSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(["image", "video", "audio", "text"]),
    title: z.string().min(1),
    src: localAsset.optional(),
    poster: localAsset.optional(),
    text: z.string().max(10000).optional(),
    description: z.string(),
    source: z.literal("demo"),
  })
  .strict()
  .refine(
    (value) =>
      value.kind === "text" ? Boolean(value.text) : Boolean(value.src),
    "示范素材缺少内容",
  );
export function parseDemoManifest(input: unknown): DemoResult[] {
  return z
    .array(sampleSchema)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "示范 ID 重复",
    )
    .parse(input);
}
export const DEMO_MEDIA: DemoResult[] = parseDemoManifest(manifest);
