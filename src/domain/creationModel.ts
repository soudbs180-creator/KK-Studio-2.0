import { normalizeTaskCostReceipt } from "../../packages/creation-contracts/taskState.ts";
import type { ApprovalGate } from "./agentWorkflow";
import { isAssetReference } from "./assetReference.ts";
import { normalizeTags } from "./assets.ts";
import type { CanvasCollectionItem, CanvasItemKind } from "./canvasItems";
import { CANVAS_REFERENCE_SLOTS } from "./canvasItems.ts";
import { sameJson } from "./chatMigrationCore.ts";
import type {
  ChatItem,
  ChatItemDraft,
  ChatItemMessage,
  CreateProjectInput,
  CreationAttachment,
  CreationDraft,
  CreationMessage,
  CreationProject,
  CreationProjectGroup,
  CreationSnapshot,
  CreationSubmissionState,
  CreationTask,
  CreationTaskOutput,
  CreationTaskStatus,
  ReasoningEffort,
  SidebarPreferences,
} from "./creationTypes.ts";
import {
  normalizeGoogleConversation,
  type GoogleConversation,
} from "./googleConversation.ts";
import { readMaskDocument } from "./imageEditMask.ts";
import { imageCapabilitySchema } from "../../packages/creation-contracts/index.ts";
import {
  readImageEditContext,
  readImageEditSnapshot,
} from "./imageEditSnapshot.ts";
import { normalizeModelSelection } from "./modelSelection.ts";
import { createProjectCanvas, readProjectCanvas } from "./projectCanvas.ts";
import {
  isProviderAuthAllowed,
  providerAuthModeSchema,
  providerProtocolSchema,
} from "./providerProtocol.ts";
import { normalizeReviewComments } from "./reviewWorkflow.ts";
import { normalizeStagePlans } from "./stagePlan.ts";
export type * from "./creationTypes.ts";

/** Durable boundary for a provider submission. Unknown must be reviewed before retry. */

/** Strict v3 Project representation where activeChatId and chats are guaranteed */

/** Do not remove a project while its provider submission may still be active. */
export function projectHasUnsettledTasks(project: CreationProject): boolean {
  return (
    project.googleConversation?.status === "running" ||
    project.googleConversation?.status === "unknown" ||
    project.tasks.some(
      (task) =>
        ["queued", "running", "unknown"].includes(task.status) ||
        task.submissionState === "submitted" ||
        task.submissionState === "unknown" ||
        task.outputs?.some((output) =>
          ["waiting", "running", "unknown"].includes(output.status),
        ),
    )
  );
}

/** A persisted chat is the authority; root fields are only an in-memory component view. */

export function hasLegacyChatAuthority(value: unknown): boolean {
  const snapshot = value as { version?: unknown; projects?: unknown } | null;
  return (
    snapshot?.version === 3 &&
    Array.isArray(snapshot.projects) &&
    snapshot.projects.some(
      (project) =>
        project &&
        typeof project === "object" &&
        [
          "messages",
          "composerDraft",
          "agentThreadId",
          "googleConversation",
        ].some((key) => Object.hasOwn(project, key)),
    )
  );
}

/** Every supplied root value must be retained by the canonical chat before stripping a view. */
export function hasProjectChatAuthorityConflict(
  project: CreationProject,
): boolean {
  const fields = [
    "messages",
    "composerDraft",
    "agentThreadId",
    "googleConversation",
  ] as const;
  if (
    !fields.some(
      (key) => Object.hasOwn(project, key) && project[key] !== undefined,
    )
  )
    return false;
  if (!activeChat(project)) return true;
  const view = projectChatView(project);
  return fields.some((key) => {
    if (!Object.hasOwn(project, key) || project[key] === undefined)
      return false;
    if (
      key === "composerDraft" &&
      project.composerDraft &&
      typeof project.composerDraft === "object" &&
      !Array.isArray(project.composerDraft)
    )
      return Object.entries(project.composerDraft).some(
        ([field, value]) =>
          !sameJson(
            value,
            (view.composerDraft as unknown as Record<string, unknown>)[field],
          ),
      );
    return !sameJson(project[key], view[key]);
  });
}

/** Strip derived fields only: stale root state must never be copied into a chat here. */
export function serializeCreationSnapshot(
  snapshot: CreationSnapshot,
): CreationSnapshot {
  if (snapshot.version !== 3) return snapshot;
  return {
    ...snapshot,
    projects: snapshot.projects.map((project) => {
      if (hasProjectChatAuthorityConflict(project))
        throw new Error("聊天存在未迁移的旧权威字段，原件未覆盖。");
      const result = { ...project } as Partial<CreationProject>;
      delete result.messages;
      delete result.composerDraft;
      delete result.agentThreadId;
      delete result.googleConversation;
      return result as CreationProject;
    }),
  };
}

export function projectChatExecutionBlockReason(
  project: CreationProject | undefined,
): string | undefined {
  if (!project) return;
  if (
    project.agentThreadId !== undefined &&
    !/^[A-Za-z0-9_-]{1,160}$/.test(project.agentThreadId)
  )
    return "Agent 线程身份无效，已暂停执行以保留原件。";
  if (project.chats === null) return "聊天身份不完整，已暂停执行以保留原件。";
  if (!project.chats) {
    if (project.activeChatId !== undefined)
      return "聊天身份不完整，已暂停执行以保留原件。";
    return project.agentThreadId !== undefined &&
      !/^[A-Za-z0-9_-]{1,160}$/.test(project.agentThreadId)
      ? "Agent 线程身份无效，已暂停执行以保留原件。"
      : undefined;
  }
  if (Array.isArray(project.chats) || typeof project.chats !== "object")
    return "聊天身份不完整，已暂停执行以保留原件。";
  const chats = Object.values(project.chats);
  if (chats.some((chat) => !chat || chat.isTemporary))
    return "临时聊天隔离尚未完成，当前记录仅供恢复查看。";
  if (
    !activeChat(project) ||
    chats.some((chat) => project.chats?.[chat.id] !== chat)
  )
    return "聊天身份不完整，已暂停执行以保留原件。";
  const threads = chats
    .map((chat) => chat.agentThreadId)
    .filter((thread) => thread !== undefined);
  if (
    threads.some((thread) => !/^[A-Za-z0-9_-]{1,160}$/.test(thread!)) ||
    new Set(threads).size !== threads.length
  )
    return "Agent 线程身份无效或重复，已暂停执行以保留原件。";
}

