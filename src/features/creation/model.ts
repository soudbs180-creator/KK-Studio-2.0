import type {
  CanvasCollectionItem,
  CanvasItemKind,
} from "../../domain/canvasItems";
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
  model: string;
  provider?: string;
  promptHash?: string;
  error?: string;
  createdAt: number;
}

export interface CreationAttachment {
  id: string;
  assetId?: string;
  name: string;
  mime: string;
  size: number;
  /** Data URLs are used only for user selected, non-sensitive local assets. */
  dataUrl?: string;
}

export interface CreationMessage {
  id: string;
  role: "user" | "system";
  content: string;
  createdAt: number;
}

export interface CreationTask {
  id: string;
  /** Optional canvas node that originated this task submission. */
  sourceItemId?: string;
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
  providerName?: string;
  /** Per-output state used by the Batch Matrix. */
  outputs?: CreationTaskOutput[];
  /** Estimate only; an actual amount is shown only when a provider reports it. */
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  approvedGates?: ApprovalGate[];
  retryOfTaskId?: string;
  retryOutputIndices?: number[];
}

export interface CreationProject {
  canvas: ProjectCanvas;
  id: string;
  name: string;
  kind: CanvasItemKind;
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerName?: string;
  providerCredentialRef?: string;
  items: CanvasCollectionItem[];
  messages: CreationMessage[];
  tasks: CreationTask[];
  reviewComments?: ReviewComment[];
  favoriteIds: string[];
  likedIds: string[];
  /** Unsubmitted workbench text and attachments survive project switching. */
  composerDraft: CreationDraft;
  createdAt: number;
  updatedAt: number;
}

export interface CreationSnapshot {
  version: 2;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProject[];
  homeDraft: CreationDraft;
}

export interface CreationDraft {
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  approvalMode: "auto" | "ask";
  privacyMode: "local_only" | "byok_local" | "platform_backed";
  outputCount: number;
  updatedAt: number;
}

export interface CreateProjectInput {
  prompt: string;
  model: string;
  kind: CanvasItemKind;
  attachments: CreationAttachment[];
  providerBaseUrl?: string;
  providerName?: string;
  providerCredentialRef?: string;
  privacyMode?: "local_only" | "byok_local" | "platform_backed";
  outputCount?: number;
}

export const CREATION_STORAGE_KEY = "kk-studio-next:creation:v1";

export function modelSupportsKind(
  model: string,
  kind: CanvasItemKind,
): boolean {
  if (kind !== "image") return false;
  const normalized = model.trim();
  if (!normalized) return false;
  if (/(video|h3|audio|tts|speech|text[-_ ]?only|embed)/i.test(normalized))
    return false;
  // Common chat/text model IDs are not image endpoints. Explicit image IDs
  // remain allowed even when a vendor includes a shared "gpt" prefix.
  if (
    /\b(gpt|claude|llama|qwen|mistral|deepseek)\b/i.test(normalized) &&
    !/(image|vision|dall[-_ ]?e)/i.test(normalized)
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
    if (parsed.version !== 2 || !Array.isArray(parsed.projects)) {
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
    homeDraft?: unknown;
  };
  if (candidate.version !== 2 || !Array.isArray(candidate.projects))
    return null;
  const projects = candidate.projects
    .filter((project): project is CreationProject =>
      Boolean(
        project &&
        typeof project === "object" &&
        typeof (project as { id?: unknown }).id === "string" &&
        Array.isArray((project as { items?: unknown }).items),
      ),
    )
    .map(normalizeProject);
  const activeProjectId =
    typeof candidate.activeProjectId === "string" &&
    projects.some((project) => project.id === candidate.activeProjectId)
      ? candidate.activeProjectId
      : null;
  return {
    version: 2,
    revision:
      typeof candidate.revision === "number" &&
      Number.isSafeInteger(candidate.revision) &&
      candidate.revision >= 0
        ? candidate.revision
        : 0,
    activeProjectId,
    projects,
    homeDraft: normalizeDraft(candidate.homeDraft),
  };
}

function normalizeDraft(value: unknown): CreationDraft {
  const candidate =
    value && typeof value === "object" ? (value as Partial<CreationDraft>) : {};
  return {
    prompt: typeof candidate.prompt === "string" ? candidate.prompt : "",
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
    id: safeText(value.id, 160),
    parameters: value.parameters
      ? {
          ratio: safeText(value.parameters.ratio, 30, "1:1"),
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
        ? value.prompt.slice(0, 4000)
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
    updatedAt:
      typeof value.updatedAt === "number" ? value.updatedAt : undefined,
    referenceMode: value.referenceMode === true ? true : undefined,
    referenceOnly: value.referenceOnly === true ? true : undefined,
    referenceSlot:
      value.referenceSlot === "主体" ||
      value.referenceSlot === "风格" ||
      value.referenceSlot === "材质" ||
      value.referenceSlot === "构图" ||
      value.referenceSlot === "Mask"
        ? value.referenceSlot
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
                ? result.text.slice(0, 10000)
                : undefined,
            description: result.description.slice(0, 500),
            source: result.source,
          }
        : undefined,
  };
}

function normalizeProject(value: CreationProject): CreationProject {
  const candidate = value as unknown as Record<string, unknown>;
  const items = Array.isArray(candidate.items)
    ? candidate.items.filter(isCanvasItem).map(normalizeCanvasItem)
    : [];
  const attachments = Array.isArray(candidate.attachments)
    ? candidate.attachments.filter(isAttachment)
    : [];
  const rawTasks = (
    Array.isArray(candidate.tasks) ? candidate.tasks : []
  ) as Array<Record<string, unknown>>;
  return {
    canvas: readProjectCanvas(candidate.canvas, items),
    id: safeText(candidate.id, 160),
    name: safeText(candidate.name, 120, "未命名项目"),
    prompt: safeText(candidate.prompt, 4000),
    model: safeText(candidate.model, 120),
    kind: normalizeKind(candidate.kind),
    attachments,
    providerBaseUrl: safeBaseUrl(candidate.providerBaseUrl),
    providerName: safeText(candidate.providerName, 80) || undefined,
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
            id: safeText(message.id, 160),
            role:
              message.role === "system"
                ? ("system" as const)
                : ("user" as const),
            content: message.content.slice(0, 10000),
            createdAt:
              typeof message.createdAt === "number"
                ? message.createdAt
                : Date.now(),
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
        providerName: safeText(task.providerName, 80) || undefined,
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
        estimatedCostUsd:
          typeof task.estimatedCostUsd === "number" &&
          task.estimatedCostUsd >= 0
            ? task.estimatedCostUsd
            : undefined,
        actualCostUsd:
          typeof task.actualCostUsd === "number" && task.actualCostUsd >= 0
            ? task.actualCostUsd
            : undefined,
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
  const id = projectId();
  const now = Date.now();
  const item: CanvasCollectionItem = {
    id: itemId(id),
    title: "图片创作",
    description: input.model ? `${input.model} · 待执行` : "图片 · 待配置模型",
    kind: input.kind,
    prompt: input.prompt,
    model: input.model,
    updatedAt: now,
    generationStatus: "pending",
  };
  return {
    id,
    canvas: createProjectCanvas([item]),
    name: input.prompt.trim().replace(/\s+/g, " ").slice(0, 32) || "未命名项目",
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
    providerBaseUrl: input.providerBaseUrl,
    providerName: input.providerName,
    providerCredentialRef: input.providerCredentialRef,
    composerDraft: {
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
    estimatedCostUsd:
      Math.max(
        1,
        Math.min(64, Math.floor(project.composerDraft.outputCount || 1)),
      ) * 0.04,
  };
}
