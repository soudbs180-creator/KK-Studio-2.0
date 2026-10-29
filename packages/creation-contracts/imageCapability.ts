import { z } from "zod";
import { containsCredentialText } from "./securityText.ts";
import { capabilityManifestSchema } from "./capability.ts";

export const imageCapabilityIdSchema = z.enum([
  "image.outpaint",
  "image.upscale",
  "image.layer-split",
]);
const identifier = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/);
const binding = z.strictObject({ nodeId: identifier, input: identifier });
const workflow = z
  .strictObject({
    nodes: z.record(
      identifier,
      z.strictObject({
        class_type: identifier,
        inputs: z.record(identifier, z.json()),
      }),
    ),
    bindings: z.partialRecord(
      z.enum(["image", "prompt", "left", "right", "top", "bottom", "scale"]),
      binding,
    ),
    outputNodeIds: z.array(identifier).min(1).max(16),
  })
  .superRefine((value, ctx) => {
    const reject = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (
      !Object.keys(value.nodes).length ||
      Object.keys(value.nodes).length > 256 ||
      JSON.stringify(value).length > 256 * 1024
    )
      reject("Workflow exceeds bounds");
    const serialized = JSON.stringify(value);
    if (
      containsCredentialText(serialized) ||
      /"(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)"\s*:/i.test(
        serialized,
      )
    )
      reject("Workflow contains credentials");
    if (
      new Set(value.outputNodeIds).size !== value.outputNodeIds.length ||
      value.outputNodeIds.some((id) => !Object.hasOwn(value.nodes, id))
    )
      reject("Output nodes are invalid");
    for (const [name, target] of Object.entries(value.bindings)) {
      if (
        !Object.hasOwn(value.nodes, target.nodeId) ||
        !Object.hasOwn(value.nodes[target.nodeId].inputs, target.input)
      )
        reject("Binding target is absent");
      if (
        name === "image" &&
        (value.nodes[target.nodeId]?.class_type !== "LoadImage" ||
          target.input !== "image")
      )
        reject("Source must bind LoadImage.image");
    }
    const paths = Object.values(value.bindings).map(
      (v) => `${v.nodeId}/${v.input}`,
    );
    if (new Set(paths).size !== paths.length)
      reject("Bindings must not overwrite each other");
    for (const output of value.outputNodeIds) {
      const dependencies = workflowDependencies(value.nodes, output);
      if (
        Object.values(value.bindings).some(
          (target) => !dependencies.has(target.nodeId),
        )
      )
        reject(
          "Output must depend on the declared original and parameter bindings",
        );
    }
  });

function workflowDependencies(
  nodes: Record<string, { inputs: Record<string, unknown> }>,
  output: string,
): Set<string> {
  const seen = new Set<string>(),
    pending = [output];
  while (pending.length) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const input of Object.values(nodes[id]?.inputs ?? {})) {
      if (
        Array.isArray(input) &&
        input.length === 2 &&
        typeof input[0] === "string" &&
        Number.isInteger(input[1])
      )
        pending.push(input[0]);
    }
  }
  return seen;
}
const common = {
  version: capabilityManifestSchema.shape.version.refine(
    (value) => value.startsWith("1."),
    "Unsupported image request major version",
  ),
  adapter: z.enum(["comfyui", "provider-api"]),
  sourceAssetId: z.string().regex(/^asset-[a-f0-9]{24}$/),
  workflow,
};
const padding = z.number().int().min(0).max(4096);
export const imageCapabilitySchema = z
  .discriminatedUnion("capabilityId", [
    z.strictObject({
      ...common,
      capabilityId: z.literal("image.outpaint"),
      parameters: z
        .strictObject({
          left: padding,
          right: padding,
          top: padding,
          bottom: padding,
        })
        .refine((p) => p.left + p.right + p.top + p.bottom > 0),
    }),
    z.strictObject({
      ...common,
      capabilityId: z.literal("image.upscale"),
      parameters: z.strictObject({
        scale: z.union([z.literal(2), z.literal(4)]),
      }),
    }),
    z.strictObject({
      ...common,
      capabilityId: z.literal("image.layer-split"),
      parameters: z.strictObject({
        layers: z
          .array(z.string().trim().min(1).max(80))
          .min(2)
          .max(16)
          .refine((v) => new Set(v).size === v.length),
      }),
    }),
  ])
  .superRefine((value, ctx) => {
    const keys =
      value.capabilityId === "image.outpaint"
        ? ["left", "right", "top", "bottom"]
        : value.capabilityId === "image.upscale"
          ? ["scale"]
          : [];
    if (
      ["image", ...keys].some(
        (key) => !Object.hasOwn(value.workflow.bindings, key),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Required workflow binding is absent",
      });
    const count =
      value.capabilityId === "image.layer-split"
        ? value.parameters.layers.length
        : 1;
    if (value.workflow.outputNodeIds.length !== count)
      ctx.addIssue({
        code: "custom",
        message: "Output count must match capability parameters",
      });
  });
export type ImageCapabilitySpec = z.infer<typeof imageCapabilitySchema>;
export type ImageCapabilityId = z.infer<typeof imageCapabilityIdSchema>;

/** Clone the explicit API graph; never derive an algorithm or use later project state. */
export function bindImageCapabilityWorkflow(
  raw: unknown,
  uploadedImage: string,
  prompt: string,
): Record<string, unknown> {
  const spec = imageCapabilitySchema.parse(raw);
  const nodes = spec.workflow.nodes;
  const parameters: Record<string, unknown> = spec.parameters;
  for (const [name, target] of Object.entries(spec.workflow.bindings)) {
    nodes[target.nodeId].inputs[target.input] =
      name === "image"
        ? uploadedImage
        : name === "prompt"
          ? prompt
          : (parameters[name] as number);
  }
  return nodes;
}