export function snapshotWriteBlockReason(
  snapshot: CreationSnapshot,
): string | undefined {
  if (snapshot.version !== 2 && snapshot.version !== 3)
    return "项目版本不受支持，已暂停写入以保留原件。";
  const threads = new Set<string>();
  for (const project of snapshot.projects) {
    const reason = projectChatExecutionBlockReason(project);
    if (reason) return reason;
    if (snapshot.version === 3 && !activeChat(project))
      return "聊天身份不完整，已暂停写入以保留原件。";
    if (
      snapshot.version === 2 &&
      project.chats &&
      Object.keys(project.chats).length !== 1
    )
      return "旧多聊天记录尚未迁移，当前快照仅供恢复查看。";
    for (const chat of Object.values(project.chats ?? {})) {
      if (!chat.agentThreadId) continue;
      if (threads.has(chat.agentThreadId))
        return "Agent 线程归属重复，已暂停写入以保留原件。";
      threads.add(chat.agentThreadId);
    }
  }
}

export const CREATION_STORAGE_KEY = "kk-studio-next:creation:v1";

const TEXT_MODEL_PATTERN =
  /\b(gpt|claude|llama|qwen|mistral|deepseek|gemini|doubao|chat|text|o[134])\b/i;
/** Vendors reuse a shared prefix across text and image models; these terms mark an image model. */
const IMAGE_ONLY_MODEL_PATTERN =
  /(image|seedream|dall[-_ ]?e|video|audio|tts|speech|embed)/i;
/** Common chat/text model prefixes that are not image endpoints by default. */
const TEXT_PREFIXED_MODEL_PATTERN =
  /\b(gpt|claude|llama|qwen|mistral|deepseek|doubao)\b/i;
const IMAGE_HINT_PATTERN = /(image|vision|seedream|dall[-_ ]?e)/i;

export function modelSupportsKind(
  model: string,
  kind: CanvasItemKind,
): boolean {
  if (kind === "text")
    return (
      TEXT_MODEL_PATTERN.test(model.trim()) &&
      !IMAGE_ONLY_MODEL_PATTERN.test(model.trim())
    );
  if (kind !== "image") return false;
  const normalized = model.trim();
  if (!normalized) return false;
  if (/(video|h3|audio|tts|speech|text[-_ ]?only|embed)/i.test(normalized))
    return false;
  // Common chat/text model IDs are not image endpoints. Explicit image IDs
  // remain allowed even when a vendor includes a shared "gpt"/"doubao" prefix
  // (e.g. gpt-image-1, doubao-seedream-*).
  if (
    TEXT_PREFIXED_MODEL_PATTERN.test(normalized) &&
    !IMAGE_HINT_PATTERN.test(normalized)
  )
    return false;
  return true;
}

export const emptyDraft = (): CreationDraft => ({
  prompt: "",
  model: "",
  kind: "image",
  attachments: [],
  approvalMode: "auto",
  privacyMode: "byok_local",
  outputCount: 1,
  updatedAt: 0,
});

function projectId(): string {
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function itemId(project: string): string {
  return `${project}-prompt`;
}

export function createDefaultChat(
  id = "chat-default",
  name = "默认对话",
): ChatItem {
  const now = Date.now();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    draft: { ...emptyDraft() } as ChatItemDraft,
    messages: [],
    mainAgent: "codex",
    modelAllowlist: [],
  };
}

export function emptySnapshot(): CreationSnapshot {
  return {
    version: 2,
    revision: 0,
    activeProjectId: null,
    projects: [],
    homeDraft: emptyDraft(),
  };
}

function isCandidateProjectRecord(
  project: unknown,
): project is CreationProject {
  return Boolean(
    project &&
    typeof project === "object" &&
    typeof (project as { id?: unknown }).id === "string" &&
    Array.isArray((project as { items?: unknown }).items),
  );
}

function isCreationProjectGroup(group: unknown): group is CreationProjectGroup {
  if (!group || typeof group !== "object") return false;
  const candidate = group as Partial<CreationProjectGroup>;
  return (
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    candidate.id.length <= 160 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    candidate.name.length <= 120 &&
    (candidate.deletedAt === undefined ||
      (Number.isSafeInteger(candidate.deletedAt) && candidate.deletedAt >= 0))
  );
}

function areProjectGroupsValid(
  projectGroups: unknown,
  projects: CreationProject[],
): projectGroups is CreationProjectGroup[] | undefined {
  if (projectGroups !== undefined) {
    if (
      !Array.isArray(projectGroups) ||
      !projectGroups.every(isCreationProjectGroup)
    )
      return false;
    if (
      new Set(projectGroups.map((group) => group.id)).size !==
      projectGroups.length
    )
      return false;
  }
  return !projects.some(
    (project) =>
      project.groupId &&
      !projectGroups?.some(
        (group) =>
          group.id === project.groupId && group.deletedAt === undefined,
      ),
  );
}

function areV3ProjectChatsValid(projects: CreationProject[]): boolean {
  return projects.every((project) =>
    Boolean(
      project.activeChatId &&
      project.chats &&
      project.chats[project.activeChatId],
    ),
  );
}

function resolveNormalizedActiveProjectId(
  activeProjectId: unknown,
  projects: CreationProject[],
): string | null {
  return typeof activeProjectId === "string" &&
    projects.some(
      (project) =>
        project.id === activeProjectId && project.trashedAt === undefined,
    )
    ? activeProjectId
    : null;
}

function resolveNormalizedRevision(revision: unknown): number {
  return typeof revision === "number" &&
    Number.isSafeInteger(revision) &&
    revision >= 0
    ? revision
    : 0;
}

/**
 * Normalizes snapshots at every storage boundary. IndexedDB and Tauri data do
 * not pass through localStorage migration, so accepting a shallow cast there
 * would make an older snapshot crash the first render.
 */
