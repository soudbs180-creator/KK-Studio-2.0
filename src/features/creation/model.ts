import { sameJson } from "./chatMigration.ts";
import {
  providerProtocolSchema,
  providerAuthModeSchema,
  isProviderAuthAllowed,
  type ProviderProtocol,
  type ProviderAuthMode,
} from "../../domain/providerProtocol.ts";
import type {
  CanvasCollectionItem,
  CanvasItemKind,
  CanvasReferenceSlot,
} from "../../domain/canvasItems";
import { CANVAS_REFERENCE_SLOTS } from "../../domain/canvasItems.ts";
import {
  normalizeModelSelection,
  type ModelSelection,
} from "../../domain/modelSelection.ts";
import { normalizeTags } from "../../domain/assets.ts";
import {
  normalizeGoogleConversation,
  type GoogleConversation,
} from "../../domain/googleConversation.ts";
import type { ApprovalGate } from "../../domain/agentWorkflow";
import { isAssetReference } from "./snapshotAssets.ts";
import {
  createProjectCanvas,
  readProjectCanvas,
  type ProjectCanvas,
} from "../../domain/projectCanvas.ts";
import {
  normalizeReviewComments,
  type ReviewComment,
} from "../../domain/reviewWorkflow.ts";
import { normalizeStagePlans, type StagePlan } from "../../domain/stagePlan.ts";
import { readMaskDocument } from "../image-edit/mask.ts";
import {
  readImageEditSnapshot,
  readImageEditContext,
  type ImageEditSnapshot,
  type ImageEditContext,
} from "../image-edit/snapshot.ts";
import { normalizeTaskCostReceipt, type TaskCostReceipt } from "./taskState.ts";

export type CreationTaskStatus =
  | "queued"
  | "running"
  | "unknown"
  | "partial"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "offline"
  | "interrupted";

/** Durable boundary for a provider submission. Unknown must be reviewed before retry. */
export type CreationSubmissionState =
  "intent" | "submitted" | "unknown" | "terminal";

export type CreationOutputStatus =
  "waiting" | "running" | "unknown" | "succeeded" | "failed" | "cancelled";

export interface CreationTaskOutput {
  index: number;
  status: CreationOutputStatus;
  assetId?: string;
  /** Bounded plain text; a running output is a draft until terminal success. */
  text?: string;
  model: string;
  provider?: string;
  promptHash?: string;
  error?: string;
  createdAt: number;
}

export interface CreationAttachment {
  id: string;
  assetId?: string;
  originalAssetId?: string;
  name: string;
  mime: string;
  size: number;
  /** Semantic canvas role preserved through task preparation and persistence. */
  role?: CanvasReferenceSlot;
  /** Data URLs are used only for user selected, non-sensitive local assets. */
  dataUrl?: string;
}

export interface ChatItemDraft {
  text?: string;
  prompt?: string;
  attachments?: CreationAttachment[];
  pendingAgent?: string | boolean;
  modelSelection?: ModelSelection;
  conversationChannel?: "codex" | "direct" | "google";
  model?: string;
  kind?: CanvasItemKind;
  approvalMode?: "auto" | "ask";
  privacyMode?: "local_only" | "byok_local" | "platform_backed";
  outputCount?: number;
  updatedAt?: number;
  [k: string]: unknown;
}

export interface ChatItemMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "error";
  content: string;
  createdAt?: number;
  taskId?: string;
  [k: string]: unknown;
}

export interface ChatItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  draft: ChatItemDraft;
  messages: ChatItemMessage[];
  mainAgent: string;
  modelAllowlist: string[];
  agentThreadId?: string;
  googleConversation?: GoogleConversation | unknown;
  originChatId?: string;
  isTemporary?: boolean;
  [k: string]: unknown;
}

export interface CreationMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool" | "error";
  content: string;
  createdAt: number;
  [key: string]: unknown;
}

