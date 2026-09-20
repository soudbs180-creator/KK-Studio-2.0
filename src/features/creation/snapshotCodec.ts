import { z } from "zod";
import { normalizeCreationSnapshot, type CreationSnapshot } from "./model.ts";

const id = z.string().min(1).max(160);
const number = z.number().finite();
const kind = z.enum(["image", "video", "audio", "text"]);
const attachment = z
  .object({
    id,
    name: z.string(),
    mime: z.string(),
    size: number.nonnegative(),
    dataUrl: z.string().optional(),
  })
  .passthrough();
const draft = z
  .object({
    prompt: z.string().optional(),
    model: z.string().optional(),
    kind: kind.optional(),
    attachments: z.array(attachment).optional(),
    updatedAt: number.optional(),
  })
  .passthrough();
const item = z
  .object({
    id,
    title: z.string(),
    description: z.string(),
    kind,
    result: z
      .object({
        id,
        title: z.string(),
        description: z.string(),
        kind,
        source: z.enum(["demo", "provider"]),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
const project = z
  .object({
    id,
    items: z.array(item),
    name: z.string().optional(),
    kind: kind.optional(),
    attachments: z.array(attachment).optional(),
    messages: z
      .array(
        z
          .object({
            id,
            content: z.string(),
            role: z.enum(["user", "system"]),
            createdAt: number.optional(),
          })
          .passthrough(),
      )
      .optional(),
    tasks: z
      .array(
        z
          .object({
            id,
            prompt: z.string(),
            model: z.string(),
            status: z.enum([
              "queued",
              "running",
              "unknown",
              "partial",
              "succeeded",
              "failed",
              "cancelled",
              "offline",
              "interrupted",
            ]),
          })
          .passthrough(),
      )
      .optional(),
    composerDraft: draft.optional(),
    favoriteIds: z.array(id).optional(),
    likedIds: z.array(id).optional(),
  })
  .passthrough();
const schema = z.object({
  version: z.literal(2),
  revision: number.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  activeProjectId: id.nullable(),
  projects: z.array(project),
  homeDraft: draft,
});

export class SnapshotStorageError extends Error {
  readonly code: "corrupt" | "unsupported" | "io" | "conflict";
  constructor(
    code: "corrupt" | "unsupported" | "io" | "conflict",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}
export function storageError(error: unknown): SnapshotStorageError {
  if (error instanceof SnapshotStorageError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  if (detail.startsWith("missing:"))
    return new SnapshotStorageError(
      "corrupt",
      "项目引用的本地素材缺失；请恢复素材原件后重新读取。原项目已保留。",
    );
  const code = /^(conflict|unsupported|corrupt):/.exec(detail)?.[1] as
    SnapshotStorageError["code"] | undefined;
  return new SnapshotStorageError(
    code ?? "io",
    code === "conflict"
      ? "项目已被其他窗口更新，自动保存已暂停。"
      : code === "unsupported"
        ? "项目版本较新，请使用对应版本打开。"
        : code === "corrupt"
          ? "项目数据无法完整读取，原件已保留。"
          : "无法访问本地项目存储，请检查空间、权限或稍后重试。",
  );
}
function unique(values: { id: string }[], label: string): void {
  if (new Set(values.map((value) => value.id)).size !== values.length)
    throw new SnapshotStorageError(
      "corrupt",
      `${label}存在重复 ID，已暂停保存以保护原件。`,
    );
}
function rejectSecrets(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(api_?key|access_?token|oauth_?token|refresh_?token)$/i.test(key))
      throw new SnapshotStorageError("corrupt", "项目不能包含密钥或访问令牌。");
    rejectSecrets(child);
  }
}
/** An older normalizer can add defaults but must not erase content during a read. */
function rejectLoss(original: unknown, normalized: unknown): void {
  if (
    typeof original === "string" &&
    typeof normalized === "string" &&
    original.length > normalized.length &&
    original.startsWith(normalized)
  )
    throw new SnapshotStorageError(
      "corrupt",
      "项目字段超出当前读取范围；为避免截断，原件已保留。",
    );
  if (Array.isArray(original) && Array.isArray(normalized)) {
    if (original.length !== normalized.length)
      throw new SnapshotStorageError(
        "corrupt",
        "项目集合无法完整读取，原件已保留。",
      );
    original.forEach((value, index) => rejectLoss(value, normalized[index]));
  } else if (
    original &&
    normalized &&
    typeof original === "object" &&
    typeof normalized === "object"
  ) {
    for (const [key, value] of Object.entries(original))
      if (key in normalized)
        rejectLoss(value, (normalized as Record<string, unknown>)[key]);
  }
}
export function decodeSnapshot(value: unknown): CreationSnapshot {
  rejectSecrets(value);
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version !== 2
  )
    throw new SnapshotStorageError(
      "unsupported",
      "项目版本不受支持，未覆盖原件。",
    );
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new SnapshotStorageError(
      "corrupt",
      "项目结构不完整，已暂停保存以保护原件。",
    );
  unique(parsed.data.projects, "项目");
  for (const project of parsed.data.projects) {
    unique(project.items, "画布节点");
    unique(project.messages ?? [], "消息");
    unique(project.tasks ?? [], "任务");
  }
  if (
    parsed.data.activeProjectId &&
    !parsed.data.projects.some(
      (project) => project.id === parsed.data.activeProjectId,
    )
  )
    throw new SnapshotStorageError("corrupt", "当前项目引用无效，已暂停保存。");
  // Validate before normalization so malformed collections cannot become writable empty data.
  const snapshot = normalizeCreationSnapshot(value);
  if (!snapshot) throw new SnapshotStorageError("corrupt", "无法读取项目。");
  rejectLoss(value, snapshot);
  return snapshot;
}
export function parseSnapshot(raw: string): CreationSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new SnapshotStorageError("corrupt", "项目 JSON 损坏，原件已保留。");
  }
  return decodeSnapshot(value);
}