export function normalizeCreationSnapshot(
  value: unknown,
): CreationSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as {
    version?: unknown;
    revision?: unknown;
    activeProjectId?: unknown;
    projects?: unknown;
    projectGroups?: unknown;
    sidebarPreferences?: unknown;
    homeDraft?: unknown;
  };
  if (
    (candidate.version !== 2 && candidate.version !== 3) ||
    !Array.isArray(candidate.projects) ||
    !candidate.projects.every(isSnapshotProjectRoutingValid)
  )
    return null;

  const version = candidate.version as 2 | 3;
  const projects = candidate.projects
    .filter(isCandidateProjectRecord)
    .map((project) => normalizeProject(project, version));

  const projectGroups = candidate.projectGroups;
  if (!areProjectGroupsValid(projectGroups, projects)) return null;

  const sidebarPreferences = candidate.sidebarPreferences;
  if (
    sidebarPreferences !== undefined &&
    !validSidebarPreferences(sidebarPreferences, projects, projectGroups ?? [])
  )
    return null;

  if (version === 3 && !areV3ProjectChatsValid(projects)) return null;

  const activeProjectId = resolveNormalizedActiveProjectId(
    candidate.activeProjectId,
    projects,
  );
  const revision = resolveNormalizedRevision(candidate.revision);
  const common = {
    revision,
    activeProjectId,
    projects,
    ...(projectGroups === undefined ? {} : { projectGroups }),
    ...(sidebarPreferences === undefined ? {} : { sidebarPreferences }),
    homeDraft: normalizeDraft(candidate.homeDraft),
  };

  if (version === 3) {
    return {
      ...(candidate as Record<string, unknown>),
      version: 3,
      ...common,
    };
  }
  return {
    version: 2,
    ...common,
  };
}

function validSidebarPreferences(
  value: unknown,
  projects: CreationProject[],
  groups: CreationProjectGroup[],
): value is SidebarPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const preferences = value as Partial<SidebarPreferences>;
  if (
    Object.keys(preferences).some(
      (key) =>
        !["sortMode", "pinnedProjectIds", "pinnedGroupIds"].includes(key),
    ) ||
    !["manual", "recent", "priority"].includes(preferences.sortMode ?? "")
  )
    return false;
  return (
    [
      [preferences.pinnedProjectIds, projects],
      [preferences.pinnedGroupIds, groups],
    ] as const
  ).every(([ids, records]) => {
    const recordIds = new Set(records.map((record) => record.id));
    return (
      Array.isArray(ids) &&
      new Set(ids).size === ids.length &&
      ids.every(
        (id) =>
          typeof id === "string" &&
          id.trim().length > 0 &&
          id.length <= 160 &&
          recordIds.has(id),
      )
    );
  });
}

function normalizeReasoningEffort(value: unknown): ReasoningEffort | undefined {
  if (value === "low" || value === "medium" || value === "high") {
    return value;
  }
  return undefined;
}

function normalizeDraft(value: unknown): CreationDraft {
  const candidate =
    value && typeof value === "object" ? (value as Partial<CreationDraft>) : {};
  return {
    ...candidate,
    modelSelection: normalizeModelSelection(candidate.modelSelection),
    conversationChannel:
      candidate.conversationChannel === "codex" ||
      candidate.conversationChannel === "direct" ||
      candidate.conversationChannel === "google"
        ? candidate.conversationChannel
        : undefined,
    pendingAgent:
      typeof candidate.pendingAgent === "boolean"
        ? candidate.pendingAgent
        : undefined,
    prompt: typeof candidate.prompt === "string" ? candidate.prompt : "",
    providerConnectionId:
      typeof candidate.providerConnectionId === "string"
        ? candidate.providerConnectionId.slice(0, 120)
        : undefined,
    model: typeof candidate.model === "string" ? candidate.model : "",
    kind:
      candidate.kind === "image" ||
      candidate.kind === "video" ||
      candidate.kind === "audio" ||
      candidate.kind === "text"
        ? candidate.kind
        : "image",
    attachments: Array.isArray(candidate.attachments)
      ? candidate.attachments.filter(isAttachment)
      : [],
    approvalMode: candidate.approvalMode === "ask" ? "ask" : "auto",
    privacyMode:
      candidate.privacyMode === "local_only" ||
      candidate.privacyMode === "platform_backed"
        ? candidate.privacyMode
        : "byok_local",
    outputCount:
      typeof candidate.outputCount === "number" &&
      Number.isFinite(candidate.outputCount)
        ? Math.max(1, Math.min(64, Math.floor(candidate.outputCount)))
        : 1,
    reasoningEffort: normalizeReasoningEffort(candidate.reasoningEffort),
    updatedAt:
      typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
  };
}

function isAttachment(value: unknown): value is CreationAttachment {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CreationAttachment>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.mime === "string" &&
    typeof item.size === "number" &&
    (!item.role ||
      (typeof item.role === "string" &&
        (CANVAS_REFERENCE_SLOTS as readonly string[]).includes(item.role))) &&
    (!item.dataUrl ||
      (typeof item.dataUrl === "string" &&
        (isAssetReference(item.dataUrl) ||
          (item.dataUrl.length <= 16 * 1024 * 1024 &&
            /^data:image\/(png|jpeg|webp|gif);base64,/i.test(item.dataUrl)))))
  );
}

function normalizeKind(value: unknown): CanvasItemKind {
  return value === "video" || value === "audio" || value === "text"
    ? value
    : "image";
}

function isCanvasItem(value: unknown): value is CanvasCollectionItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CanvasCollectionItem>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.description === "string"
  );
}

function normalizeTaskStatus(value: unknown): CreationTaskStatus {
  return value === "queued" ||
    value === "running" ||
    value === "unknown" ||
    value === "partial" ||
    value === "succeeded" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "offline" ||
    value === "interrupted"
    ? value
    : "failed";
}

function safeText(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}

function normalizeCompletedOutputIndices(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const indices = Array.from(
    new Set(
      value.filter(
        (index): index is number =>
          typeof index === "number" && Number.isSafeInteger(index),
      ),
    ),
  )
    .filter((index) => index >= 0 && index < 64)
    .sort((left, right) => left - right);
  return indices.length ? indices : undefined;
}