export interface CreationTask {
  imageEdit?: ImageEditSnapshot;
  imageEditContext?: ImageEditContext;
  id: string;
  /** Optional canvas node that originated this task submission. */
  sourceItemId?: string;
  /** Identifies the chat within the project that originated this task submission */
  originChatId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  status: CreationTaskStatus;
  /** Whether the provider request is known to be safe to retry. */
  submissionState?: CreationSubmissionState;
  /** Set once a durable task intent is marked as submitted. */
  submittedAt?: number;
  error?: string;
  resultItemId?: string;
  createdAt: number;
  updatedAt: number;
  /** The exact attachments used by this submission, never read from a later project state. */
  attachments: CreationAttachment[];
  attempt: number;
  /** Number of independent provider outputs requested by this task. */
  requestedOutputs: number;
  /** Number of results that were successfully archived. */
  completedOutputs: number;
  /** Exact completed slots retained for legacy tasks that have no output vector. */
  completedOutputIndices?: number[];
  /** Stable key used to prevent duplicate provider submissions after restart. */
  idempotencyKey: string;
  /** Optional batch grouping for UI progress and partial success. */
  batchId?: string;
  /** Privacy boundary selected when the task was submitted. */
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  /** Provider routing is captured at submission time; it is not a secret. */
  providerConnectionId?: string;
  /** Opaque system-vault reference for this connection. */
  providerCredentialRef?: string;
  /** Provider routing is captured at submission time; it is not a secret. */
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  /** Resolved provider size label (e.g. "1024x1024") captured at submission. */
  imageSize?: string;
  /** Per-output state used by the Batch Matrix. */
  outputs?: CreationTaskOutput[];
  /** Estimate only; an actual amount is shown only when a provider reports it. */
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  /** Traceable quote evidence; fixture/non-USD receipts do not become USD claims. */
  estimatedCostQuote?: TaskCostReceipt;
  actualCostReceipt?: TaskCostReceipt;
  approvedGates?: ApprovalGate[];
  retryOfTaskId?: string;
  retryOutputIndices?: number[];
}

export interface CreationProject {
  /** Non-secret Codex ownership; survives native snapshot/WebView recovery. */
  agentThreadId?: string;
  googleConversation?: GoogleConversation;
  agentGeneratedImageIds?: string[];
  canvas: ProjectCanvas;
  id: string;
  name: string;
  kind: CanvasItemKind;
  /** Missing on legacy projects; preserve those names as manually chosen. */
  nameSource?: "auto" | "manual";
  groupId?: string;
  /** Soft deletion retains this complete project and every original reference. */
  trashedAt?: number;
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  providerCredentialRef?: string;
  items: CanvasCollectionItem[];
  messages: CreationMessage[];
  tasks: CreationTask[];
  /** Agent 编排计划（Stage 状态机），本地持久化；无编排时为空。 */
  stagePlans?: StagePlan[];
  reviewComments?: ReviewComment[];
  favoriteIds: string[];
  likedIds: string[];
  customTags?: string[];
  // v3 Multi-Chat additions
  activeChatId?: string;
  chats?: Record<string, ChatItem>;
  /** Unsubmitted workbench text and attachments survive project switching. */
  composerDraft: CreationDraft;
  createdAt: number;
  updatedAt: number;
}

/** Strict v3 Project representation where activeChatId and chats are guaranteed */
export type CreationProjectV3 = CreationProject & {
  activeChatId: string;
  chats: Record<string, ChatItem>;
};

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

export type SidebarSortMode = "manual" | "recent" | "priority";

export interface SidebarPreferences {
  sortMode: SidebarSortMode;
  pinnedProjectIds: string[];
  pinnedGroupIds: string[];
}

export interface CreationSnapshotV2 {
  version: 2;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProject[];
  projectGroups?: CreationProjectGroup[];
  sidebarPreferences?: SidebarPreferences;
  homeDraft: CreationDraft;
}

