import { z } from "zod";
import {
  hasProjectChatAuthorityConflict,
  isCreationProviderRoutingValid,
  normalizeCreationSnapshot,
  serializeCreationSnapshot,
  type ChatItem,
  type CreationProjectV3,
  type CreationSnapshot,
  type CreationSnapshotV3,
} from "./creationModel.ts";
import {
  providerAuthModeSchema,
  providerProtocolSchema,
} from "./providerProtocol.ts";

const id = z.string().min(1).max(160);
const threadId = id.regex(/^[A-Za-z0-9_-]{1,160}$/);
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
    text: z.string().optional(),
    model: z.string().optional(),
    kind: kind.optional(),
    attachments: z.array(attachment).optional(),
    pendingAgent: z.union([z.string(), z.boolean()]).optional(),
    updatedAt: number.optional(),
  })
  .passthrough();

const plugin = z
  .object({
    type: z.string().min(1),
    version: z.string().optional(),
    width: number.positive().optional(),
    height: number.positive().optional(),
    metadata: z
      .object({ content: z.string().optional() })
      .catchall(z.json())
      .optional(),
  })
  .catchall(z.json());

const item = z
  .object({
    id,
    title: z.string(),
    description: z.string(),
    kind,
    plugin: plugin.optional(),
    tags: z.array(z.string().max(40)).max(32).optional(),
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

const chatMessageSchema = z
  .object({
    id,
    content: z.string(),
    role: z.enum(["user", "assistant", "system", "tool", "error"]),
    createdAt: number.optional(),
    taskId: id.optional(),
  })
  .passthrough();

export const chatItemSchema = z
  .object({
    id,
    name: z.string(),
    createdAt: number.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    updatedAt: number.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    draft: draft.default({}),
    messages: z.array(chatMessageSchema).default([]),
    mainAgent: z.string().default("codex"),
    modelAllowlist: z.array(z.string().min(1).max(120)).max(64).default([]),
    agentThreadId: threadId.optional(),
    googleConversation: z.unknown().optional(),
    originChatId: id.optional(),
    isTemporary: z.boolean().optional(),
  })
  .passthrough();

const taskSchema = z
  .object({
    id,
    prompt: z.string(),
    model: z.string(),
    providerProtocol: providerProtocolSchema.optional(),
    providerAuthMode: providerAuthModeSchema.optional(),
    originChatId: id.optional(),
    submissionState: z
      .enum(["intent", "submitted", "unknown", "terminal"])
      .optional(),
    submittedAt: number
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    attachments: z.array(attachment).optional(),
    outputs: z
      .array(
        z
          .object({
            status: z
              .enum([
                "waiting",
                "running",
                "unknown",
                "succeeded",
                "failed",
                "cancelled",
              ])
              .optional(),
          })
          .passthrough(),
      )
      .optional(),
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
  .passthrough()
  .refine(isCreationProviderRoutingValid, "供应商协议或认证配置无效");

const projectV2Schema = z
  .object({
    id,
    activeChatId: id.optional(),
    agentThreadId: threadId.optional(),
    chats: z
      .record(
        z.string(),
        z.object({ id, agentThreadId: threadId.optional() }).passthrough(),
      )
      .optional(),
    providerProtocol: providerProtocolSchema.optional(),
    providerAuthMode: providerAuthModeSchema.optional(),
    items: z.array(item),
    name: z.string().optional(),
    nameSource: z.enum(["auto", "manual"]).optional(),
    groupId: id.optional(),
    trashedAt: number
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
    kind: kind.optional(),
    attachments: z.array(attachment).optional(),
    messages: z.array(chatMessageSchema).optional(),
    tasks: z.array(taskSchema).optional(),
    composerDraft: draft.optional(),
    favoriteIds: z.array(id).optional(),
    likedIds: z.array(id).optional(),
    customTags: z.array(z.string().max(40)).max(32).optional(),
  })
  .passthrough()
  .refine(isCreationProviderRoutingValid, "供应商协议或认证配置无效")
  .refine(
    (project) =>
      project.chats
        ? typeof project.activeChatId === "string" &&
          Object.hasOwn(project.chats, project.activeChatId) &&
          Object.entries(project.chats).every(([key, chat]) => chat.id === key)
        : project.activeChatId === undefined,
    "聊天身份不完整，禁止通过正常化修复原件",
  );

const projectV3Schema = z
  .object({
    id,
    activeChatId: id,
    chats: z.record(z.string(), chatItemSchema),
    items: z.array(item),
    name: z.string().optional(),
    kind: kind.optional(),
    attachments: z.array(attachment).optional(),
    providerProtocol: providerProtocolSchema.optional(),
    providerAuthMode: providerAuthModeSchema.optional(),
    tasks: z.array(taskSchema).optional(),
    favoriteIds: z.array(id).optional(),
    likedIds: z.array(id).optional(),
    customTags: z.array(z.string().max(40)).max(32).optional(),
    // Legacy fields preserved during migration
    messages: z.array(chatMessageSchema).optional(),
    composerDraft: draft.optional(),
    agentThreadId: threadId.optional(),
    googleConversation: z.unknown().optional(),
    agentGeneratedImageIds: z.array(z.string()).optional(),
  })
  .passthrough()
  .refine(isCreationProviderRoutingValid, "供应商协议或认证配置无效")
  .refine(
    (proj) => Boolean(proj.chats && proj.chats[proj.activeChatId]),
    "activeChatId 必须存在于 chats 字典中",
  )
  .refine((proj) => {
    if (!proj.chats) return false;
    for (const [key, chat] of Object.entries(proj.chats)) {
      if ((chat as ChatItem).id !== key) return false;
    }
    return true;
  }, "chat key 与 chat.id 必须一致");

const projectGroupSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(120),
    deletedAt: number
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict();

const sidebarPreferencesSchema = z
  .object({
    sortMode: z.enum(["manual", "recent", "priority"]),
    pinnedProjectIds: z.array(id),
    pinnedGroupIds: z.array(id),
  })
  .strict();

const schemaV2 = z.object({
  version: z.literal(2),
  revision: number.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  activeProjectId: id.nullable(),
  projects: z.array(projectV2Schema),
  projectGroups: z.array(projectGroupSchema).optional(),
  sidebarPreferences: sidebarPreferencesSchema.optional(),
  homeDraft: draft,
});

const schemaV3 = z.object({
  version: z.literal(3),
  revision: number.int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  activeProjectId: id.nullable(),
  projects: z.array(projectV3Schema),
  projectGroups: z.array(projectGroupSchema).optional(),
  sidebarPreferences: sidebarPreferencesSchema.optional(),
  homeDraft: draft.or(z.record(z.string(), z.unknown())),
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

export function rejectSecrets(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /^(api_?key|access_?token|oauth_?token|refresh_?token|client_?secret|bearer_?token|authorization|secret|secret_?key)$/i.test(
        key,
      )
    ) {
      throw new SnapshotStorageError("corrupt", "项目不能包含密钥或访问令牌。");
    }
    rejectSecrets(child);
  }
}

function validateChatRecord(chatId: string, chat: ChatItem): void {
  if (!chat || typeof chat !== "object") {
    throw new SnapshotStorageError(
      "corrupt",
      `Chat ${chatId} must be an object`,
    );
  }
  if (chat.id !== chatId) {
    throw new SnapshotStorageError(
      "corrupt",
      `Chat key ${chatId} does not match chat.id ${chat.id}`,
    );
  }
  if (!Array.isArray(chat.messages)) {
    throw new SnapshotStorageError(
      "corrupt",
      `Chat ${chatId} messages must be an array`,
    );
  }
  if (!Array.isArray(chat.modelAllowlist)) {
    throw new SnapshotStorageError(
      "corrupt",
      `Chat ${chatId} modelAllowlist must be an array`,
    );
  }
  if (typeof chat.mainAgent !== "string") {
    throw new SnapshotStorageError(
      "corrupt",
      `Chat ${chatId} mainAgent must be a string`,
    );
  }
}

function validateProjectRecord(project: CreationProjectV3): void {
  if (!project || typeof project !== "object") {
    throw new SnapshotStorageError("corrupt", "Project must be an object");
  }
  if (!project.id || typeof project.id !== "string") {
    throw new SnapshotStorageError(
      "corrupt",
      "Project id is missing or invalid",
    );
  }
  if (!project.activeChatId || typeof project.activeChatId !== "string") {
    throw new SnapshotStorageError(
      "corrupt",
      `Project ${project.id} missing activeChatId`,
    );
  }
  if (
    !project.chats ||
    typeof project.chats !== "object" ||
    Array.isArray(project.chats)
  ) {
    throw new SnapshotStorageError(
      "corrupt",
      `Project ${project.id} missing chats dictionary`,
    );
  }
  if (!project.chats[project.activeChatId]) {
    throw new SnapshotStorageError(
      "corrupt",
      `Project ${project.id} activeChatId ${project.activeChatId} not found in chats`,
    );
  }
  for (const [chatId, chat] of Object.entries(project.chats)) {
    validateChatRecord(chatId, chat);
  }
}

/**
 * Validate Snapshot v3 Schema per ADR-022 and tests/e2e/r2_snapshot_v3.test.ts.
 */
export function validateSnapshotV3(snapshot: unknown): CreationSnapshotV3 {
  if (!snapshot || typeof snapshot !== "object") {
    throw new SnapshotStorageError("corrupt", "Snapshot must be an object");
  }
  const s = snapshot as Record<string, unknown>;
  if (s.version !== 3) {
    throw new SnapshotStorageError(
      "unsupported",
      `Unsupported snapshot version: ${s.version}, expected 3`,
    );
  }
  if (
    typeof s.revision !== "number" ||
    !Number.isFinite(s.revision) ||
    s.revision < 0
  ) {
    throw new SnapshotStorageError("corrupt", "Invalid snapshot revision");
  }
  if (!Array.isArray(s.projects)) {
    throw new SnapshotStorageError("corrupt", "Projects must be an array");
  }

  rejectSecrets(s);

  for (const project of s.projects as CreationProjectV3[]) {
    validateProjectRecord(project);
  }

  return snapshot as CreationSnapshotV3;
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

function decodeSnapshotV3(value: unknown): CreationSnapshot {
  validateSnapshotV3(value);
  const parsed = schemaV3.safeParse(value);
  if (!parsed.success) {
    throw new SnapshotStorageError(
      "corrupt",
      "项目结构不完整，已暂停保存以保护原件。",
    );
  }
  if (
    parsed.data.projects.some((project) =>
      hasProjectChatAuthorityConflict(project as unknown as CreationProjectV3),
    )
  )
    throw new SnapshotStorageError(
      "corrupt",
      "聊天存在未迁移的旧权威字段，原件已保留。",
    );
  unique(parsed.data.projects, "项目");
  unique(parsed.data.projectGroups ?? [], "项目组");
  for (const project of parsed.data.projects) {
    if (
      project.groupId &&
      !parsed.data.projectGroups?.some(
        (group) =>
          group.id === project.groupId && group.deletedAt === undefined,
      )
    ) {
      throw new SnapshotStorageError(
        "corrupt",
        "项目分组引用无效，已暂停保存。",
      );
    }
    unique(project.items, "画布节点");
    unique(project.tasks ?? [], "任务");
    for (const [chatId, chat] of Object.entries(project.chats)) {
      unique((chat as ChatItem).messages ?? [], `对话[${chatId}]消息`);
    }
  }
  if (
    parsed.data.activeProjectId &&
    !parsed.data.projects.some(
      (project) => project.id === parsed.data.activeProjectId,
    )
  ) {
    throw new SnapshotStorageError("corrupt", "当前项目引用无效，已暂停保存。");
  }
  const snapshot = normalizeCreationSnapshot(value);
  if (!snapshot) throw new SnapshotStorageError("corrupt", "无法读取项目。");
  rejectLoss(value, snapshot);
  return snapshot;
}

function decodeSnapshotV2(value: unknown): CreationSnapshot {
  const parsed = schemaV2.safeParse(value);
  if (!parsed.success) {
    throw new SnapshotStorageError(
      "corrupt",
      "项目结构不完整，已暂停保存以保护原件。",
    );
  }
  unique(parsed.data.projects, "项目");
  unique(parsed.data.projectGroups ?? [], "项目组");
  for (const project of parsed.data.projects) {
    if (
      project.groupId &&
      !parsed.data.projectGroups?.some(
        (group) =>
          group.id === project.groupId && group.deletedAt === undefined,
      )
    )
      throw new SnapshotStorageError(
        "corrupt",
        "项目分组引用无效，已暂停保存。",
      );
    unique(project.items, "画布节点");
    unique(project.messages ?? [], "消息");
    unique(project.tasks ?? [], "任务");
  }
  if (
    parsed.data.activeProjectId &&
    !parsed.data.projects.some(
      (project) => project.id === parsed.data.activeProjectId,
    )
  ) {
    throw new SnapshotStorageError("corrupt", "当前项目引用无效，已暂停保存。");
  }

  const snapshot = normalizeCreationSnapshot(value);
  if (!snapshot) throw new SnapshotStorageError("corrupt", "无法读取项目。");
  rejectLoss(value, snapshot);
  return snapshot;
}

export function decodeSnapshot(value: unknown): CreationSnapshot {
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version !== 2 &&
    value.version !== 3
  ) {
    throw new SnapshotStorageError(
      "unsupported",
      "项目版本不受支持，未覆盖原件。",
    );
  }
  rejectSecrets(value);

  const v = (value as { version?: unknown })?.version;
  if (v === 3) {
    return decodeSnapshotV3(value);
  }
  return decodeSnapshotV2(value);
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

export const creationSnapshotCodec = {
  decode: decodeSnapshot,
  parse: parseSnapshot,
  serialize: serializeCreationSnapshot,
} satisfies import("../../packages/creation-contracts/ports.ts").StoragePort<CreationSnapshot>;