type RoutingCandidate = {
  providerBaseUrl?: unknown;
  providerProtocol?: unknown;
  providerAuthMode?: unknown;
};

/** Missing routing metadata is legacy; supplied values must never disappear on read. */
export function isCreationProviderRoutingValid(
  value: RoutingCandidate,
): boolean {
  const protocol = providerProtocolSchema
    .optional()
    .safeParse(value.providerProtocol);
  const authMode = providerAuthModeSchema
    .optional()
    .safeParse(value.providerAuthMode);
  if (!protocol.success || !authMode.success) return false;
  if (authMode.data !== "none") return true;
  if (
    typeof value.providerBaseUrl !== "string" ||
    !isProviderAuthAllowed({
      baseUrl: value.providerBaseUrl,
      protocol: protocol.data,
      authMode: authMode.data,
    })
  )
    return false;
  const host = new URL(value.providerBaseUrl).hostname.replace(/^\[|\]$/g, "");
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}

function isSnapshotProjectRoutingValid(value: unknown): boolean {
  if (!value || typeof value !== "object") return true;
  const project = value as Record<string, unknown>;
  return (
    isCreationProviderRoutingValid(project) &&
    (!Array.isArray(project.tasks) ||
      project.tasks.every(
        (task) =>
          !task ||
          typeof task !== "object" ||
          isCreationProviderRoutingValid(task),
      ))
  );
}

function creationProviderRouting(
  value: RoutingCandidate,
): Pick<CreationProject, "providerProtocol" | "providerAuthMode"> {
  if (!isCreationProviderRoutingValid(value))
    throw new Error(
      "供应商协议或认证配置无效；免密仅支持本机 Chat/Ollama 服务。",
    );
  return {
    ...(value.providerProtocol === undefined
      ? {}
      : {
          providerProtocol: providerProtocolSchema.parse(
            value.providerProtocol,
          ),
        }),
    ...(value.providerAuthMode === undefined
      ? {}
      : {
          providerAuthMode: providerAuthModeSchema.parse(
            value.providerAuthMode,
          ),
        }),
  };
}

function safeBaseUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function normalizeOptionalSlice(
  value: unknown,
  maxLength: number,
): string | undefined {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function normalizeMediaDimension(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 1 &&
    value <= 100_000
    ? Math.round(value)
    : undefined;
}

function normalizeImageSizeLabel(value: unknown): string | undefined {
  return typeof value === "string" && /^\d{2,5}x\d{2,5}$/.test(value)
    ? value
    : undefined;
}

function normalizeCanvasParameters(
  parameters: CanvasCollectionItem["parameters"],
): CanvasCollectionItem["parameters"] {
  if (!parameters) return undefined;
  return {
    ratio: safeText(parameters.ratio, 30, "1:1"),
    imageSize: normalizeImageSizeLabel(parameters.imageSize),
    quality: safeText(parameters.quality, 30, "1K"),
    duration: safeText(parameters.duration, 10, "7"),
    count: safeText(parameters.count, 10, "8"),
    soundEnabled: parameters.soundEnabled === true,
  };
}

function normalizeCanvasResult(
  result: CanvasCollectionItem["result"],
): CanvasCollectionItem["result"] {
  if (
    !result ||
    typeof result.id !== "string" ||
    typeof result.title !== "string" ||
    typeof result.description !== "string" ||
    (result.source !== "demo" && result.source !== "provider")
  )
    return undefined;
  return {
    id: result.id.slice(0, 160),
    kind: normalizeKind(result.kind),
    title: result.title.slice(0, 160),
    src: normalizeOptionalSlice(result.src, 16 * 1024 * 1024),
    poster: normalizeOptionalSlice(result.poster, 16 * 1024 * 1024),
    text: normalizeOptionalSlice(result.text, 32768),
    description: result.description.slice(0, 500),
    source: result.source,
  };
}

function normalizeCanvasReferenceFields(
  value: CanvasCollectionItem,
): Pick<
  CanvasCollectionItem,
  | "referenceMode"
  | "referenceOnly"
  | "referenceSlot"
  | "referenceFrame"
  | "generationStatus"
  | "generationIndex"
> {
  return {
    referenceMode: value.referenceMode === true ? true : undefined,
    referenceOnly: value.referenceOnly === true ? true : undefined,
    referenceSlot: (CANVAS_REFERENCE_SLOTS as readonly string[]).includes(
      value.referenceSlot as string,
    )
      ? (value.referenceSlot as CanvasCollectionItem["referenceSlot"])
      : undefined,
    referenceFrame:
      value.referenceFrame === "first" || value.referenceFrame === "last"
        ? value.referenceFrame
        : undefined,
    generationStatus:
      value.generationStatus === "pending" ||
      value.generationStatus === "ready" ||
      value.generationStatus === "error"
        ? value.generationStatus
        : undefined,
    generationIndex:
      typeof value.generationIndex === "number"
        ? value.generationIndex
        : undefined,
  };
}

function normalizeImageEditReferences(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter(
      (id): id is string =>
        typeof id === "string" && /^asset-[a-f0-9]{24}$/.test(id),
    )
    .slice(0, 64);
}

function normalizeCanvasItem(
  value: CanvasCollectionItem,
): CanvasCollectionItem {
  const promptMax =
    value.kind === "video" || value.kind === "audio" ? 7500 : 4000;
  return {
    tags: value.tags === undefined ? undefined : normalizeTags(value.tags),
    // Plugin content is durable project data, independently editable after a read.
    plugin:
      value.plugin === undefined ? undefined : structuredClone(value.plugin),
    imageEditDraft:
      value.imageEditDraft === undefined
        ? undefined
        : readMaskDocument(value.imageEditDraft),
    imageEditContext: readImageEditContext(value.imageEditContext),
    imageEditPrompt: normalizeOptionalSlice(value.imageEditPrompt, 2000),
    imageEditReferenceIds: normalizeImageEditReferences(
      value.imageEditReferenceIds,
    ),
    id: safeText(value.id, 160),
    providerConnectionId: normalizeOptionalSlice(
      value.providerConnectionId,
      120,
    ),
    generationSource: value.generationSource === "codex" ? "codex" : undefined,
    parameters: normalizeCanvasParameters(value.parameters),
    title: safeText(value.title, 160),
    description: safeText(value.description, 500),
    kind: normalizeKind(value.kind),
    prompt: normalizeOptionalSlice(value.prompt, promptMax),
    model: normalizeOptionalSlice(value.model, 120),
    assetId: normalizeOptionalSlice(value.assetId, 160),
    parentAssetId: safeText(value.parentAssetId, 160) || undefined,
    preview: normalizeOptionalSlice(value.preview, 16 * 1024 * 1024),
    mediaWidth: normalizeMediaDimension(value.mediaWidth),
    mediaHeight: normalizeMediaDimension(value.mediaHeight),
    updatedAt:
      typeof value.updatedAt === "number" ? value.updatedAt : undefined,
    ...normalizeCanvasReferenceFields(value),
    result: normalizeCanvasResult(value.result),
  };
}

function normalizeChatDraft(rawDraft: unknown): ChatItemDraft {
  const d =
    rawDraft && typeof rawDraft === "object"
      ? (rawDraft as Record<string, unknown>)
      : {};
  const text =
    typeof d.text === "string"
      ? d.text
      : typeof d.prompt === "string"
        ? d.prompt
        : "";
  const pendingAgent =
    typeof d.pendingAgent === "string"
      ? d.pendingAgent
      : typeof d.pendingAgent === "boolean"
        ? d.pendingAgent
        : undefined;
  return {
    ...d,
    ...normalizeDraft(d),
    text,
    pendingAgent,
  };
}

function normalizeChatMessages(raw: unknown): ChatItemMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m): m is Record<string, unknown> =>
      Boolean(
        m &&
        typeof m === "object" &&
        typeof (m as { id?: unknown }).id === "string" &&
        typeof (m as { content?: unknown }).content === "string",
      ),
    )
    .map((m) => ({
      ...m,
      id: safeText(m.id as string, 160),
      role: ["assistant", "system", "tool", "error"].includes(String(m.role))
        ? (m.role as ChatItemMessage["role"])
        : "user",
      content: m.content as string,
      createdAt:
        typeof m.createdAt === "number" && Number.isSafeInteger(m.createdAt)
          ? m.createdAt
          : undefined,
      taskId:
        typeof m.taskId === "string" ? safeText(m.taskId, 160) : undefined,
    }));
}