export interface CreationProjectGroup {
  id: string;
  name: string;
  deletedAt?: number;
}

export interface CreationSnapshotV3 {
  version: 3;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProject[];
  projectGroups?: CreationProjectGroup[];
  sidebarPreferences?: SidebarPreferences;
  homeDraft: CreationDraft;
}

export type CreationSnapshot = CreationSnapshotV2 | CreationSnapshotV3;

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

export type ReasoningEffort = "low" | "medium" | "high";

export interface CreationDraft {
  modelSelection?: ModelSelection;
  conversationChannel?: "codex" | "direct" | "google";
  /** Only a new home request may seed the Agent editor from this pending draft. */
  pendingAgent?: boolean;
  providerConnectionId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  approvalMode: "auto" | "ask";
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  outputCount: number;
  reasoningEffort?: ReasoningEffort;
  updatedAt: number;
}

export interface CreateProjectInput {
  modelSelection?: ModelSelection;
  /** Preliminary binding check before request crops and masks are archived. */
  imageOperation?: "inpaint";
  imageEdit?: ImageEditSnapshot;
  imageEditContext?: ImageEditContext;
  providerConnectionId?: string;
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerProtocol?: ProviderProtocol;
  providerAuthMode?: ProviderAuthMode;
  providerName?: string;
  providerCredentialRef?: string;
  privacyMode?: "local_only" | "byok_local" | "platform_backed";
  outputCount?: number;
  /** Resolved provider size label (e.g. "1024x1024"); undefined sends no size. */
  imageSize?: string;
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

export function readCreationSnapshot(): CreationSnapshot {
  if (typeof window === "undefined") return emptySnapshot();
  try {
    const raw = window.localStorage.getItem(CREATION_STORAGE_KEY);
    if (!raw) return emptySnapshot();
    const parsed = JSON.parse(raw) as {
      version?: number;
      projects?: unknown[];
      activeProjectId?: unknown;
      revision?: number;
      homeDraft?: unknown;
    };
    if (parsed.version === 1 && Array.isArray(parsed.projects)) {
      return migrateV1(parsed);
    }
    if (
      (parsed.version !== 2 && parsed.version !== 3) ||
      !Array.isArray(parsed.projects)
    ) {
      return emptySnapshot();
    }
    return normalizeCreationSnapshot(parsed) ?? emptySnapshot();
  } catch {
    // Preserve malformed data. The UI can keep working in memory and saving is
    // deliberately attempted only after the user creates or edits a project.
    return emptySnapshot();
  }
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
    !Array.isArray(candidate.projects)
  )
    return null;
  if (!candidate.projects.every(isSnapshotProjectRoutingValid)) return null;

  const version = candidate.version as 2 | 3;
  const projects = candidate.projects
    .filter((project): project is CreationProject =>
      Boolean(
        project &&
        typeof project === "object" &&
        typeof (project as { id?: unknown }).id === "string" &&
        Array.isArray((project as { items?: unknown }).items),
      ),
    )
    .map((project) => normalizeProject(project, version));

  const projectGroups = candidate.projectGroups;
  if (
    projectGroups !== undefined &&
    (!Array.isArray(projectGroups) ||
      !projectGroups.every((group): group is CreationProjectGroup =>
        Boolean(
          group &&
          typeof group === "object" &&
          typeof group.id === "string" &&
          group.id.length > 0 &&
          group.id.length <= 160 &&
          typeof group.name === "string" &&
          group.name.trim().length > 0 &&
          group.name.length <= 120 &&
          (group.deletedAt === undefined ||
            (Number.isSafeInteger(group.deletedAt) && group.deletedAt >= 0)),
        ),
      ))
  )
    return null;
  if (
    projectGroups &&
    new Set(projectGroups.map((group) => group.id)).size !==
      projectGroups.length
  )
    return null;
  if (
    projects.some(
      (project) =>
        project.groupId &&
        !projectGroups?.some(
          (group) =>
            group.id === project.groupId && group.deletedAt === undefined,
        ),
    )
  )
    return null;

