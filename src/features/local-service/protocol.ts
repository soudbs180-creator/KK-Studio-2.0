import { z } from "zod";

export const COMPANION_PROTOCOL_VERSION = 1 as const;
export const MAX_COMPANION_ASSET_BYTES = 100 * 1024 * 1024;
export const MAX_COMPANION_BODY_BYTES = 120 * 1024 * 1024;

export const companionErrorCodes = [
  "SERVICE_UNAVAILABLE",
  "UNAUTHENTICATED",
  "CONFLICT",
  "INVALID_SNAPSHOT",
  "INVALID_ASSET",
  "IMPORT_ROLLBACK",
  "ORIGIN_FORBIDDEN",
  "INVALID_REQUEST",
  "PAIRING_INVALID",
  "PAIRING_USED",
  "PROTOCOL_UNSUPPORTED",
  "NOT_FOUND",
  "BODY_TOO_LARGE",
  "CORRUPT",
  "IO",
  "RESTORE_REQUIRED",
] as const;
export const companionErrorCodeSchema = z.enum(companionErrorCodes);
export type CompanionErrorCode = z.infer<typeof companionErrorCodeSchema>;

export class CompanionProtocolError extends Error {
  readonly code: CompanionErrorCode;
  readonly status: number;

  constructor(
    code: CompanionErrorCode,
    statusOrMessage: number | string = 400,
    message?: string,
  ) {
    const status = typeof statusOrMessage === "number" ? statusOrMessage : 400;
    super(
      typeof statusOrMessage === "string" ? statusOrMessage : (message ?? code),
    );
    this.name = "CompanionProtocolError";
    this.code = code;
    this.status = status;
  }
}

export const pairRequestSchema = z
  .object({
    code: z.string().trim().min(8).max(128),
  })
  .strict();

export const snapshotEnvelopeSchema = z
  .object({
    version: z.literal(2),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    activeProjectId: z.string().min(1).max(160).nullable(),
    projects: z.array(z.unknown()).max(10_000),
    homeDraft: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const snapshotPutSchema = z
  .object({
    expectedRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    snapshot: snapshotEnvelopeSchema,
  })
  .strict();
export type SnapshotPut = z.infer<typeof snapshotPutSchema>;

const supportedMime =
  /^(?:image\/(?:png|jpeg|webp|gif)|video\/(?:mp4|webm)|audio\/(?:mpeg|wav|ogg))$/i;
const sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i)
  .transform((value) => value.toLowerCase());
const assetIdSchema = z
  .string()
  .regex(/^asset-[a-f0-9]{24}$/i)
  .transform((value) => value.toLowerCase());

export const assetMetadataSchema = z
  .object({
    assetId: assetIdSchema,
    sha256: sha256Schema,
    mime: z.string().regex(supportedMime),
    size: z.number().int().min(1).max(MAX_COMPANION_ASSET_BYTES),
    tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    sourceJobId: z.string().max(200).optional(),
    promptHash: sha256Schema.optional(),
    parentId: assetIdSchema.optional(),
    isAiGenerated: z.boolean().optional(),
    source: z.enum(["provider", "upload"]).optional(),
    provenance: z
      .object({
        provider: z.string().max(80).optional(),
        model: z.string().max(120).optional(),
        providerRequestId: z.string().max(200).optional(),
        connectionId: z.string().max(160).optional(),
        c2paPresent: z.boolean().optional(),
        synthIdSignal: z.boolean().optional(),
        generatedAt: z.string().datetime().optional(),
      })
      .strict()
      .optional(),
    origins: z
      .array(
        z
          .object({
            sourceJobId: z.string().max(200).optional(),
            promptHash: sha256Schema.optional(),
            parentId: assetIdSchema.optional(),
            provenance: z
              .object({
                provider: z.string().max(80).optional(),
                model: z.string().max(120).optional(),
                providerRequestId: z.string().max(200).optional(),
                connectionId: z.string().max(160).optional(),
                c2paPresent: z.boolean().optional(),
                synthIdSignal: z.boolean().optional(),
                generatedAt: z.string().datetime(),
              })
              .strict(),
          })
          .strict(),
      )
      .max(200)
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.assetId !== `asset-${value.sha256.slice(0, 24).toLowerCase()}`)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assetId"],
        message: "assetId must be derived from sha256",
      });
  });