export function normalizeChat(
  candidate: unknown,
  fallbackId = "chat-default",
): ChatItem {
  const c = (
    candidate && typeof candidate === "object" ? candidate : {}
  ) as Partial<ChatItem>;
  const id =
    typeof c.id === "string" && c.id.trim() ? safeText(c.id, 160) : fallbackId;
  const name =
    typeof c.name === "string" && c.name.trim()
      ? safeText(c.name, 160)
      : "默认对话";
  const now = Date.now();
  const createdAt =
    typeof c.createdAt === "number" &&
    Number.isSafeInteger(c.createdAt) &&
    c.createdAt >= 0
      ? c.createdAt
      : now;
  const updatedAt =
    typeof c.updatedAt === "number" &&
    Number.isSafeInteger(c.updatedAt) &&
    c.updatedAt >= 0
      ? c.updatedAt
      : createdAt;
  const mainAgent =
    typeof c.mainAgent === "string" && c.mainAgent.trim()
      ? safeText(c.mainAgent, 60)
      : "codex";

  const modelAllowlist = Array.isArray(c.modelAllowlist)
    ? c.modelAllowlist
        .filter(
          (m): m is string => typeof m === "string" && m.trim().length > 0,
        )
        .map((m) => safeText(m, 120))
        .slice(0, 64)
    : [];

  return {
    ...c,
    id,
    name,
    createdAt,
    updatedAt,
    draft: normalizeChatDraft(c.draft),
    messages: normalizeChatMessages(c.messages),
    mainAgent,
    modelAllowlist,
    agentThreadId:
      typeof c.agentThreadId === "string" &&
      /^[A-Za-z0-9_-]{1,160}$/.test(c.agentThreadId)
        ? c.agentThreadId
        : undefined,
    googleConversation: c.googleConversation,
    originChatId:
      typeof c.originChatId === "string"
        ? safeText(c.originChatId, 160)
        : undefined,
    isTemporary: Boolean(c.isTemporary),
  };
}

function resolveProjectChats(
  candidate: Record<string, unknown>,
  version: 2 | 3,
): { chats?: Record<string, ChatItem>; activeChatId?: string } {
  let chats: Record<string, ChatItem> | undefined;
  let activeChatId: string | undefined;
  if (
    candidate.chats &&
    typeof candidate.chats === "object" &&
    !Array.isArray(candidate.chats)
  ) {
    chats = {};
    for (const [key, chatVal] of Object.entries(candidate.chats)) {
      chats[key] = normalizeChat(chatVal, key);
    }
  } else if (version === 3) {
    chats = { "chat-default": createDefaultChat() };
  }
  if (chats) {
    if (
      typeof candidate.activeChatId === "string" &&
      chats[candidate.activeChatId]
    ) {
      activeChatId = candidate.activeChatId;
    } else {
      activeChatId = Object.keys(chats)[0] ?? "chat-default";
    }
  }
  return { chats, activeChatId };
}

function normalizeProject(
  value: CreationProject | unknown,
  version: 2 | 3 = 2,
): CreationProject {
  const normalized = normalizeProjectFields(value, version);
  const raw = value as CreationProject;
  if (version !== 3) return normalized;
  const merge = <T>(defaults: T[], originals: T[] | undefined): T[] =>
    defaults.map((entry, index) => ({ ...entry, ...originals?.[index] }));
  return projectChatView({
    ...normalized,
    ...raw,
    items: merge(normalized.items, raw.items),
    tasks: merge(normalized.tasks, raw.tasks),
    chats: structuredClone(raw.chats),
    activeChatId: raw.activeChatId,
    createdAt: raw.createdAt ?? 0,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? 0,
  });
}

function isTokenIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(value);
}

