import { z } from "zod";

const id = z.string().min(1).max(128);
const json = z.json();
const noParams = z.strictObject({});
const prompt = z.strictObject({
  prompt: z.string().min(1).max(16_000),
  model: z.string().max(256).optional(),
});
export const pluginRpcRequestSchema = z.discriminatedUnion("method", [
  z.strictObject({ id, method: z.literal("canvas.read"), params: noParams }),
  z.strictObject({
    id,
    method: z.literal("node.patch"),
    params: z.strictObject({
      title: z.string().max(256).optional(),
      width: z.number().positive().max(2000).optional(),
      height: z.number().positive().max(2000).optional(),
    }),
  }),
  z.strictObject({
    id,
    method: z.enum(["ai.image", "ai.video", "ai.text"]),
    params: prompt,
  }),
  z.strictObject({
    id,
    method: z.enum(["storage.get", "storage.remove"]),
    params: z.strictObject({ key: id }),
  }),
  z.strictObject({
    id,
    method: z.literal("storage.set"),
    params: z.strictObject({ key: id, value: json }),
  }),
]);
export type PluginRpcRequest = z.infer<typeof pluginRpcRequestSchema>;