export type CompanionAssetMetadata = z.infer<typeof assetMetadataSchema>;

const safeRelativePath = z
  .string()
  .min(1)
  .max(240)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.split("/").includes(".."),
    "backup path must stay within the backup root",
  );

export const backupManifestSchema = z
  .object({
    protocolVersion: z.literal(COMPANION_PROTOCOL_VERSION),
    snapshotRevision: z.number().int().nonnegative(),
    files: z
      .array(
        z
          .object({
            path: safeRelativePath,
            sha256: sha256Schema,
            size: z.number().int().nonnegative().max(MAX_COMPANION_BODY_BYTES),
          })
          .strict(),
      )
      .max(20_000),
    manifestSha256: sha256Schema,
  })
  .strict();
export type CompanionBackupManifest = z.infer<typeof backupManifestSchema>;

export const migrationPreflightSchema = z
  .object({
    snapshot: snapshotEnvelopeSchema,
    assets: z.array(assetMetadataSchema).max(20_000),
    manifestSha256: sha256Schema,
  })
  .strict();
export type MigrationPreflight = z.infer<typeof migrationPreflightSchema>;

export const migrationImportSchema = z
  .object({
    reportId: z.string().uuid(),
    manifestSha256: sha256Schema,
    expectedRevision: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
    snapshot: snapshotEnvelopeSchema,
  })
  .strict();

export const backupRestoreSchema = z
  .object({
    backupId: z
      .string()
      .min(1)
      .max(180)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  })
  .strict();

export const healthResponseSchema = z
  .object({
    status: z.enum(["ok", "degraded"]),
    service: z.literal("kk-local-companion"),
    protocolVersion: z.literal(COMPANION_PROTOCOL_VERSION),
    deviceId: z.string().min(1).max(120),
  })
  .strict();

export function isAllowedCompanionOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
): boolean {
  return origin !== undefined && allowedOrigins.includes(origin);
}

const secretValue =
  /Bearer\s+\S+|sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,}|https?:\/\/[^\s/@]+:[^\s/@]+@|[?&](?:key|api_key|access_token|token|secret)=/i;

export function rejectCompanionSecrets(value: unknown): void {
  const walk = (item: unknown, depth: number): void => {
    if (depth > 16)
      throw new CompanionProtocolError(
        "INVALID_REQUEST",
        400,
        "input too deep",
      );
    if (typeof item === "string") {
      if (secretValue.test(item))
        throw new CompanionProtocolError(
          "INVALID_REQUEST",
          400,
          "secret in input",
        );
      return;
    }
    if (Array.isArray(item)) {
      for (const entry of item) walk(entry, depth + 1);
      return;
    }
    if (!item || typeof item !== "object") return;
    for (const [key, entry] of Object.entries(item)) {
      const normalizedKey = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
      const secretField =
        normalizedKey.endsWith("apikey") ||
        normalizedKey.endsWith("refreshtoken") ||
        normalizedKey.endsWith("accesstoken") ||
        normalizedKey.endsWith("authorization") ||
        normalizedKey.endsWith("password") ||
        normalizedKey.endsWith("secret") ||
        normalizedKey.endsWith("credentials") ||
        normalizedKey.endsWith("privatekey") ||
        normalizedKey === "session" ||
        normalizedKey.endsWith("sessiontoken") ||
        normalizedKey === "token";
      if (secretField)
        throw new CompanionProtocolError(
          "INVALID_REQUEST",
          400,
          "secret field in input",
        );
      walk(entry, depth + 1);
    }
  };
  walk(value, 0);
}
