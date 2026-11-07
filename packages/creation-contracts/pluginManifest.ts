import { z } from "zod";
import semver from "semver";
import { permissionSchema } from "./capability.ts";
import { containsCredentialText } from "./securityText.ts";

export const PLUGIN_MANIFEST_MAX_BYTES = 128 * 1024;
export const PLUGIN_FILE_MAX_BYTES = 1024 * 1024;
export const PLUGIN_PACKAGE_MAX_BYTES = 4 * 1024 * 1024;
export const PLUGIN_RPC_MAX_BYTES = 64 * 1024;
export const PLUGIN_RPC_TIMEOUT_MS = 15_000;

const label = z.string().trim().min(1).max(160);
const version = z
  .string()
  .max(128)
  .refine((v) => semver.valid(v) !== null);
const range = z
  .string()
  .min(1)
  .max(128)
  .refine((v) => semver.validRange(v) !== null);
export const pluginPathSchema = z
  .string()
  .max(256)
  .regex(/^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/)
  .refine((v) => !v.split("/").some((part) => part === "." || part === ".."));

const node = z.strictObject({
  type: label,
  title: label,
  width: z.number().int().min(44).max(2000).default(320),
  height: z.number().int().min(44).max(2000).default(240),
});

export const pluginManifestSchema = z
  .strictObject({
    $schema: z.url().max(1024).optional(),
    id: z
      .string()
      .max(120)
      .regex(/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/),
    name: label,
    version,
    apiVersion: z.literal("1"),
    engines: z.strictObject({ kk: range }),
    platforms: z
      .array(z.enum(["desktop", "web", "mobile"]))
      .min(1)
      .max(3),
    trust: z.enum(["builtin", "first-party", "third-party"]),
    runtime: z.enum(["declarative", "iframe", "worker", "mcp"]),
    entry: pluginPathSchema.optional(),
    contributes: z.strictObject({
      nodes: z.array(node).max(32).default([]),
      capabilities: z
        .array(z.strictObject({ manifest: pluginPathSchema }))
        .max(32)
        .default([]),
      adapters: z
        .array(
          z.strictObject({
            id: label,
            kind: label,
            workflow: pluginPathSchema,
          }),
        )
        .max(32)
        .default([]),
      skills: z.array(pluginPathSchema).max(32).default([]),
    }),
    permissions: z.array(permissionSchema).max(64).default([]),
    integrity: z.strictObject({
      algorithm: z.literal("sha256"),
      files: z.record(pluginPathSchema, z.string().regex(/^[a-f0-9]{64}$/)),
    }),
    signature: z.null().optional(),
  })
  .superRefine((value, ctx) => {
    const reject = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (Object.keys(value.integrity.files).length > 32)
      reject("Too many plugin files");
    if (
      value.runtime !== "declarative" &&
      (!value.entry || !value.integrity.files[value.entry])
    )
      reject("Executable entry must have integrity");
    if (value.contributes.nodes.some((n) => !n.type.startsWith(`${value.id}:`)))
      reject("Node type must use the plugin ID namespace");
    if (
      new Set(value.contributes.nodes.map((n) => n.type)).size !==
      value.contributes.nodes.length
    )
      reject("Duplicate node contribution");
    if (new Set(value.permissions).size !== value.permissions.length)
      reject("Duplicate permission");
    if (containsCredentialText(JSON.stringify(value)))
      reject("Plugin manifest contains credentials");
  });
export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export function pluginManifestJsonSchema() {
  return z.toJSONSchema(pluginManifestSchema, { io: "input" });
}