  const sidebarPreferences = candidate.sidebarPreferences;
  if (
    sidebarPreferences !== undefined &&
    !validSidebarPreferences(sidebarPreferences, projects, projectGroups ?? [])
  )
    return null;

  if (version === 3) {
    for (const project of projects) {
      if (
        !project.activeChatId ||
        !project.chats ||
        !project.chats[project.activeChatId]
      ) {
        return null;
      }
    }
  }

  const activeProjectId =
    typeof candidate.activeProjectId === "string" &&
    projects.some(
      (project) =>
        project.id === candidate.activeProjectId &&
        project.trashedAt === undefined,
    )
      ? candidate.activeProjectId
      : null;

  const revision =
    typeof candidate.revision === "number" &&
    Number.isSafeInteger(candidate.revision) &&
    candidate.revision >= 0
      ? candidate.revision
      : 0;

  if (version === 3) {
    return {
      ...(candidate as Record<string, unknown>),
      version: 3,
      revision,
      activeProjectId,
      projects,
      ...(projectGroups === undefined ? {} : { projectGroups }),
      ...(sidebarPreferences === undefined ? {} : { sidebarPreferences }),
      homeDraft: normalizeDraft(candidate.homeDraft),
    };
  }

  return {
    version: 2,
    revision,
    activeProjectId,
    projects,
    ...(projectGroups === undefined ? {} : { projectGroups }),
    ...(sidebarPreferences === undefined ? {} : { sidebarPreferences }),
    homeDraft: normalizeDraft(candidate.homeDraft),
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

function normalizeCanvasItem(
  value: CanvasCollectionItem,
): CanvasCollectionItem {
  const result = value.result;
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
    imageEditPrompt:
      typeof value.imageEditPrompt === "string"
        ? value.imageEditPrompt.slice(0, 2000)
        : undefined,
    imageEditReferenceIds: Array.isArray(value.imageEditReferenceIds)
      ? value.imageEditReferenceIds
          .filter(
            (id): id is string =>
              typeof id === "string" && /^asset-[a-f0-9]{24}$/.test(id),
          )
          .slice(0, 64)
      : undefined,
    id: safeText(value.id, 160),
    providerConnectionId:
      typeof value.providerConnectionId === "string"
        ? value.providerConnectionId.slice(0, 120)
        : undefined,
    generationSource: value.generationSource === "codex" ? "codex" : undefined,
    parameters: value.parameters
      ? {
          ratio: safeText(value.parameters.ratio, 30, "1:1"),
          imageSize:
            typeof value.parameters.imageSize === "string" &&
            /^\d{2,5}x\d{2,5}$/.test(value.parameters.imageSize)
              ? value.parameters.imageSize
              : undefined,
          quality: safeText(value.parameters.quality, 30, "1K"),
          duration: safeText(value.parameters.duration, 10, "7"),
          count: safeText(value.parameters.count, 10, "8"),
          soundEnabled: value.parameters.soundEnabled === true,
        }
      : undefined,
    title: safeText(value.title, 160),
    description: safeText(value.description, 500),
    kind: normalizeKind(value.kind),
    prompt:
      typeof value.prompt === "string"
        ? value.prompt.slice(
            0,
            value.kind === "video" || value.kind === "audio" ? 7500 : 4000,
          )
        : undefined,
    model:
      typeof value.model === "string" ? value.model.slice(0, 120) : undefined,
    assetId:
      typeof value.assetId === "string"
        ? value.assetId.slice(0, 160)
        : undefined,
    parentAssetId: safeText(value.parentAssetId, 160) || undefined,
    preview:
      typeof value.preview === "string"
        ? value.preview.slice(0, 16 * 1024 * 1024)
        : undefined,
    mediaWidth:
      typeof value.mediaWidth === "number" &&
      Number.isFinite(value.mediaWidth) &&
      value.mediaWidth > 1 &&
      value.mediaWidth <= 100_000
        ? Math.round(value.mediaWidth)
        : undefined,
    mediaHeight:
      typeof value.mediaHeight === "number" &&
      Number.isFinite(value.mediaHeight) &&
      value.mediaHeight > 1 &&
      value.mediaHeight <= 100_000
        ? Math.round(value.mediaHeight)
        : undefined,
    updatedAt:
      typeof value.updatedAt === "number" ? value.updatedAt : undefined,
    referenceMode: value.referenceMode === true ? true : undefined,
    referenceOnly: value.referenceOnly === true ? true : undefined,
    referenceSlot: (CANVAS_REFERENCE_SLOTS as readonly string[]).includes(
      value.referenceSlot as string,
    )
      ? (value.referenceSlot as CanvasCollectionItem["referenceSlot"])
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
    result:
      result &&
      typeof result.id === "string" &&
      typeof result.title === "string" &&
      typeof result.description === "string" &&
      (result.source === "demo" || result.source === "provider")
        ? {
            id: result.id.slice(0, 160),
            kind: normalizeKind(result.kind),
            title: result.title.slice(0, 160),
            src:
              typeof result.src === "string"
                ? result.src.slice(0, 16 * 1024 * 1024)
                : undefined,
            poster:
              typeof result.poster === "string"
                ? result.poster.slice(0, 16 * 1024 * 1024)
                : undefined,
            text:
              typeof result.text === "string"
                ? result.text.slice(0, 32768)
                : undefined,
            description: result.description.slice(0, 500),
            source: result.source,
          }
        : undefined,
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
  const rawTasks = (
    Array.isArray(candidate.tasks) ? candidate.tasks : []
  ) as Array<Record<string, unknown>>;

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
    agentThreadId:
      typeof candidate.agentThreadId === "string" &&
      /^[A-Za-z0-9_-]{1,160}$/.test(candidate.agentThreadId)
        ? candidate.agentThreadId
        : undefined,
    agentGeneratedImageIds: Array.isArray(candidate.agentGeneratedImageIds)
      ? candidate.agentGeneratedImageIds
          .filter(
            (id): id is string => typeof id === "string" && id.length <= 250,
          )
          .slice(-5000)
      : undefined,
    googleConversation: normalizeGoogleConversation(
      candidate.googleConversation,
    ),
    providerCredentialRef:
      typeof candidate.providerCredentialRef === "string" &&
      /^[A-Za-z0-9_-]{1,160}$/.test(candidate.providerCredentialRef)
        ? candidate.providerCredentialRef
        : undefined,
    items,
    messages: Array.isArray(candidate.messages)
      ? candidate.messages
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
            role: ["assistant", "system", "tool", "error"].includes(
              message.role,
            )
              ? message.role
              : ("user" as const),
            content: message.content,
            createdAt:
              typeof message.createdAt === "number"
                ? message.createdAt
                : Date.now(),
          }))
      : chats && activeChatId && chats[activeChatId]
        ? chats[activeChatId].messages.map((m) => ({
            id: safeText(m.id, 160),
            role: m.role === "system" ? ("system" as const) : ("user" as const),
            content: m.content.slice(0, 10000),
            createdAt: m.createdAt ?? Date.now(),
          }))
        : [],
    tasks: rawTasks
      .filter((task) =>
        Boolean(
          task &&
          typeof task.id === "string" &&
          typeof task.prompt === "string" &&
          typeof task.model === "string" &&
          typeof task.status === "string",
        ),
      )
      .map((task) => ({
        id: safeText(task.id, 160),
        sourceItemId: safeText(task.sourceItemId, 160) || undefined,
        originChatId: safeText(task.originChatId, 160) || undefined,
        prompt: safeText(task.prompt, 4000),
        model: safeText(task.model, 120),
        kind: normalizeKind(task.kind),
        status: normalizeTaskStatus(task.status),
        submissionState:
          task.submissionState === "submitted" ||
          task.submissionState === "unknown" ||
          task.submissionState === "terminal"
            ? task.submissionState
            : task.status === "running"
              ? "submitted"
              : task.status === "unknown"
                ? "unknown"
                : task.status === "succeeded" ||
                    task.status === "failed" ||
                    task.status === "cancelled" ||
                    task.status === "offline" ||
                    task.status === "partial"
                  ? "terminal"
                  : "intent",
        submittedAt:
          typeof task.submittedAt === "number" &&
          Number.isSafeInteger(task.submittedAt) &&
          task.submittedAt >= 0
            ? task.submittedAt
            : undefined,
        error:
          typeof task.error === "string" ? task.error.slice(0, 500) : undefined,
        resultItemId:
          typeof task.resultItemId === "string"
            ? task.resultItemId.slice(0, 160)
            : undefined,
        createdAt:
          typeof task.createdAt === "number" ? task.createdAt : Date.now(),
        updatedAt:
          typeof task.updatedAt === "number" ? task.updatedAt : Date.now(),
        attachments: Array.isArray(task.attachments)
          ? task.attachments.filter(isAttachment)
          : [],
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
        completedOutputIndices: normalizeCompletedOutputIndices(
          task.completedOutputIndices,
        ),
        idempotencyKey:
          typeof task.idempotencyKey === "string" && task.idempotencyKey
            ? task.idempotencyKey.slice(0, 200)
            : `${safeText(task.id, 160)}-attempt-1`,
        batchId:
          typeof task.batchId === "string"
            ? task.batchId.slice(0, 160)
            : undefined,
        privacyMode:
          task.privacyMode === "platform_backed" ||
          task.privacyMode === "byok_local"
            ? task.privacyMode
            : "byok_local",
        providerCredentialRef:
          typeof task.providerCredentialRef === "string" &&
          /^[A-Za-z0-9_-]{1,160}$/.test(task.providerCredentialRef)
            ? task.providerCredentialRef
            : undefined,
        providerConnectionId:
          typeof task.providerConnectionId === "string"
            ? task.providerConnectionId.slice(0, 160)
            : undefined,
        providerBaseUrl: safeBaseUrl(task.providerBaseUrl),
        ...creationProviderRouting(task),
        providerName: safeText(task.providerName, 80) || undefined,
        imageEdit: readImageEditSnapshot(task.imageEdit),
        imageEditContext: readImageEditContext(task.imageEditContext),
        imageSize:
          typeof task.imageSize === "string" &&
          /^\d{2,5}x\d{2,5}$/.test(task.imageSize)
            ? task.imageSize
            : undefined,
        outputs: Array.isArray(task.outputs)
          ? task.outputs.flatMap((output) => {
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
                typeof value.index === "number" &&
                Number.isSafeInteger(value.index)
                  ? Math.max(0, Math.min(63, value.index))
                  : 0;
              return [
                {
                  index,
                  status,
                  assetId:
                    typeof value.assetId === "string"
                      ? value.assetId.slice(0, 160)
                      : undefined,
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
            })
          : undefined,
        estimatedCostUsd: (() => {
          const quote = normalizeTaskCostReceipt(
            task.estimatedCostQuote,
            {
              id: safeText(task.id, 160),
              idempotencyKey:
                typeof task.idempotencyKey === "string" && task.idempotencyKey
                  ? task.idempotencyKey.slice(0, 200)
                  : "",
            },
            "estimate",
          );
          if (quote) {
            return quote.source === "provider" && quote.currency === "USD"
              ? quote.amount
              : undefined;
          }
          return typeof task.estimatedCostUsd === "number" &&
            Number.isFinite(task.estimatedCostUsd) &&
            task.estimatedCostUsd >= 0 &&
            task.estimatedCostUsd <= 1_000_000_000
            ? task.estimatedCostUsd
            : undefined;
        })(),
        actualCostUsd: (() => {
          const receipt = normalizeTaskCostReceipt(
            task.actualCostReceipt,
            {
              id: safeText(task.id, 160),
              idempotencyKey:
                typeof task.idempotencyKey === "string" && task.idempotencyKey
                  ? task.idempotencyKey.slice(0, 200)
                  : "",
            },
            "actual",
          );
          if (receipt) {
            return receipt.source === "provider" && receipt.currency === "USD"
              ? receipt.amount
              : undefined;
          }
          return typeof task.actualCostUsd === "number" &&
            Number.isFinite(task.actualCostUsd) &&
            task.actualCostUsd >= 0 &&
            task.actualCostUsd <= 1_000_000_000
            ? task.actualCostUsd
            : undefined;
        })(),
        estimatedCostQuote: normalizeTaskCostReceipt(
          task.estimatedCostQuote,
          {
            id: safeText(task.id, 160),
            idempotencyKey:
              typeof task.idempotencyKey === "string" && task.idempotencyKey
                ? task.idempotencyKey.slice(0, 200)
                : "",
          },
          "estimate",
        ),
        actualCostReceipt: normalizeTaskCostReceipt(
          task.actualCostReceipt,
          {
            id: safeText(task.id, 160),
            idempotencyKey:
              typeof task.idempotencyKey === "string" && task.idempotencyKey
                ? task.idempotencyKey.slice(0, 200)
                : "",
          },
          "actual",
        ),
        approvedGates: Array.isArray(task.approvedGates)
          ? task.approvedGates.filter(
              (gate): gate is ApprovalGate =>
                gate === "remote_transfer" ||
                gate === "high_cost_batch" ||
                gate === "overwrite_original" ||
                gate === "external_share" ||
                gate === "account_or_billing_change",
            )
          : undefined,
        retryOfTaskId: safeText(task.retryOfTaskId, 160) || undefined,
        retryOutputIndices: Array.isArray(task.retryOutputIndices)
          ? task.retryOutputIndices.filter(
              (index): index is number =>
                typeof index === "number" && Number.isSafeInteger(index),
            )
          : undefined,
      })),
    stagePlans: normalizeStagePlans(
      (candidate as unknown as Record<string, unknown>).stagePlans,
    ).filter((plan) => plan.projectId === projectId),
    reviewComments: normalizeReviewComments(
      (candidate as unknown as Record<string, unknown>).reviewComments,
    ),
    favoriteIds: Array.isArray(candidate.favoriteIds)
      ? candidate.favoriteIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.slice(0, 160))
      : [],
    likedIds: Array.isArray(candidate.likedIds)
      ? candidate.likedIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.slice(0, 160))
      : [],
    customTags: normalizeTags(candidate.customTags),
    composerDraft: candidate.composerDraft
      ? normalizeDraft(candidate.composerDraft)
      : {
          prompt: "",
          model: safeText(candidate.model, 120),
          kind: normalizeKind(candidate.kind),
          attachments,
          approvalMode: "auto",
          privacyMode: "byok_local",
          outputCount: 1,
          updatedAt: 0,
        },
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

function migrateV1(parsed: {
  projects?: unknown[];
  activeProjectId?: unknown;
}): CreationSnapshot {
  const projects = (parsed.projects ?? [])
    .filter((project): project is CreationProject =>
      Boolean(
        project &&
        typeof project === "object" &&
        typeof (project as { id?: unknown }).id === "string" &&
        Array.isArray((project as { items?: unknown }).items),
      ),
    )
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

export function persistCreationSnapshot(snapshot: CreationSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CREATION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Quota errors are surfaced by the caller's status state. A full UI reload
    // must never replace a valid in-memory project with an empty one.
  }
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
