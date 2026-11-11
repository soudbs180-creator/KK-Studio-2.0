import { MEMORY_CONTENT_MAX_LENGTH, type MemoryRecord } from "./types.ts";

export function validMemoryRecord(value: unknown): value is MemoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<MemoryRecord>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.content === "string" &&
    record.content.trim().length > 0 &&
    record.content.length <= MEMORY_CONTENT_MAX_LENGTH &&
    [
      "user_profile",
      "user_preference",
      "user_habit",
      "user_constraint",
    ].includes(record.memoryType ?? "") &&
    typeof record.confidence === "number" &&
    Number.isFinite(record.confidence) &&
    record.confidence >= 0 &&
    record.confidence <= 1 &&
    typeof record.fingerprint === "string" &&
    record.fingerprint.length > 0 &&
    ["auto_rule", "manual_codex", "manual_user"].includes(
      record.source ?? "",
    ) &&
    (record.sourceThreadId === undefined ||
      typeof record.sourceThreadId === "string") &&
    typeof record.createdAt === "string" &&
    !Number.isNaN(Date.parse(record.createdAt)) &&
    typeof record.updatedAt === "string" &&
    !Number.isNaN(Date.parse(record.updatedAt)) &&
    (record.lastUsedAt === undefined ||
      (typeof record.lastUsedAt === "string" &&
        !Number.isNaN(Date.parse(record.lastUsedAt)))) &&
    typeof record.active === "boolean"
  );
}
