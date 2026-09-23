import { z } from "zod";
import type { AgentBridge } from "./agentConnection.ts";
import type { GoogleCall } from "./googleInteractions.ts";

const metadata = z.object({
  text: z.string().max(30000).optional(),
  prompt: z.string().max(4000).optional(),
});
const common = z.object({
  nodeType: z.literal("text").optional(),
  id: z.string().max(160).optional(),
  title: z.string().max(120).optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  metadata: metadata.optional(),
  ids: z.array(z.string().max(160)).max(500).optional(),
  viewport: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      scale: z.number().min(0.2).max(4),
    })
    .optional(),
});
const op = z.discriminatedUnion("type", [
  common.extend({
    type: z.literal("add_node"),
    nodeType: z.literal("text").default("text"),
  }),
  common.extend({
    type: z.literal("update_node"),
    id: z.string().min(1).max(160),
  }),
  common.extend({
    type: z.literal("select_nodes"),
    ids: z.array(z.string().max(160)).max(500),
  }),
  common.extend({
    type: z.literal("set_viewport"),
    viewport: z.object({
      x: z.number().finite(),
      y: z.number().finite(),
      scale: z.number().min(0.2).max(4),
    }),
  }),
]);
export const GOOGLE_CANVAS_TOOLS: Record<string, unknown>[] = [
  {
    type: "function",
    name: "canvas_get_state",
    description:
      "Read this project's canvas nodes, text, selection and viewport. Images are available only when the user explicitly attaches them.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "canvas_apply_ops",
    description:
      "Create/update text nodes or change selection/viewport. This cannot delete nodes, run code or start paid generation. To generate images tell the user to select image mode.",
    parameters: {
      type: "object",
      properties: {
        ops: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "add_node",
                  "update_node",
                  "select_nodes",
                  "set_viewport",
                ],
              },
              nodeType: { type: "string", enum: ["text"] },
              id: { type: "string" },
              title: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              metadata: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  prompt: { type: "string" },
                },
              },
              ids: { type: "array", items: { type: "string" } },
              viewport: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  scale: { type: "number" },
                },
                required: ["x", "y", "scale"],
              },
            },
            required: ["type"],
          },
        },
      },
      required: ["ops"],
    },
  },
];
export async function executeGoogleTool(
  call: GoogleCall,
  bridge: AgentBridge,
  signal: AbortSignal,
  approve: () => Promise<boolean>,
) {
  signal.throwIfAborted();
  if (call.name === "canvas_get_state") {
    const snapshot = bridge.getSnapshot();
    if (!snapshot) throw new Error("当前画布不可用");
    return {
      ...snapshot,
      nodes: snapshot.nodes.slice(0, 200).map((node) => ({
        ...node,
        metadata: {
          text:
            typeof node.metadata.text === "string"
              ? node.metadata.text.slice(0, 30000)
              : "",
          prompt:
            typeof node.metadata.prompt === "string"
              ? node.metadata.prompt.slice(0, 4000)
              : "",
        },
      })),
    };
  }
  if (call.name !== "canvas_apply_ops")
    throw new Error("Google 请求了未支持的工具，未执行。");
  const parsed = z
    .object({ ops: z.array(op).min(1).max(50) })
    .safeParse(call.arguments);
  if (!parsed.success) throw new Error("画布操作参数无效，未执行。");
  if (!(await approve()))
    return { ok: false, error: "用户拒绝了此次画布操作。" };
  signal.throwIfAborted();
  return bridge.applyOps(
    parsed.data.ops.map((item) =>
      item.type === "update_node"
        ? { ...item, patch: item.title ? { title: item.title } : undefined }
        : item,
    ),
    { signal },
  );
}
