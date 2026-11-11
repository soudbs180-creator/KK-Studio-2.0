import { z } from "zod";
import type {
  AssetPort,
  CapabilityAsset,
} from "../../../packages/creation-contracts/index.ts";

const part = z
  .string()
  .max(1024)
  .refine(
    (s) =>
      !s.startsWith("/") &&
      !/[\\:\p{Cc}]/u.test(s) &&
      s.split("/").every((p) => p !== ".." && p !== "."),
  );
const file = z.object({
  filename: part.refine((s) => s.length > 0 && !s.includes("/")),
  subfolder: part.default(""),
  type: z.literal("output"),
});
export type WorkflowOutput = z.infer<typeof file> & {
  promptId: string;
  nodeId: string;
  submissionKey?: string;
};
const object = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

/** Only the two client identities owned by this exact card may publish results. */
export function workflowOutputs(
  raw: unknown,
  clients: readonly string[],
): WorkflowOutput[] {
  const result: WorkflowOutput[] = [];
  for (const [promptId, value] of Object.entries(object(raw))) {
    const entry = object(value),
      prompt = entry.prompt;
    if (
      !Array.isArray(prompt) ||
      !clients.includes(String(object(prompt[3]).client_id))
    )
      continue;
    if (promptId.length > 160) throw new Error("ComfyUI任务标识过长");
    for (const [nodeId, node] of Object.entries(object(entry.outputs))) {
      const images = object(node).images;
      if (!Array.isArray(images)) continue;
      for (const image of images) {
        if (object(image).type !== "output") continue;
        const output = file.parse(image);
        // SaveVideo also publishes under images; the asset port here accepts still images.
        if (!/\.(png|jpe?g|webp)$/i.test(output.filename)) continue;
        const key = object(prompt[3]).kk_submission_id;
        result.push({
          ...output,
          promptId,
          nodeId,
          ...(typeof key === "string" && key.length <= 128
            ? { submissionKey: key }
            : {}),
        });
        if (result.length > 256) throw new Error("ComfyUI产物超过单次归档上限");
      }
    }
  }
  return result;
}
export function workflowFailures(
  raw: unknown,
  clients: readonly string[],
): Array<{ promptId: string; key?: string }> {
  return Object.entries(object(raw)).flatMap(([promptId, value]) => {
    const entry = object(value),
      prompt = entry.prompt;
    if (
      !Array.isArray(prompt) ||
      !clients.includes(String(object(prompt[3]).client_id)) ||
      object(entry.status).status_str !== "error"
    )
      return [];
    const key = object(prompt[3]).kk_submission_id;
    return [{ promptId, key: typeof key === "string" ? key : undefined }];
  });
}
export async function workflowOutputId(
  clientId: string,
  output: WorkflowOutput,
): Promise<string> {
  const bytes = new TextEncoder().encode(
    JSON.stringify([
      clientId,
      output.promptId,
      output.nodeId,
      output.filename,
      output.subfolder,
      output.type,
    ]),
  );
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return (
    "comfy-output-" +
    Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 24)
  );
}
export interface WorkflowDelivery {
  id: string;
  asset: CapabilityAsset;
  output: WorkflowOutput;
}
export function createWorkflowDelivery(options: {
  clientId: string;
  isCurrent: () => boolean;
  hasOutput: (id: string) => boolean;
  readOutput: (output: WorkflowOutput) => Promise<string>;
  assets: Pick<AssetPort, "write">;
  applyOps: (delivery: WorkflowDelivery) => Promise<void>;
}) {
  const pending = new Set<string>();
  return async (output: WorkflowOutput): Promise<void> => {
    const id = await workflowOutputId(options.clientId, output);
    if (!options.isCurrent() || options.hasOutput(id) || pending.has(id))
      return;
    pending.add(id);
    try {
      const source = await options.readOutput(output);
      if (!options.isCurrent()) return;
      const asset = await options.assets.write({
        source,
        provider: "ComfyUI",
        providerRequestId: output.promptId,
        sourceJobId: output.promptId,
        tags: ["AI生成", "ComfyUI"],
      });
      if (options.isCurrent() && !options.hasOutput(id))
        await options.applyOps({ id, asset, output });
    } finally {
      pending.delete(id);
    }
  };
}