function normalizeProjectMessages(
  rawMessages: unknown,
  chats: Record<string, ChatItem> | undefined,
  activeChatId: string | undefined,
): CreationMessage[] {
  if (Array.isArray(rawMessages)) {
    return rawMessages
      .filter((message) =>
        Boolean(
          message &&
          typeof message.id === "string" &&
          typeof message.content === "string",
        ),
      )
      .map((message) => ({
        ...message,
        id: safeText(message.id, 160),
        role: ["assistant", "system", "tool", "error"].includes(message.role)
          ? message.role
          : ("user" as const),
        content: message.content,
        createdAt:
          typeof message.createdAt === "number"
            ? message.createdAt
            : Date.now(),
      }));
  }
  if (chats && activeChatId && chats[activeChatId]) {
    return chats[activeChatId].messages.map((m) => ({
      id: safeText(m.id, 160),
      role: m.role === "system" ? ("system" as const) : ("user" as const),
      content: m.content.slice(0, 10000),
      createdAt: m.createdAt ?? Date.now(),
    }));
  }
  return [];
}

function resolveNormalizedSubmissionState(
  task: Record<string, unknown>,
): CreationSubmissionState {
  if (
    task.submissionState === "submitted" ||
    task.submissionState === "unknown" ||
    task.submissionState === "terminal"
  )
    return task.submissionState;
  if (task.status === "running") return "submitted";
  if (task.status === "unknown") return "unknown";
  if (
    task.status === "succeeded" ||
    task.status === "failed" ||
    task.status === "cancelled" ||
    task.status === "offline" ||
    task.status === "partial"
  )
    return "terminal";
  return "intent";
}

function normalizeTaskOutputEntry(
  output: unknown,
  task: Record<string, unknown>,
): CreationTaskOutput[] {
  if (!output || typeof output !== "object") return [];
  const value = output as Record<string, unknown>;
  const status =
    value.status === "running" ||
    value.status === "unknown" ||
    value.status === "succeeded" ||
    value.status === "failed" ||
    value.status === "cancelled"
      ? value.status
      : "waiting";
  const index =
    typeof value.index === "number" && Number.isSafeInteger(value.index)
      ? Math.max(0, Math.min(63, value.index))
      : 0;
  return [
    {
      index,
      status,
      assetId: normalizeOptionalSlice(value.assetId, 160),
      text:
        typeof value.text === "string" &&
        new TextEncoder().encode(value.text).length <= 32768
          ? value.text
          : undefined,
      model: safeText(value.model, 120, safeText(task.model, 120)),
      provider:
        safeText(value.provider, 80) ||
        safeText(task.providerName, 80) ||
        undefined,
      promptHash: safeText(value.promptHash, 120) || undefined,
      error: safeText(value.error, 500) || undefined,
      createdAt:
        typeof value.createdAt === "number"
          ? value.createdAt
          : typeof task.createdAt === "number"
            ? task.createdAt
            : Date.now(),
    },
  ];
}

function resolveNormalizedCostUsd(
  rawReceipt: unknown,
  rawCostUsd: unknown,
  taskIdentity: { id: string; idempotencyKey: string },
  stage: "estimate" | "actual",
): number | undefined {
  const receipt = normalizeTaskCostReceipt(rawReceipt, taskIdentity, stage);
  if (receipt) {
    return receipt.source === "provider" && receipt.currency === "USD"
      ? receipt.amount
      : undefined;
  }
  return typeof rawCostUsd === "number" &&
    Number.isFinite(rawCostUsd) &&
    rawCostUsd >= 0 &&
    rawCostUsd <= 1_000_000_000
    ? rawCostUsd
    : undefined;
}

const VALID_APPROVAL_GATES = new Set<ApprovalGate>([
  "remote_transfer",
  "high_cost_batch",
  "overwrite_original",
  "external_share",
  "account_or_billing_change",
]);

function normalizeTaskBounds(
  task: Record<string, unknown>,
): Pick<
  CreationTask,
  "submittedAt" | "attempt" | "requestedOutputs" | "completedOutputs"
> {
  return {
    submittedAt:
      typeof task.submittedAt === "number" &&
      Number.isSafeInteger(task.submittedAt) &&
      task.submittedAt >= 0
        ? task.submittedAt
        : undefined,
    attempt:
      typeof task.attempt === "number" && Number.isSafeInteger(task.attempt)
        ? Math.max(1, Math.min(100, task.attempt))
        : 1,
    requestedOutputs:
      typeof task.requestedOutputs === "number" &&
      Number.isFinite(task.requestedOutputs)
        ? Math.max(1, Math.min(64, Math.floor(task.requestedOutputs)))
        : 1,
    completedOutputs:
      typeof task.completedOutputs === "number" &&
      Number.isFinite(task.completedOutputs)
        ? Math.max(0, Math.floor(task.completedOutputs))
        : task.status === "succeeded"
          ? 1
          : 0,
  };
}

function normalizeTaskCostAndRetryFields(
  task: Record<string, unknown>,
  receiptIdentity: { id: string; idempotencyKey: string },
): Pick<
  CreationTask,
  | "estimatedCostUsd"
  | "actualCostUsd"
  | "estimatedCostQuote"
  | "actualCostReceipt"
  | "approvedGates"
  | "retryOfTaskId"
  | "retryOutputIndices"
> {
  return {
    estimatedCostUsd: resolveNormalizedCostUsd(
      task.estimatedCostQuote,
      task.estimatedCostUsd,
      receiptIdentity,
      "estimate",
    ),
    actualCostUsd: resolveNormalizedCostUsd(
      task.actualCostReceipt,
      task.actualCostUsd,
      receiptIdentity,
      "actual",
    ),
    estimatedCostQuote: normalizeTaskCostReceipt(
      task.estimatedCostQuote,
      receiptIdentity,
      "estimate",
    ),
    actualCostReceipt: normalizeTaskCostReceipt(
      task.actualCostReceipt,
      receiptIdentity,
      "actual",
    ),
    approvedGates: Array.isArray(task.approvedGates)
      ? task.approvedGates.filter((gate): gate is ApprovalGate =>
          VALID_APPROVAL_GATES.has(gate as ApprovalGate),
        )
      : undefined,
    retryOfTaskId: safeText(task.retryOfTaskId, 160) || undefined,
    retryOutputIndices: Array.isArray(task.retryOutputIndices)
      ? task.retryOutputIndices.filter(
          (index): index is number =>
            typeof index === "number" && Number.isSafeInteger(index),
        )
      : undefined,
  };
}

