import { z } from "zod";
import { isAllowedProviderUrl } from "./providerUrl.ts";

/** Credentials are referenced by id only; secret material lives in a vault. */
export const connectionKindSchema = z.enum([
  "managed_api",
  "user_byok",
  "user_oauth_local",
  "local_comfyui",
]);
export type ConnectionKind = z.infer<typeof connectionKindSchema>;

export const connectionStateSchema = z.enum([
  "active",
  "degraded",
  "cooldown",
  "quarantined",
  "disabled",
]);
export type ConnectionState = z.infer<typeof connectionStateSchema>;

/**
 * A saved connection can be schedulable before it has produced an image.
 * Keep this separate from connectionState: active means the scheduler may
 * attempt the connection, while verified means an actual image generation
 * completed successfully for this saved connection.
 */
export const providerVerificationStatusSchema = z.enum([
  "unverified",
  "verified",
]);
export type ProviderVerificationStatus = z.infer<
  typeof providerVerificationStatusSchema
>;

export const capabilityManifestSchema = z.object({
  modalities: z.array(z.enum(["text", "image", "video", "audio"])),
  operations: z.array(
    z.enum([
      "generate",
      "edit",
      "inpaint",
      "outpaint",
      "image_to_video",
      "first_last_frame",
      "subject_reference",
      "batch",
    ]),
  ),
  maxReferences: z.number().int().positive().optional(),
  maxOutputs: z.number().int().positive().optional(),
  maxResolution: z.string().max(40).optional(),
  async: z.boolean(),
  estimatedLatencyClass: z
    .enum(["realtime", "interactive", "batch"])
    .optional(),
});
export type CapabilityManifest = z.infer<typeof capabilityManifestSchema>;

export const providerConnectionSchema = z.object({
  id: z.string().min(1).max(120),
  provider: z.string().min(1).max(80),
  kind: connectionKindSchema,
  displayName: z.string().min(1).max(120),
  /** Non-secret endpoint metadata used to switch between saved connections. */
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          isAllowedProviderUrl(value) &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash
        );
      } catch {
        return false;
      }
    }, "连接地址不能包含账号、密钥参数或片段")
    .optional(),
  /** Opaque reference into the system credential vault; never the secret itself. */
  credentialRef: z
    .string()
    .max(160)
    .regex(/^[A-Za-z0-9_-]+$/, "凭据只能保存不透明引用")
    .optional(),
  model: z.string().max(120).optional(),
  capabilities: capabilityManifestSchema,
  state: connectionStateSchema,
  concurrencyLimit: z.number().int().positive().max(256),
  activeJobs: z.number().int().nonnegative().optional(),
  cooldownUntil: z.number().int().nonnegative().optional(),
  quotaPolicyId: z.string().max(120).optional(),
  lastHealthCheckAt: z.string().datetime().optional(),
  /** Monotonic observation identity; timestamps alone can collide. */
  healthRevision: z.number().int().nonnegative().safe().optional(),
  /** Set only after a real image generation has returned an image. */
  verificationStatus: providerVerificationStatusSchema.optional(),
  lastSuccessfulGenerationAt: z.string().datetime().optional(),
  /** Opaque local lease identities prevent a stale task releasing a re-added connection. */
  activeLeaseIds: z.array(z.string().min(1).max(96)).max(256).optional(),
});
export type ProviderConnection = z.infer<typeof providerConnectionSchema>;

export const DEFAULT_LOCAL_CONNECTION: ProviderConnection = {
  id: "local-comfyui",
  provider: "ComfyUI",
  kind: "local_comfyui",
  displayName: "本地 ComfyUI",
  baseUrl: "http://127.0.0.1:8188",
  capabilities: {
    modalities: ["image", "video"],
    operations: ["generate", "edit", "inpaint", "outpaint", "batch"],
    maxReferences: 10,
    maxOutputs: 64,
    async: true,
    estimatedLatencyClass: "interactive",
  },
  state: "active",
  concurrencyLimit: 1,
  verificationStatus: "unverified",
};

/** Expiry permits another attempt; it does not claim a successful health probe. */
export function isConnectionReady(
  connection: Pick<ProviderConnection, "state" | "cooldownUntil">,
  now = Date.now(),
): boolean {
  const deadline = connection.cooldownUntil;
  if (deadline !== undefined && (!Number.isFinite(deadline) || deadline > now))
    return false;
  return (
    connection.state === "active" ||
    (connection.state === "cooldown" &&
      deadline !== undefined &&
      deadline <= now)
  );
}

export function canScheduleConnection(
  connection: ProviderConnection,
  kind: "image" | "video" | "audio" | "text",
  operation: CapabilityManifest["operations"][number] = "generate",
  now = Date.now(),
): boolean {
  return (
    isConnectionReady(connection, now) &&
    connection.capabilities.modalities.includes(kind) &&
    connection.capabilities.operations.includes(operation)
  );
}

/** Interactive OAuth sessions are deliberately excluded from managed pools. */
export function canEnterManagedPool(connection: ProviderConnection): boolean {
  return (
    connection.kind === "managed_api" ||
    connection.kind === "user_byok" ||
    connection.kind === "local_comfyui"
  );
}

/**
 * Legacy records did not carry verification metadata. A timestamp is also
 * accepted as verified so an interrupted write cannot downgrade a known-good
 * connection when the status field is absent.
 */
export function isProviderGenerationVerified(
  connection: Pick<
    ProviderConnection,
    "verificationStatus" | "lastSuccessfulGenerationAt"
  >,
): boolean {
  return (
    connection.verificationStatus === "verified" ||
    connection.lastSuccessfulGenerationAt !== undefined
  );
}
