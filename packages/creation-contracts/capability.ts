import { z } from "zod";
import semver from "semver";
import { CREATION_CONTRACTS_VERSION } from "./contractVersion.ts";

export const capabilityIdSchema = z
  .string()
  .max(120)
  .regex(/^[a-z]+(?:\.[a-z]+(?:-[a-z]+)*)+$/);
const label = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value.trim().length > 0);
const version = z
  .string()
  .max(256)
  .regex(/^(0|[1-9]\d*)\./)
  .refine(
    (value) => !/\s/.test(value) && semver.valid(value) !== null,
    "Invalid semantic version",
  );
const versionRange = z
  .string()
  .min(1)
  .max(256)
  .refine(
    (value) => value.trim() === value && semver.validRange(value) !== null,
    "Invalid version range",
  );

export const permissionSchema = z.union([
  z.enum([
    "canvas:read",
    "canvas:write",
    "ai:generate",
    "asset:read",
    "asset:write",
    "storage:own",
    "filesystem:read",
  ]),
  z
    .templateLiteral(["network:", z.string().max(253)])
    .refine(
      (value) => z.hostname().safeParse(value.slice(8)).success,
      "Network permission requires an explicit hostname",
    ),
]);
export type CapabilityPermission = z.infer<typeof permissionSchema>;

const adapter = z.strictObject({
  id: z
    .string()
    .max(200)
    .regex(/^[a-z]+(?:\.[a-z]+(?:-[a-z]+)*)+\/[a-z]+(?:-[a-z]+)*$/),
  kind: z.enum(["provider-api", "comfyui", "local-algo", "external-tool"]),
  priority: z.number().int(),
  compat: versionRange,
});
const fallback = z
  .string()
  .max(377)
  .refine((value) => {
    const separator = value.indexOf("@");
    return (
      separator > 0 &&
      capabilityIdSchema.safeParse(value.slice(0, separator)).success &&
      version.safeParse(value.slice(separator + 1)).success
    );
  }, "Fallback requires capability.id@version");

/** Business capabilities are distinct from wire.ts's provider CapabilityManifest. */
export const capabilityManifestSchema = z
  .strictObject({
    id: capabilityIdSchema,
    version,
    title: label,
    kind: z.enum(["builtin", "plugin", "workflow"]),
    input: label,
    output: label,
    requires: z.strictObject({
      permissions: z.array(permissionSchema).max(128),
      modelTraits: z.array(label).max(128).default([]),
      resources: z.array(label).max(128).default([]),
    }),
    adapters: z.array(adapter).min(1).max(128),
    task: z.strictObject({
      progress: z.boolean(),
      cancellable: z.boolean(),
      resumable: z.boolean(),
      budget: z
        .strictObject({ maxMs: z.number().int().positive().safe().optional() })
        .optional(),
    }),
    lineage: z.strictObject({
      inputRoles: z.array(z.enum(["base", "mask", "reference"])).max(3),
      relation: z.enum(["derivedFrom", "variantOf", "compositeOf"]),
    }),
    uses: z.array(capabilityIdSchema).max(128).default([]),
    fallback: fallback.optional(),
    enabled: z.boolean().default(true),
    card: z
      .string()
      .max(256)
      .regex(/^docs\/features\/feat-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/),
    platforms: z
      .array(z.enum(["desktop", "web", "mobile"]))
      .min(1)
      .max(3),
    degrade: z
      .string()
      .min(1)
      .max(512)
      .refine((value) => value.trim().length > 0),
  })
  .superRefine((manifest, ctx) => {
    for (const [index, item] of manifest.adapters.entries()) {
      if (!item.id.startsWith(`${manifest.id}/`))
        ctx.addIssue({
          code: "custom",
          path: ["adapters", index, "id"],
          message: "Adapter belongs to another capability",
        });
    }
    if (
      !manifest.adapters.some((item) =>
        semver.satisfies(CREATION_CONTRACTS_VERSION, item.compat),
      )
    )
      ctx.addIssue({
        code: "custom",
        path: ["adapters"],
        message: "No adapter supports this contract version",
      });
    if (
      new Set(manifest.adapters.map((item) => item.id)).size !==
      manifest.adapters.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["adapters"],
        message: "Duplicate adapter identity",
      });
    if (
      manifest.uses.includes(manifest.id) ||
      new Set(manifest.uses).size !== manifest.uses.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["uses"],
        message: "Self dependency or duplicate capability dependency",
      });
    if (new Set(manifest.platforms).size !== manifest.platforms.length)
      ctx.addIssue({
        code: "custom",
        path: ["platforms"],
        message: "Duplicate platform",
      });
  });

export type BusinessCapabilityManifest = z.infer<
  typeof capabilityManifestSchema
>;

/** Version policy shared by the registry without importing another runtime dependency there. */
export function capabilityVersionMatches(
  candidate: string,
  range: string,
): boolean {
  return (
    version.safeParse(candidate).success &&
    versionRange.safeParse(range).success &&
    semver.satisfies(candidate, range)
  );
}
export function compareCapabilityVersions(left: string, right: string): number {
  return semver.compare(version.parse(left), version.parse(right));
}
export const capabilityTaskIdSchema = z.string().min(1);
export const capabilityTaskReferenceSchema = z.strictObject({
  projectId: z.string().min(1),
  taskId: capabilityTaskIdSchema,
});