function normalizeProjectTask(task: Record<string, unknown>): CreationTask {
  const id = safeText(task.id, 160);
  const rawIdempotencyKey =
    typeof task.idempotencyKey === "string" && task.idempotencyKey
      ? task.idempotencyKey.slice(0, 200)
      : "";
  const receiptIdentity = { id, idempotencyKey: rawIdempotencyKey };
  return {
    id,
    sourceItemId: safeText(task.sourceItemId, 160) || undefined,
    originChatId: safeText(task.originChatId, 160) || undefined,
    prompt: safeText(task.prompt, 4000),
    model: safeText(task.model, 120),
    kind: normalizeKind(task.kind),
    status: normalizeTaskStatus(task.status),
    submissionState: resolveNormalizedSubmissionState(task),
    ...normalizeTaskBounds(task),
    error: normalizeOptionalSlice(task.error, 500),
    resultItemId: normalizeOptionalSlice(task.resultItemId, 160),
    createdAt: typeof task.createdAt === "number" ? task.createdAt : Date.now(),
    updatedAt: typeof task.updatedAt === "number" ? task.updatedAt : Date.now(),
    attachments: Array.isArray(task.attachments)
      ? task.attachments.filter(isAttachment)
      : [],
    completedOutputIndices: normalizeCompletedOutputIndices(
      task.completedOutputIndices,
    ),
    idempotencyKey: rawIdempotencyKey || `${id}-attempt-1`,
    batchId: normalizeOptionalSlice(task.batchId, 160),
    privacyMode:
      task.privacyMode === "platform_backed" ||
      task.privacyMode === "byok_local"
        ? task.privacyMode
        : "byok_local",
    providerCredentialRef: isTokenIdentifier(task.providerCredentialRef)
      ? task.providerCredentialRef
      : undefined,
    providerConnectionId: normalizeOptionalSlice(
      task.providerConnectionId,
      160,
    ),
    providerBaseUrl: safeBaseUrl(task.providerBaseUrl),
    ...creationProviderRouting(task),
    providerName: safeText(task.providerName, 80) || undefined,
    imageEdit: readImageEditSnapshot(task.imageEdit),
    imageCapability:
      task.imageCapability === undefined
        ? undefined
        : imageCapabilitySchema.parse(task.imageCapability),
    imageEditContext: readImageEditContext(task.imageEditContext),
    imageSize: normalizeImageSizeLabel(task.imageSize),
    outputs: Array.isArray(task.outputs)
      ? task.outputs.flatMap((output) => normalizeTaskOutputEntry(output, task))
      : undefined,
    ...normalizeTaskCostAndRetryFields(task, receiptIdentity),
  };
}

function isCandidateTaskRecord(task: unknown): task is Record<string, unknown> {
  if (!task || typeof task !== "object") return false;
  const candidate = task as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.prompt === "string" &&
    typeof candidate.model === "string" &&
    typeof candidate.status === "string"
  );
}

function normalizeStringIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.slice(0, 160));
}

function normalizeAgentGeneratedImageIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((id): id is string => typeof id === "string" && id.length <= 250)
    .slice(-5000);
}

function normalizeProjectComposerDraft(
  candidate: Record<string, unknown>,
  attachments: CreationAttachment[],
): CreationDraft {
  if (candidate.composerDraft) return normalizeDraft(candidate.composerDraft);
  return {
    prompt: "",
    model: safeText(candidate.model, 120),
    kind: normalizeKind(candidate.kind),
    attachments,
    approvalMode: "auto",
    privacyMode: "byok_local",
    outputCount: 1,
    updatedAt: 0,
  };
}

function normalizeProjectFields(
  value: CreationProject | unknown,
  version: 2 | 3 = 2,
): CreationProject {
  const candidate = value as unknown as Record<string, unknown>;
  const projectId = safeText(candidate.id, 160);
  const items = Array.isArray(candidate.items)
    ? candidate.items.filter(isCanvasItem).map(normalizeCanvasItem)
    : [];
  const attachments = Array.isArray(candidate.attachments)
    ? candidate.attachments.filter(isAttachment)
    : [];
  const rawTasks = Array.isArray(candidate.tasks) ? candidate.tasks : [];

  const { chats, activeChatId } = resolveProjectChats(candidate, version);
  return {
    canvas: readProjectCanvas(candidate.canvas, items),
    id: projectId,
    name: safeText(candidate.name, 120, "未命名项目"),
    nameSource: candidate.nameSource === "auto" ? "auto" : "manual",
    groupId:
      typeof candidate.groupId === "string" ? candidate.groupId : undefined,
    trashedAt:
      typeof candidate.trashedAt === "number" ? candidate.trashedAt : undefined,
    prompt: safeText(candidate.prompt, 4000),
    model: safeText(candidate.model, 120),
    kind: normalizeKind(candidate.kind),
    attachments,
    providerBaseUrl: safeBaseUrl(candidate.providerBaseUrl),
    ...creationProviderRouting(candidate),
    providerName: safeText(candidate.providerName, 80) || undefined,
    agentThreadId: isTokenIdentifier(candidate.agentThreadId)
      ? candidate.agentThreadId
      : undefined,
    agentGeneratedImageIds: normalizeAgentGeneratedImageIds(
      candidate.agentGeneratedImageIds,
    ),
    googleConversation: normalizeGoogleConversation(
      candidate.googleConversation,
    ),
    providerCredentialRef: isTokenIdentifier(candidate.providerCredentialRef)
      ? candidate.providerCredentialRef
      : undefined,
    items,
    messages: normalizeProjectMessages(candidate.messages, chats, activeChatId),
    tasks: rawTasks.filter(isCandidateTaskRecord).map(normalizeProjectTask),
    stagePlans: normalizeStagePlans(candidate.stagePlans).filter(
      (plan) => plan.projectId === projectId,
    ),
    reviewComments: normalizeReviewComments(candidate.reviewComments),
    favoriteIds: normalizeStringIdList(candidate.favoriteIds),
    likedIds: normalizeStringIdList(candidate.likedIds),
    customTags: normalizeTags(candidate.customTags),
    composerDraft: normalizeProjectComposerDraft(candidate, attachments),
    ...(chats ? { chats, activeChatId } : {}),
    createdAt:
      typeof candidate.createdAt === "number"
        ? candidate.createdAt
        : Date.now(),
    updatedAt:
      typeof candidate.updatedAt === "number"
        ? candidate.updatedAt
        : Date.now(),
  };
}

