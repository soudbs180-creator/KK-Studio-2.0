import { createHash } from "node:crypto";
import {
  COMPANION_PROTOCOL_VERSION,
  backupManifestSchema,
  type CompanionBackupManifest,
} from "./protocol.ts";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}

export function canonicalJson(value: unknown): string {
  const text = JSON.stringify(canonical(value));
  if (text === undefined) throw new Error("无法序列化清单值。");
  return text;
}

export function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sha256Json(value: unknown): string {
  return sha256Bytes(Buffer.from(canonicalJson(value), "utf8"));
}

export function createManifest(
  snapshotRevision: number,
  entries: Array<{ path: string; bytes: Uint8Array }>,
  createdAt = new Date().toISOString(),
): CompanionBackupManifest {
  const files = [...entries]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(({ path, bytes }) => ({
      path,
      sha256: sha256Bytes(bytes),
      size: bytes.byteLength,
    }));
  const unsigned = {
    protocolVersion: COMPANION_PROTOCOL_VERSION,
    snapshotRevision,
    createdAt,
    files,
  };
  return backupManifestSchema.parse({
    ...unsigned,
    manifestSha256: sha256Json(unsigned),
  });
}

export function verifyManifestHash(manifest: CompanionBackupManifest): boolean {
  const { manifestSha256, ...unsigned } = manifest;
  return manifestSha256 === sha256Json(unsigned);
}