export function migrateV1(parsed: {
  projects?: unknown[];
  activeProjectId?: unknown;
}): CreationSnapshot {
  const projects = (parsed.projects ?? [])
    .filter(isCandidateProjectRecord)
    .map((project) => normalizeProject(project));
  return {
    version: 2,
    revision: 0,
    activeProjectId:
      typeof parsed.activeProjectId === "string"
        ? parsed.activeProjectId
        : null,
    projects,
    homeDraft: emptyDraft(),
  };
}

export function createProject(input: CreateProjectInput): CreationProject {
  const selection = normalizeModelSelection(input.modelSelection);
  const codex = selection && selection.source !== "api";
  const routing = creationProviderRouting(input);
  const id = projectId();
  const now = Date.now();
  const item: CanvasCollectionItem = {
    id: itemId(id),
    title: "图片创作",
    description: codex
      ? "Codex 内置生图"
      : input.model
        ? `${input.model} · 待执行`
        : "图片 · 待配置模型",
    kind: input.kind,
    prompt: input.prompt,
    model: input.model,
    generationSource: codex ? "codex" : undefined,
    providerConnectionId: codex ? undefined : input.providerConnectionId,
    updatedAt: now,
    generationStatus: codex ? undefined : "pending",
  };
  return {
    id,
    canvas: createProjectCanvas([item]),
    name: input.prompt.trim().replace(/\s+/g, " ").slice(0, 32) || "未命名项目",
    nameSource: "auto",
    kind: input.kind,
    prompt: input.prompt,
    model: input.model,
    attachments: input.attachments.map((attachment) => ({ ...attachment })),
    items: [item],
    messages: [
      {
        id: `${id}-message`,
        role: "user",
        content: input.prompt,
        createdAt: now,
      },
    ],
    tasks: [],
    favoriteIds: [],
    likedIds: [],
    customTags: [],
    providerBaseUrl: input.providerBaseUrl,
    ...routing,
    providerName: input.providerName,
    providerCredentialRef: input.providerCredentialRef,
    activeChatId: "chat-default",
    chats: {
      "chat-default": {
        id: "chat-default",
        name: "默认对话",
        createdAt: now,
        updatedAt: now,
        draft: {
          ...emptyDraft(),
          modelSelection: selection,
          conversationChannel: codex ? "codex" : "direct",
          providerConnectionId: codex ? undefined : input.providerConnectionId,
          model: input.model,
          kind: input.kind,
          attachments: input.attachments.map((attachment) => ({
            ...attachment,
          })),
          privacyMode: input.privacyMode ?? "byok_local",
          outputCount: input.outputCount ?? 1,
          updatedAt: now,
        },
        messages: [
          {
            id: `${id}-message`,
            role: "user",
            content: input.prompt,
            createdAt: now,
          },
        ],
        mainAgent: codex ? "codex" : "direct",
        modelAllowlist: [],
      },
    },
    composerDraft: {
      modelSelection: selection,
      providerConnectionId: codex ? undefined : input.providerConnectionId,
      prompt: "",
      model: input.model,
      kind: input.kind,
      attachments: input.attachments.map((attachment) => ({ ...attachment })),
      approvalMode: "auto",
      privacyMode: input.privacyMode ?? "byok_local",
      outputCount: input.outputCount ?? 1,
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createTask(project: CreationProject): CreationTask {
  const now = Date.now();
  return {
    id: `${project.id}-task-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    originChatId: project.activeChatId,
    prompt: project.prompt,
    model: project.model,
    kind: project.kind,
    status: "queued",
    submissionState: "intent",
    createdAt: now,
    updatedAt: now,
    attachments: project.attachments.map((attachment) => ({ ...attachment })),
    attempt: 1,
    requestedOutputs: Math.max(
      1,
      Math.min(64, Math.floor(project.composerDraft.outputCount || 1)),
    ),
    completedOutputs: 0,
    idempotencyKey: `${project.id}-generation-${now.toString(36)}`,
    batchId: `${project.id}-batch-${now.toString(36)}`,
    privacyMode: project.composerDraft.privacyMode,
    providerBaseUrl: project.providerBaseUrl,
    ...creationProviderRouting(project),
    providerName: project.providerName,
    providerCredentialRef: project.providerCredentialRef,
    outputs: Array.from(
      {
        length: Math.max(
          1,
          Math.min(64, Math.floor(project.composerDraft.outputCount || 1)),
        ),
      },
      (_, index) => ({
        index,
        status: "waiting" as const,
        model: project.model,
        provider: project.providerName,
        createdAt: now,
      }),
    ),
  };
}

/** A persisted chat is the authority; root fields are only an in-memory component view. */
export function activeChat(
  project: CreationProject | undefined,
): ChatItem | undefined {
  return project?.activeChatId &&
    project.chats &&
    Object.hasOwn(project.chats, project.activeChatId)
    ? project.chats[project.activeChatId]
    : undefined;
}

export function projectChatView(project: CreationProject): CreationProject {
  const chat = activeChat(project);
  if (!chat) return project;
  const draft = normalizeDraft(chat.draft);
  return {
    ...project,
    composerDraft: {
      ...draft,
      prompt: chat.draft.prompt ?? chat.draft.text ?? "",
    },
    messages: chat.messages as CreationMessage[],
    agentThreadId: chat.agentThreadId,
    googleConversation: chat.googleConversation as
      GoogleConversation | undefined,
  };
}

export function updateActiveChat(
  project: CreationProject,
  update: (chat: ChatItem) => ChatItem,
): CreationProject {
  const chat = activeChat(project);
  if (!chat) throw new Error("聊天身份不完整，未修改项目。");
  const next = update(chat);
  if (next.id !== chat.id) throw new Error("不能改变已有聊天身份。");
  return projectChatView({
    ...project,
    chats: { ...project.chats, [chat.id]: next },
  });
}
