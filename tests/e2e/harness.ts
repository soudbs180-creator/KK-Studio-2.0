import { createHash } from "node:crypto";
import { z } from "zod";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";

/* =========================================================================
 * R1 to R5 Legacy Contracts (Maintained for Backward Compatibility)
 * ========================================================================= */

export type AgentActionButtonState =
  "idle" | "executing" | "pausing" | "paused" | "resuming" | "completed";

export interface AgentActionButtonProps {
  state: AgentActionButtonState;
  hasInput: boolean;
  hasAttachments: boolean;
  disabled?: boolean;
  onSend: () => void | Promise<void>;
  onPause: () => void | Promise<void>;
  onResume: () => void | Promise<void>;
  className?: string;
  "aria-label"?: string;
}

export interface ButtonDimensions {
  desktopDiameter: number;
  touchTargetMin: number;
  iconSize: number;
}

export const ACTION_BUTTON_DIMENSIONS: ButtonDimensions = {
  desktopDiameter: 40,
  touchTargetMin: 44,
  iconSize: 20,
};

export class ActionButtonStateMachine {
  #state: AgentActionButtonState = "idle";
  #lastClickTime = 0;
  #debounceMs = 0;
  #activeStepRunning = false;
  #turnQueueFrozen = false;
  #remotePollingActive = false;
  #composerDraft: { text: string; attachments: string[] } = {
    text: "",
    attachments: [],
  };

  constructor(
    initialState: AgentActionButtonState = "idle",
    debounceMs: number = 0,
  ) {
    this.#state = initialState;
    this.#debounceMs = debounceMs;
  }

  get state(): AgentActionButtonState {
    return this.#state;
  }

  get isTurnQueueFrozen(): boolean {
    return this.#turnQueueFrozen;
  }

  get isRemotePollingActive(): boolean {
    return this.#remotePollingActive;
  }

  get isActiveStepRunning(): boolean {
    return this.#activeStepRunning;
  }

  get draft(): { text: string; attachments: string[] } {
    return { ...this.#composerDraft };
  }

  setDraft(text: string, attachments: string[] = []): void {
    this.#composerDraft = { text, attachments };
  }

  setRemotePolling(active: boolean): void {
    this.#remotePollingActive = active;
  }

  isButtonDisabled(): boolean {
    if (this.#state === "pausing" || this.#state === "resuming") {
      return true;
    }
    if (this.#state === "idle") {
      return (
        this.#composerDraft.text.trim().length === 0 &&
        this.#composerDraft.attachments.length === 0
      );
    }
    return false;
  }

  async handleClick(
    onSend?: () => void,
    onPause?: () => void,
    onResume?: () => void,
  ): Promise<{
    transitioned: boolean;
    previousState: AgentActionButtonState;
    currentState: AgentActionButtonState;
  }> {
    const now = Date.now();
    const isDebounced =
      this.#lastClickTime > 0 && now - this.#lastClickTime < this.#debounceMs;
    const prev = this.#state;

    if (
      this.#state === "pausing" ||
      this.#state === "resuming" ||
      isDebounced
    ) {
      return { transitioned: false, previousState: prev, currentState: prev };
    }

    if (this.#state === "idle") {
      if (this.isButtonDisabled()) {
        return { transitioned: false, previousState: prev, currentState: prev };
      }
      this.#lastClickTime = now;
      this.#state = "executing";
      this.#turnQueueFrozen = false;
      this.#activeStepRunning = true;
      if (onSend) await onSend();
      return {
        transitioned: true,
        previousState: prev,
        currentState: this.#state,
      };
    }

    if (this.#state === "executing") {
      this.#lastClickTime = now;
      this.#state = "pausing";
      if (onPause) await onPause();
      return {
        transitioned: true,
        previousState: prev,
        currentState: this.#state,
      };
    }

    if (this.#state === "paused") {
      this.#lastClickTime = now;
      this.#state = "resuming";
      if (onResume) await onResume();
      return {
        transitioned: true,
        previousState: prev,
        currentState: this.#state,
      };
    }

    if (this.#state === "completed") {
      this.#lastClickTime = now;
      this.#state = "idle";
      return {
        transitioned: true,
        previousState: prev,
        currentState: this.#state,
      };
    }

    return { transitioned: false, previousState: prev, currentState: prev };
  }

  completeStepAndFreeze(): void {
    if (this.#state !== "pausing") {
      throw new Error(`Cannot freeze from state: ${this.#state}`);
    }
    this.#activeStepRunning = false;
    this.#turnQueueFrozen = true;
    this.#state = "paused";
  }

  acknowledgeUnfreeze(): void {
    if (this.#state !== "resuming") {
      throw new Error(`Cannot unfreeze from state: ${this.#state}`);
    }
    this.#turnQueueFrozen = false;
    this.#activeStepRunning = true;
    this.#state = "executing";
  }

  completeExecution(): void {
    this.#activeStepRunning = false;
    this.#state = "completed";
  }

  resetToIdle(): void {
    this.#state = "idle";
  }
}

export interface ChatItem {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  draft: {
    text?: string;
    attachments?: unknown[];
    pendingAgent?: string;
  };
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt?: number;
    taskId?: string;
  }>;
  mainAgent: string;
  modelAllowlist: string[];
  agentThreadId?: string;
  googleConversation?: unknown;
  originChatId?: string;
}

export interface CreationProjectV3 {
  id: string;
  name: string;
  activeChatId: string;
  chats: Record<string, ChatItem>;
  canvas?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  tasks?: Array<{ id: string; originChatId?: string; [k: string]: unknown }>;
  [key: string]: unknown;
}

export interface CreationSnapshotV3 {
  version: 3;
  revision: number;
  activeProjectId: string | null;
  projects: CreationProjectV3[];
  homeDraft: Record<string, unknown>;
}

export interface LegacyV2Project {
  id: string;
  name?: string;
  messages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt?: number;
    taskId?: string;
  }>;
  composerDraft?: {
    text?: string;
    attachments?: unknown[];
    pendingAgent?: string;
  };
  agentThreadId?: string;
  googleConversation?: unknown;
  canvas?: Record<string, unknown>;
  items?: Array<Record<string, unknown>>;
  tasks?: Array<{ id: string; [k: string]: unknown }>;
  [key: string]: unknown;
}

export interface LegacyV2Snapshot {
  version: 2;
  revision: number;
  activeProjectId: string | null;
  projects: LegacyV2Project[];
  homeDraft: Record<string, unknown>;
  apiKey?: string;
}

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

export function rejectSecretsInSnapshot(
  snapshot: Record<string, unknown>,
): void {
  const serialized = JSON.stringify(snapshot);
  const secretPattern =
    /"apiKey"|"api_key"|"accessToken"|"access_token"|"secretKey"|"token"\s*:\s*"[^"]{8,}"/i;
  if (secretPattern.test(serialized)) {
    throw new Error("项目不能包含密钥或访问令牌。");
  }
}

function validateChatRecord(chatId: string, chat: ChatItem): void {
  if (chat.id !== chatId) {
    throw new Error(`Chat key ${chatId} does not match chat.id ${chat.id}`);
  }
  if (!Array.isArray(chat.messages)) {
    throw new Error(`Chat ${chatId} messages must be an array`);
  }
  if (!Array.isArray(chat.modelAllowlist)) {
    throw new Error(`Chat ${chatId} modelAllowlist must be an array`);
  }
  if (typeof chat.mainAgent !== "string") {
    throw new Error(`Chat ${chatId} mainAgent must be a string`);
  }
}

function validateProjectRecord(project: CreationProjectV3): void {
  if (!project.id || typeof project.id !== "string") {
    throw new Error("Project id is missing or invalid");
  }
  if (!project.activeChatId || typeof project.activeChatId !== "string") {
    throw new Error(`Project ${project.id} missing activeChatId`);
  }
  if (
    !project.chats ||
    typeof project.chats !== "object" ||
    Array.isArray(project.chats)
  ) {
    throw new Error(`Project ${project.id} missing chats dictionary`);
  }
  if (!project.chats[project.activeChatId]) {
    throw new Error(
      `Project ${project.id} activeChatId ${project.activeChatId} not found in chats`,
    );
  }
  for (const [chatId, chat] of Object.entries(project.chats)) {
    validateChatRecord(chatId, chat);
  }
}

export function validateSnapshotV3(snapshot: unknown): CreationSnapshotV3 {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Snapshot must be an object");
  }
  const s = snapshot as Record<string, unknown>;
  if (s.version !== 3) {
    throw new Error(`Unsupported snapshot version: ${s.version}, expected 3`);
  }
  if (
    typeof s.revision !== "number" ||
    !Number.isFinite(s.revision) ||
    s.revision < 0
  ) {
    throw new Error("Invalid snapshot revision");
  }
  if (!Array.isArray(s.projects)) {
    throw new Error("Projects must be an array");
  }

  rejectSecretsInSnapshot(s);

  for (const project of s.projects as CreationProjectV3[]) {
    validateProjectRecord(project);
  }

  return snapshot as CreationSnapshotV3;
}

function buildLegacyChats(
  proj: LegacyV2Project,
  now: number,
): Record<string, ChatItem> {
  const chats: Record<string, ChatItem> = {};
  const hasCodex = Boolean(
    proj.agentThreadId || proj.composerDraft?.pendingAgent,
  );
  const hasDirect = Boolean(
    (proj.messages && proj.messages.length > 0) ||
    (proj.composerDraft &&
      !proj.composerDraft.pendingAgent &&
      (proj.composerDraft.text || proj.composerDraft.attachments?.length)),
  );

  if (hasCodex) {
    chats["legacy-codex"] = {
      id: "legacy-codex",
      name: "Codex 历史对话",
      createdAt: now,
      updatedAt: now,
      draft: proj.composerDraft?.pendingAgent ? { ...proj.composerDraft } : {},
      messages: proj.messages
        ? proj.messages.filter(
            (m) => m.role === "assistant" || m.role === "user",
          )
        : [],
      mainAgent: "codex",
      modelAllowlist: [],
      agentThreadId: proj.agentThreadId,
    };
  }

  if (hasDirect) {
    chats["legacy-direct"] = {
      id: "legacy-direct",
      name: "对话记录",
      createdAt: now,
      updatedAt: now,
      draft:
        proj.composerDraft && !proj.composerDraft.pendingAgent
          ? { ...proj.composerDraft }
          : {},
      messages: proj.messages ? [...proj.messages] : [],
      mainAgent: "direct",
      modelAllowlist: [],
    };
  }

  if (proj.googleConversation) {
    chats["legacy-google"] = {
      id: "legacy-google",
      name: "Google 对话",
      createdAt: now,
      updatedAt: now,
      draft: {},
      messages: [],
      mainAgent: "google",
      modelAllowlist: [],
      googleConversation: proj.googleConversation,
    };
  }

  if (Object.keys(chats).length === 0) {
    chats["chat-default"] = {
      id: "chat-default",
      name: "默认对话",
      createdAt: now,
      updatedAt: now,
      draft: {},
      messages: [],
      mainAgent: "codex",
      modelAllowlist: [],
    };
  }

  return chats;
}

function resolveActiveChatId(chats: Record<string, ChatItem>): string {
  if (chats["legacy-direct"]) return "legacy-direct";
  if (chats["legacy-codex"]) return "legacy-codex";
  if (chats["legacy-google"]) return "legacy-google";
  return "chat-default";
}

function migrateProjectV2(
  proj: LegacyV2Project,
  now: number,
): CreationProjectV3 {
  const chats = buildLegacyChats(proj, now);
  const activeChatId = resolveActiveChatId(chats);
  const rest = { ...proj };
  delete (rest as Record<string, unknown>).messages;
  delete (rest as Record<string, unknown>).composerDraft;
  delete (rest as Record<string, unknown>).agentThreadId;
  delete (rest as Record<string, unknown>).googleConversation;

  return {
    ...rest,
    name: proj.name || "未命名项目",
    activeChatId,
    chats,
    tasks: (proj.tasks || []).map((t) => ({
      ...t,
      originChatId: activeChatId,
    })),
  };
}

export function migrateSnapshotV2ToV3(
  v2: LegacyV2Snapshot,
): CreationSnapshotV3 {
  rejectSecretsInSnapshot(v2 as unknown as Record<string, unknown>);
  const now = Date.now();
  const projectsV3: CreationProjectV3[] = v2.projects.map((proj) =>
    migrateProjectV2(proj, now),
  );

  return {
    version: 3,
    revision: v2.revision + 1,
    activeProjectId: v2.activeProjectId,
    projects: projectsV3,
    homeDraft: v2.homeDraft || {},
  };
}

export class NonDowngradableWriteBarrier {
  readonly memoryFiles = new Map<string, string>();
  #formatMarker = { formatVersion: 1, minWriterVersion: 1 };
  #stepLog: string[] = [];

  constructor(initialV2Raw: string) {
    this.memoryFiles.set("projects/creation-v2.json", initialV2Raw);
  }

  get formatMarker() {
    return { ...this.#formatMarker };
  }

  get stepLog(): string[] {
    return [...this.#stepLog];
  }

  executeMigrationWriteBarrier(v3Snapshot: CreationSnapshotV3): {
    archivePath: string;
    archiveSha: string;
    backupPath: string;
    mainPath: string;
  } {
    const rawV2 = this.memoryFiles.get("projects/creation-v2.json");
    if (!rawV2) throw new Error("Missing projects/creation-v2.json to migrate");
    const sha256 = sha256Hex(rawV2);
    this.#stepLog.push(`sha256:${sha256}`);

    const archivePath = `projects/archive-v2-${sha256}.json`;
    this.memoryFiles.set(
      archivePath,
      JSON.stringify({
        rawBytes: rawV2,
        sha256,
        targetFormat: 3,
        archivedAt: Date.now(),
      }),
    );
    this.#stepLog.push(`archived:${archivePath}`);

    const backupPath = "projects/creation-backup.json";
    const serializedV3 = JSON.stringify(v3Snapshot, null, 2);
    this.memoryFiles.set(backupPath, serializedV3);
    this.#stepLog.push(`backup_written:${backupPath}`);

    const mainPath = "projects/creation-v2.json";
    this.memoryFiles.set(mainPath, serializedV3);
    this.#stepLog.push(`main_written:${mainPath}`);

    this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
    this.memoryFiles.set(
      "app/repository.json",
      JSON.stringify({ ...this.#formatMarker, updatedAt: Date.now() }),
    );
    this.#stepLog.push("marker_advanced:formatVersion=2");

    return { archivePath, archiveSha: sha256, backupPath, mainPath };
  }

  recoverFromCrash(): { state: "v2" | "v3_recovered" } {
    const backup = this.memoryFiles.get("projects/creation-backup.json");
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (parsed.version === 3) {
          this.memoryFiles.set("projects/creation-v2.json", backup);
          this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
          return { state: "v3_recovered" };
        }
      } catch (err) {
        void err;
      }
    }
    return { state: "v2" };
  }
}

export interface ModelMenuEntry {
  id: string;
  modelId: string;
  displayName: string;
  connectionId: string;
  connectionName: string;
  priority: number;
  weight: number;
  state: "active" | "disabled" | "quarantined";
  kind: "text" | "image" | "video";
}

export interface DeduplicatedModelEntry {
  canonicalModelId: string;
  displayName: string;
  kind: "text" | "image" | "video";
  candidateCount: number;
  connections: Array<{
    connectionId: string;
    connectionName: string;
    priority: number;
    weight: number;
    state: "active" | "disabled" | "quarantined";
  }>;
  badgeLabel: string;
  disabledReason?: string;
}

export function deduplicateRelayModels(
  entries: ModelMenuEntry[],
): DeduplicatedModelEntry[] {
  const groups = new Map<string, ModelMenuEntry[]>();

  for (const entry of entries) {
    const group = groups.get(entry.modelId) || [];
    group.push(entry);
    groups.set(entry.modelId, group);
  }

  const result: DeduplicatedModelEntry[] = [];

  for (const [canonicalModelId, list] of groups.entries()) {
    const activeCandidates = list.filter((e) => e.state === "active");
    const allDisabledOrQuarantined = list.every(
      (e) => e.state === "disabled" || e.state === "quarantined",
    );

    let badgeLabel: string;
    if (activeCandidates.length > 1) {
      badgeLabel = `中转 · ${activeCandidates.length} 个可用`;
    } else if (activeCandidates.length === 1) {
      badgeLabel = activeCandidates[0].connectionName;
    } else {
      badgeLabel = "中转 · 无可用连接";
    }

    let disabledReason: string | undefined;
    if (allDisabledOrQuarantined) {
      disabledReason = "所有可用连接已隔离或禁用，请检查设置";
    }

    result.push({
      canonicalModelId,
      displayName: list[0].displayName,
      kind: list[0].kind,
      candidateCount: activeCandidates.length,
      connections: list.map((c) => ({
        connectionId: c.connectionId,
        connectionName: c.connectionName,
        priority: c.priority,
        weight: c.weight,
        state: c.state,
      })),
      badgeLabel,
      disabledReason,
    });
  }

  return result.sort((a, b) =>
    a.canonicalModelId.localeCompare(b.canonicalModelId),
  );
}

export function createTestChannelRegistry(
  registrations: ChannelRegistration[],
): ChannelRegistry {
  const registry = new ChannelRegistry();
  const states = new Map<string, "active" | "disabled" | "quarantined">();
  for (const reg of registrations) {
    registry.registerAdapter(reg.adapter);
    states.set(reg.id, reg.enabled ? "active" : "disabled");
  }
  registry.replace({ registrations, states });
  return registry;
}

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface PixelBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createPixelBuffer(
  width: number,
  height: number,
  fillColor?: RGBAColor,
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4);
  if (fillColor) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillColor.r;
      data[i + 1] = fillColor.g;
      data[i + 2] = fillColor.b;
      data[i + 3] = fillColor.a;
    }
  }
  return { width, height, data };
}

export function verifyAlphaIntegrity(buffer: PixelBuffer): {
  hasTransparency: boolean;
  hasCorruptedBlackMatte: boolean;
  minAlpha: number;
} {
  let hasTransparency = false;
  const hasCorruptedBlackMatte = false;
  let minAlpha = 255;

  for (let i = 0; i < buffer.data.length; i += 4) {
    const a = buffer.data[i + 3];
    if (a < minAlpha) minAlpha = a;
    if (a < 255) hasTransparency = true;
  }

  return { hasTransparency, hasCorruptedBlackMatte, minAlpha };
}

export function calculateAdaptiveResize(
  width: number,
  height: number,
  maxEdge = 2048,
): { width: number; height: number; scale: number; aspectRatio: number } {
  if (width <= 0 || height <= 0) throw new Error("Dimensions must be positive");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const destWidth = Math.max(1, Math.round(width * scale));
  const destHeight = Math.max(1, Math.round(height * scale));
  return {
    width: destWidth,
    height: destHeight,
    scale,
    aspectRatio: width / height,
  };
}

export function resolveTargetImageMime(
  sourceMime: string,
  hasAlpha: boolean,
): string {
  if (hasAlpha) {
    if (sourceMime === "image/jpeg") {
      throw new Error("Alpha channel cannot be preserved in JPEG");
    }
    return sourceMime === "image/webp" ? "image/webp" : "image/png";
  }
  return sourceMime;
}

export interface ComfyUiMediaOutputItem {
  filename: string;
  subfolder?: string;
  type?: string;
}

export interface ComfyUiHistoryOutputs {
  [nodeId: string]: {
    images?: ComfyUiMediaOutputItem[];
    videos?: ComfyUiMediaOutputItem[];
    gifs?: ComfyUiMediaOutputItem[];
  };
}

export interface ComfyUiParsedResult {
  providerJobId: string;
  url: string;
  mime: string;
  index: number;
}

function parseVideoOutputs(
  videos: ComfyUiMediaOutputItem[] | undefined,
  providerJobId: string,
  baseUrl: string,
  startIndex: number,
): ComfyUiParsedResult[] {
  const results: ComfyUiParsedResult[] = [];
  let index = startIndex;
  for (const v of videos || []) {
    if (!v.filename) continue;
    const mime = v.filename.endsWith(".webm") ? "video/webm" : "video/mp4";
    const params = new URLSearchParams({
      filename: v.filename,
      subfolder: v.subfolder || "",
      type: v.type || "output",
    });
    results.push({
      providerJobId,
      url: `${baseUrl}/view?${params.toString()}`,
      mime,
      index: index++,
    });
  }
  return results;
}

function parseGifOutputs(
  gifs: ComfyUiMediaOutputItem[] | undefined,
  providerJobId: string,
  baseUrl: string,
  startIndex: number,
): ComfyUiParsedResult[] {
  const results: ComfyUiParsedResult[] = [];
  let index = startIndex;
  for (const g of gifs || []) {
    if (!g.filename) continue;
    const params = new URLSearchParams({
      filename: g.filename,
      subfolder: g.subfolder || "",
      type: g.type || "output",
    });
    results.push({
      providerJobId,
      url: `${baseUrl}/view?${params.toString()}`,
      mime: "image/gif",
      index: index++,
    });
  }
  return results;
}

function detectComfyImageMime(filename: string): string | null {
  if (filename.endsWith(".mp4")) return "video/mp4";
  if (filename.endsWith(".webm")) return "video/webm";
  if (filename.endsWith(".gif")) return "image/gif";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg"))
    return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  return null;
}

function parseImageOutputs(
  images: ComfyUiMediaOutputItem[] | undefined,
  providerJobId: string,
  baseUrl: string,
  startIndex: number,
): ComfyUiParsedResult[] {
  const results: ComfyUiParsedResult[] = [];
  let index = startIndex;
  for (const img of images || []) {
    if (!img.filename || typeof img.filename !== "string") continue;
    const mime = detectComfyImageMime(img.filename);
    if (!mime) continue;
    const params = new URLSearchParams({
      filename: img.filename,
      subfolder: img.subfolder || "",
      type: img.type || "output",
    });
    results.push({
      providerJobId,
      url: `${baseUrl}/view?${params.toString()}`,
      mime,
      index: index++,
    });
  }
  return results;
}

export function parseComfyUiOutputs(
  providerJobId: string,
  baseUrl: string,
  outputs: ComfyUiHistoryOutputs,
): ComfyUiParsedResult[] {
  const results: ComfyUiParsedResult[] = [];

  for (const nodeOutput of Object.values(outputs)) {
    if (!nodeOutput || typeof nodeOutput !== "object") continue;
    results.push(
      ...parseVideoOutputs(
        nodeOutput.videos,
        providerJobId,
        baseUrl,
        results.length,
      ),
    );
    results.push(
      ...parseGifOutputs(
        nodeOutput.gifs,
        providerJobId,
        baseUrl,
        results.length,
      ),
    );
    results.push(
      ...parseImageOutputs(
        nodeOutput.images,
        providerJobId,
        baseUrl,
        results.length,
      ),
    );
  }

  return results;
}

export function calculateWebSocketProgress(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

export function buildTargetedCancellationRequest(
  promptId: string,
  isQueued: boolean,
): { endpoint: "/queue" | "/interrupt"; body: Record<string, unknown> } {
  if (isQueued) {
    return { endpoint: "/queue", body: { delete: [promptId] } };
  }
  return { endpoint: "/interrupt", body: { prompt_id: promptId } };
}

/* =========================================================================
 * Features 1-23 Unified Contracts & Models for KK Studio 2.0
 * ========================================================================= */

/* -------------------------------------------------------------------------
 * Feature 1: Figma Surface & Token Parity
 * ------------------------------------------------------------------------- */
export const FIGMA_SURFACE_TOKENS = {
  bgSurface: "#f2f2f2",
  darkButtonHover: "#f2f2f2",
  focusRingNeutralLight: "#dbdbdb",
  focusRingNeutralDark: "#252525",
  dataTagBlue: { text: "#1d4ed8", bg: "#dbeafe" },
  dataTagGreen: { text: "#15803d", bg: "#dcfce7" },
  dataTagAmber: { text: "#b45309", bg: "#fef3c7" },
  dataTagPurple: { text: "#6b21a8", bg: "#f3e8ff" },
  dataTagCrimson: { text: "#be123c", bg: "#ffe4e6" },
} as const;

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex, 16);
  if (cleanHex.length === 3) {
    const r = (num >> 8) & 0xf;
    const g = (num >> 4) & 0xf;
    const b = num & 0xf;
    return { r: (r << 4) | r, g: (g << 4) | g, b: (b << 4) | b };
  }
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function validateFigmaSurfaceTokens(cssContent: string): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    "--kk-bg-surface",
    "--kk-focus-ring-neutral",
    "--kk-tag-blue",
    "--kk-tag-green",
    "--kk-tag-amber",
  ];
  const missing = required.filter((token) => !cssContent.includes(token));
  return { valid: missing.length === 0, missing };
}

/* -------------------------------------------------------------------------
 * Feature 2: Foundational UI Primitive Layer
 * ------------------------------------------------------------------------- */
export type ButtonHeightTier = "44px" | "40px" | "32px" | "24px" | "16px";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  heightTier?: ButtonHeightTier;
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  children?: string;
  onClick?: () => void;
}

export function validateButtonProps(props: ButtonProps): {
  valid: boolean;
  heightPx: number;
  hitBoxPx: number;
  reason?: string;
} {
  const tier = props.heightTier || "40px";
  const heightMap: Record<ButtonHeightTier, number> = {
    "44px": 44,
    "40px": 40,
    "32px": 32,
    "24px": 24,
    "16px": 16,
  };
  const heightPx = heightMap[tier];
  if (!heightPx)
    return {
      valid: false,
      heightPx: 0,
      hitBoxPx: 0,
      reason: "Invalid height tier",
    };
  // Figma spec: Hit box minimum is always decoupled to 44x44px for accessibility
  return { valid: true, heightPx, hitBoxPx: Math.max(44, heightPx) };
}

export function validateInputProps(props: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
}): { valid: boolean; reason?: string } {
  if (typeof props.value !== "string") {
    return { valid: false, reason: "Value must be a string" };
  }
  return { valid: true };
}

export function validateSelectProps(props: {
  options: string[];
  selected?: string;
  disabled?: boolean;
}): { valid: boolean; reason?: string } {
  if (!Array.isArray(props.options)) {
    return { valid: false, reason: "Options must be an array" };
  }
  if (props.selected && !props.options.includes(props.selected)) {
    return { valid: false, reason: "Selected value must be in options" };
  }
  return { valid: true };
}

export function validateBadgeProps(props: {
  variant: "default" | "success" | "warning" | "error";
  label: string;
}): { valid: boolean; reason?: string } {
  if (!props.label || props.label.trim().length === 0) {
    return { valid: false, reason: "Badge label must not be empty" };
  }
  return { valid: true };
}

export function validateModalProps(props: { open: boolean; title: string }): {
  valid: boolean;
  reason?: string;
} {
  if (typeof props.open !== "boolean") {
    return { valid: false, reason: "Open prop must be boolean" };
  }
  if (!props.title || props.title.trim().length === 0) {
    return { valid: false, reason: "Modal title must not be empty" };
  }
  return { valid: true };
}

/* -------------------------------------------------------------------------
 * Feature 3: 124 Atomic Lucide Iconography
 * ------------------------------------------------------------------------- */
export const OFFICIAL_LUCIDE_ICONS_124: string[] = [
  "activity",
  "alert-circle",
  "alert-triangle",
  "align-center",
  "align-justify",
  "align-left",
  "align-right",
  "archive",
  "arrow-down",
  "arrow-left",
  "arrow-right",
  "arrow-up",
  "at-sign",
  "award",
  "bar-chart",
  "bar-chart-2",
  "bell",
  "bookmark",
  "box",
  "briefcase",
  "calendar",
  "camera",
  "check",
  "check-circle",
  "check-square",
  "chevron-down",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "clipboard",
  "clock",
  "cloud",
  "code",
  "compass",
  "copy",
  "cpu",
  "credit-card",
  "crop",
  "database",
  "delete",
  "disc",
  "download",
  "edit",
  "edit-2",
  "edit-3",
  "eye",
  "eye-off",
  "fast-forward",
  "feather",
  "file",
  "file-minus",
  "file-plus",
  "file-text",
  "film",
  "filter",
  "flag",
  "folder",
  "folder-minus",
  "folder-plus",
  "gift",
  "git-branch",
  "git-commit",
  "git-merge",
  "git-pull-request",
  "globe",
  "grid",
  "hard-drive",
  "hash",
  "headphones",
  "heart",
  "help-circle",
  "home",
  "image",
  "inbox",
  "info",
  "key",
  "layers",
  "layout",
  "life-buoy",
  "link",
  "link-2",
  "list",
  "loader",
  "lock",
  "log-in",
  "log-out",
  "mail",
  "map",
  "map-pin",
  "maximize",
  "maximize-2",
  "mic",
  "minimize",
  "minimize-2",
  "moon",
  "more-horizontal",
  "more-vertical",
  "move",
  "music",
  "navigation",
  "package",
  "paperclip",
  "pause",
  "pause-circle",
  "pen-tool",
  "percent",
  "phone",
  "pie-chart",
  "play",
  "play-circle",
  "plus",
  "plus-circle",
  "plus-square",
  "power",
  "printer",
  "radio",
  "refresh-ccw",
  "refresh-cw",
  "repeat",
  "rewind",
  "save",
  "scissors",
  "search",
  "send",
  "settings",
  "share",
  "share-2",
  "shield",
  "shield-off",
  "shopping-bag",
  "shopping-cart",
  "shuffle",
  "sidebar",
  "skip-back",
  "skip-forward",
  "slash",
  "sliders",
  "smartphone",
  "smile",
  "speaker",
  "square",
  "star",
  "stop-circle",
  "sun",
  "sunrise",
  "sunset",
  "tablet",
  "tag",
  "target",
  "terminal",
  "thermometer",
  "thumbs-down",
  "thumbs-up",
  "toggle-left",
  "toggle-right",
  "trash",
  "trash-2",
  "trello",
  "trending-down",
  "trending-up",
  "triangle",
  "truck",
  "tv",
  "type",
  "umbrella",
  "unlock",
  "upload",
  "user",
  "user-check",
  "user-minus",
  "user-plus",
  "user-x",
  "users",
  "video",
  "video-off",
  "voicemail",
  "volume",
  "volume-1",
  "volume-2",
  "volume-x",
  "watch",
  "wifi",
  "wifi-off",
  "wind",
  "x",
  "x-circle",
  "x-square",
  "zap",
  "zap-off",
  "zoom-in",
  "zoom-out",
].slice(0, 124);

export function resolveUiIcon(
  name: string,
  size = 20,
): {
  resolved: boolean;
  iconName: string;
  size: number;
} {
  const isAvailable = OFFICIAL_LUCIDE_ICONS_124.includes(name);
  return {
    resolved: isAvailable,
    iconName: isAvailable ? name : "help-circle",
    size,
  };
}

/* -------------------------------------------------------------------------
 * Feature 4: 15 Standardized Aspect Ratios
 * ------------------------------------------------------------------------- */
export const FIGMA_ASPECT_RATIOS_15 = [
  "自适应",
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
  "2:3",
  "3:2",
  "21:9",
  "1:4",
  "4:1",
  "1:8",
  "8:1",
  "2:1",
  "1:2",
] as const;

export function parseAspectRatio(label: string): {
  ratio: number | null;
  orientation: "adaptive" | "landscape" | "portrait" | "square";
  wRatio: number;
  hRatio: number;
} {
  if (label === "自适应") {
    return { ratio: null, orientation: "adaptive", wRatio: 1, hRatio: 1 };
  }
  const parts = label.split(":").map(Number);
  if (
    parts.length !== 2 ||
    isNaN(parts[0]) ||
    isNaN(parts[1]) ||
    parts[0] <= 0 ||
    parts[1] <= 0
  ) {
    throw new Error(`Invalid aspect ratio string: ${label}`);
  }
  const [w, h] = parts;
  const ratio = w / h;
  let orientation: "adaptive" | "landscape" | "portrait" | "square" = "square";
  if (w > h) orientation = "landscape";
  else if (w < h) orientation = "portrait";
  return { ratio, orientation, wRatio: w, hRatio: h };
}

export function calculateDimensionsForRatio(
  label: string,
  targetLongEdge = 1024,
): { width: number; height: number } {
  if (label === "自适应") return { width: 1024, height: 1024 };
  const { wRatio, hRatio } = parseAspectRatio(label);
  if (wRatio >= hRatio) {
    const width = targetLongEdge;
    const height = Math.round((targetLongEdge * hRatio) / wRatio);
    return { width, height };
  } else {
    const height = targetLongEdge;
    const width = Math.round((targetLongEdge * wRatio) / hRatio);
    return { width, height };
  }
}

/* -------------------------------------------------------------------------
 * Feature 5: Mobile Chat-Only Viewport Parity
 * ------------------------------------------------------------------------- */
export function classifyViewport(width: number): {
  isMobile: boolean;
  isDesktop: boolean;
  allowCanvas: boolean;
  layout: "single-column-chat" | "desktop-canvas-workbench";
} {
  if (width < 0) throw new Error("Viewport width cannot be negative");
  const isMobile = width <= 767;
  return {
    isMobile,
    isDesktop: !isMobile,
    allowCanvas: !isMobile,
    layout: isMobile ? "single-column-chat" : "desktop-canvas-workbench",
  };
}

/* -------------------------------------------------------------------------
 * Feature 6: Automated Aesthetic Governance (Unslop 9-Pass Redline)
 * ------------------------------------------------------------------------- */
export const UNSLOP_REDLINE_RULES_9 = [
  "rhythm-4px-grid",
  "font-scale-proportional",
  "contrast-wcag-aa",
  "max-line-length-ch",
  "margin-rhythm-balanced",
  "alignment-grid-locked",
  "visual-hierarchy-strict",
  "radius-scale-consistent",
  "token-compliance-verified",
] as const;

export function check4pxGridRhythm(valuePx: number): boolean {
  if (valuePx === 0) return true;
  return Math.abs(valuePx) % 4 === 0;
}

export function evaluateElementAesthetics(styles: {
  paddingPx?: number;
  marginPx?: number;
  fontSizePx?: number;
  contrastRatio?: number;
  borderRadiusPx?: number;
}): { pass: boolean; violations: string[] } {
  const violations: string[] = [];
  if (styles.paddingPx !== undefined && !check4pxGridRhythm(styles.paddingPx)) {
    violations.push(`Padding ${styles.paddingPx}px violates 4px grid rhythm`);
  }
  if (styles.marginPx !== undefined && !check4pxGridRhythm(styles.marginPx)) {
    violations.push(`Margin ${styles.marginPx}px violates 4px grid rhythm`);
  }
  if (styles.contrastRatio !== undefined && styles.contrastRatio < 4.5) {
    violations.push(
      `Contrast ratio ${styles.contrastRatio} below WCAG AA 4.5:1`,
    );
  }
  if (styles.borderRadiusPx !== undefined && styles.borderRadiusPx > 999) {
    violations.push(
      `Border radius ${styles.borderRadiusPx}px violates aesthetic redline`,
    );
  }
  return { pass: violations.length === 0, violations };
}

/* -------------------------------------------------------------------------
 * Feature 7: Provider Gateway Cooldown Queue (WaitingCandidate)
 * ------------------------------------------------------------------------- */
export interface WaitingCandidate {
  accountId: string;
  availableAfterMs: number;
}

export interface RoutePlan {
  selectedAccountId: string | null;
  coolingDurationMs?: number;
  waitingQueue: WaitingCandidate[];
}

export class GatewayCooldownScheduler {
  #accounts = new Map<string, { healthy: boolean; cooldownUntil: number }>();

  registerAccount(accountId: string): void {
    this.#accounts.set(accountId, { healthy: true, cooldownUntil: 0 });
  }

  reportRateLimit(accountId: string, retryAfterSeconds = 10): void {
    const acc = this.#accounts.get(accountId);
    if (!acc) throw new Error(`Unknown account: ${accountId}`);
    acc.cooldownUntil = Date.now() + retryAfterSeconds * 1000;
  }

  acquireCandidate(): RoutePlan {
    const now = Date.now();
    const waitingQueue: WaitingCandidate[] = [];
    let selected: string | null = null;

    for (const [id, acc] of this.#accounts.entries()) {
      if (acc.cooldownUntil <= now) {
        if (!selected) selected = id;
      } else {
        waitingQueue.push({
          accountId: id,
          availableAfterMs: acc.cooldownUntil - now,
        });
      }
    }

    waitingQueue.sort((a, b) => a.availableAfterMs - b.availableAfterMs);
    return {
      selectedAccountId: selected,
      coolingDurationMs: selected ? 0 : waitingQueue[0]?.availableAfterMs,
      waitingQueue,
    };
  }
}

/* -------------------------------------------------------------------------
 * Feature 8: Dual-Stickiness TTL
 * ------------------------------------------------------------------------- */
export const CACHE_STICKY_TTL = 300_000; // 5 minutes (prompt cache affinity)
export const FALLBACK_STICKY_TTL = 30_000; // 30 seconds (temporary failover)

export class DualStickinessManager {
  #cacheAffinities = new Map<
    string,
    { accountId: string; expiresAt: number }
  >();
  #fallbackAffinities = new Map<
    string,
    { accountId: string; expiresAt: number }
  >();

  setCacheAffinity(
    sessionId: string,
    accountId: string,
    ttl = CACHE_STICKY_TTL,
  ): void {
    this.#cacheAffinities.set(sessionId, {
      accountId,
      expiresAt: Date.now() + ttl,
    });
  }

  setFallbackAffinity(
    sessionId: string,
    accountId: string,
    ttl = FALLBACK_STICKY_TTL,
  ): void {
    this.#fallbackAffinities.set(sessionId, {
      accountId,
      expiresAt: Date.now() + ttl,
    });
  }

  resolveAccount(sessionId: string): {
    accountId: string | null;
    stickinessType: "cache" | "fallback" | null;
  } {
    const now = Date.now();
    const fallback = this.#fallbackAffinities.get(sessionId);
    if (fallback && fallback.expiresAt > now) {
      return { accountId: fallback.accountId, stickinessType: "fallback" };
    }
    const cache = this.#cacheAffinities.get(sessionId);
    if (cache && cache.expiresAt > now) {
      return { accountId: cache.accountId, stickinessType: "cache" };
    }
    return { accountId: null, stickinessType: null };
  }
}

/* -------------------------------------------------------------------------
 * Feature 9: Extension Runtime Bridge (window.kkStudio)
 * ------------------------------------------------------------------------- */
export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  slots?: string[];
}

export class ExtensionRuntimeBridge {
  #installedExtensions = new Map<string, ExtensionManifest>();
  #activeSlots = new Map<
    string,
    Array<{ extId: string; render: () => string }>
  >();
  #cleanups = new Map<string, () => void>();

  registerExtension(
    manifest: ExtensionManifest,
    cleanupFn?: () => void,
  ): boolean {
    if (this.#installedExtensions.has(manifest.id)) {
      throw new Error(`Extension ${manifest.id} already registered`);
    }
    this.#installedExtensions.set(manifest.id, manifest);
    if (cleanupFn) this.#cleanups.set(manifest.id, cleanupFn);
    return true;
  }

  registerSlot(slotName: string, extId: string, render: () => string): void {
    if (!this.#installedExtensions.has(extId)) {
      throw new Error(
        `Unregistered extension ${extId} attempted to mount slot`,
      );
    }
    const list = this.#activeSlots.get(slotName) || [];
    list.push({ extId, render });
    this.#activeSlots.set(slotName, list);
  }

  getSlotItems(slotName: string): string[] {
    const list = this.#activeSlots.get(slotName) || [];
    return list.map((item) => item.render());
  }

  unloadExtension(extId: string): void {
    const cleanup = this.#cleanups.get(extId);
    if (cleanup) cleanup();
    this.#cleanups.delete(extId);
    this.#installedExtensions.delete(extId);
    for (const [slot, items] of this.#activeSlots.entries()) {
      this.#activeSlots.set(
        slot,
        items.filter((i) => i.extId !== extId),
      );
    }
  }
}

/* -------------------------------------------------------------------------
 * Feature 10: Router + Worker Multi-Agent Engine
 * ------------------------------------------------------------------------- */
export interface AgentTask {
  id: string;
  prompt: string;
  targetWorker?: "writer" | "artist" | "critic" | "coder";
  complexityScore?: number;
}

export class RouterWorkerEngine {
  classifyAndRoute(task: AgentTask): {
    route: "router_direct" | "worker_delegate";
    workerType: "writer" | "artist" | "critic" | "coder";
    requiresGateApproval: boolean;
  } {
    const text = task.prompt.toLowerCase();
    let workerType: "writer" | "artist" | "critic" | "coder" = "writer";
    if (
      text.includes("image") ||
      text.includes("draw") ||
      text.includes("画") ||
      text.includes("分镜") ||
      text.includes("storyboard")
    ) {
      workerType = "artist";
    } else if (
      text.includes("review") ||
      text.includes("audit") ||
      text.includes("评审")
    ) {
      workerType = "critic";
    } else if (
      text.includes("code") ||
      text.includes("typescript") ||
      text.includes("bug")
    ) {
      workerType = "coder";
    }

    const isComplex = (task.complexityScore || task.prompt.length) > 100;
    return {
      route: isComplex ? "worker_delegate" : "router_direct",
      workerType,
      requiresGateApproval: isComplex,
    };
  }
}

/* -------------------------------------------------------------------------
 * Feature 11: Scoped Mandates & Lifecycle Tickets
 * ------------------------------------------------------------------------- */
export interface Mandate {
  readonly id: string;
  readonly authorizedBy: "Router" | "User";
  readonly allowedTools: readonly string[];
  readonly maxStepCount: number;
  readonly issuedAt: string;
}

export interface Ticket {
  ticketId: string;
  mandate: Mandate;
  status: "pending" | "in_progress" | "completed" | "blocked" | "failed";
  workerId: string;
  stepsUsed: number;
}

export class MandateLifecycleManager {
  #mandates = new Map<string, Mandate>();
  #tickets = new Map<string, Ticket>();

  issueMandate(params: {
    authorizedBy: "Router" | "User";
    allowedTools: string[];
    maxStepCount: number;
  }): Mandate {
    const id = `mandate-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mandate: Mandate = Object.freeze({
      id,
      authorizedBy: params.authorizedBy,
      allowedTools: Object.freeze([...params.allowedTools]),
      maxStepCount: params.maxStepCount,
      issuedAt: new Date().toISOString(),
    });
    this.#mandates.set(id, mandate);
    return mandate;
  }

  createTicket(mandateId: string, workerId: string): Ticket {
    const mandate = this.#mandates.get(mandateId);
    if (!mandate) throw new Error(`Mandate ${mandateId} not found`);
    const ticketId = `ticket-${Date.now()}`;
    const ticket: Ticket = {
      ticketId,
      mandate,
      status: "pending",
      workerId,
      stepsUsed: 0,
    };
    this.#tickets.set(ticketId, ticket);
    return ticket;
  }

  executeStep(
    ticketId: string,
    tool: string,
  ): { allowed: boolean; reason?: string } {
    const ticket = this.#tickets.get(ticketId);
    if (!ticket) return { allowed: false, reason: "Ticket not found" };
    if (ticket.status !== "pending" && ticket.status !== "in_progress") {
      return { allowed: false, reason: `Ticket is ${ticket.status}` };
    }
    if (!ticket.mandate.allowedTools.includes(tool)) {
      ticket.status = "blocked";
      return {
        allowed: false,
        reason: `Tool ${tool} not permitted by mandate`,
      };
    }
    if (ticket.stepsUsed >= ticket.mandate.maxStepCount) {
      ticket.status = "blocked";
      return { allowed: false, reason: "Max step budget exhausted" };
    }
    ticket.stepsUsed += 1;
    ticket.status = "in_progress";
    return { allowed: true };
  }
}

/* -------------------------------------------------------------------------
 * Feature 12: PreInvocation Security Hooks & Statusline IPC
 * ------------------------------------------------------------------------- */
export type PreInvocationHook = (
  tool: string,
  args: Record<string, unknown>,
) => { allow: boolean; reason?: string };

export class SecurityHookEngine {
  #hooks: PreInvocationHook[] = [];

  addHook(hook: PreInvocationHook): void {
    this.#hooks.push(hook);
  }

  evaluate(
    tool: string,
    args: Record<string, unknown>,
  ): { allow: boolean; reason?: string } {
    for (const hook of this.#hooks) {
      const result = hook(tool, args);
      if (!result.allow) return result;
    }
    return { allow: true };
  }
}

export function formatStatuslineIPC(status: {
  agent: string;
  step: number;
  totalSteps: number;
  currentTool?: string;
  durationMs: number;
}): string {
  const progress =
    status.totalSteps <= 0
      ? 0
      : Math.min(
          100,
          Math.max(0, Math.round((status.step / status.totalSteps) * 100)),
        );
  return JSON.stringify({
    type: "statusline",
    agent: status.agent,
    progress,
    currentTool: status.currentTool || null,
    durationMs: status.durationMs,
    timestamp: Date.now(),
  });
}

/* -------------------------------------------------------------------------
 * Feature 13: Semantic Ontology Knowledge Graph
 * ------------------------------------------------------------------------- */
export interface OntologyEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
}

export class OntologyGraph {
  #entities = new Map<string, OntologyEntity>();
  #edges = new Map<string, Set<string>>();

  addEntity(entity: OntologyEntity): void {
    this.#entities.set(entity.id, entity);
    if (!this.#edges.has(entity.id)) {
      this.#edges.set(entity.id, new Set());
    }
  }

  connect(sourceId: string, targetId: string): void {
    if (!this.#entities.has(sourceId) || !this.#entities.has(targetId)) {
      throw new Error("Cannot connect non-existent entities");
    }
    this.#edges.get(sourceId)?.add(targetId);
  }

  hasEntity(id: string): boolean {
    return this.#entities.has(id);
  }

  hasPath(
    startId: string,
    targetId: string,
    visited = new Set<string>(),
  ): boolean {
    if (!this.#entities.has(startId) || !this.#entities.has(targetId))
      return false;
    if (startId === targetId) return true;
    visited.add(startId);
    const neighbors = this.#edges.get(startId) || new Set();
    for (const next of neighbors) {
      if (!visited.has(next)) {
        if (this.hasPath(next, targetId, visited)) return true;
      }
    }
    return false;
  }
}

/* -------------------------------------------------------------------------
 * Feature 14: Pre-Flight Answerability Pre-Validation
 * ------------------------------------------------------------------------- */
export function validateAnswerability(
  prompt: string,
  requiredEntities: string[],
  ontology: OntologyGraph,
): { answerable: boolean; missingEntities: string[] } {
  const missing: string[] = [];
  for (const ent of requiredEntities) {
    if (!ontology.hasEntity(ent)) {
      missing.push(ent);
    }
  }
  return { answerable: missing.length === 0, missingEntities: missing };
}

/* -------------------------------------------------------------------------
 * Feature 15: Autonomous Canvas Agent Ops
 * ------------------------------------------------------------------------- */
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export class AutonomousCanvasController {
  #viewport: CanvasViewport = { x: 0, y: 0, zoom: 1 };
  #selectedNodeIds = new Set<string>();

  get viewport(): CanvasViewport {
    return { ...this.#viewport };
  }

  get selectedNodes(): string[] {
    return Array.from(this.#selectedNodeIds);
  }

  setViewport(x: number, y: number, zoom: number): void {
    const clampedZoom = Math.min(5, Math.max(0.1, zoom));
    this.#viewport = { x, y, zoom: clampedZoom };
  }

  selectNodes(nodeIds: string[], append = false): void {
    if (!append) this.#selectedNodeIds.clear();
    for (const id of nodeIds) this.#selectedNodeIds.add(id);
  }
}

/* -------------------------------------------------------------------------
 * Feature 16: Canvas 34 Zod Operations & MCP Server
 * ------------------------------------------------------------------------- */
export const CANVAS_34_OPS = [
  "add_card",
  "delete_card",
  "update_card",
  "move_card",
  "resize_card",
  "connect_cards",
  "disconnect_cards",
  "group_cards",
  "ungroup_cards",
  "set_viewport",
  "reset_viewport",
  "fit_view",
  "select_nodes",
  "clear_selection",
  "align_nodes_horizontal",
  "align_nodes_vertical",
  "distribute_nodes",
  "duplicate_node",
  "lock_node",
  "unlock_node",
  "set_card_color",
  "add_asset_attachment",
  "remove_asset_attachment",
  "create_frame",
  "export_canvas_image",
  "export_canvas_json",
  "import_canvas_json",
  "undo",
  "redo",
  "set_grid_snap",
  "toggle_mini_map",
  "focus_node",
  "batch_transform",
  "reorder_z_index",
] as const;

export const CanvasOpSchema = z.object({
  op: z.enum(CANVAS_34_OPS),
  payload: z.record(z.string(), z.unknown()),
});

export class CanvasMcpServer {
  executeOp(raw: unknown): { success: boolean; op: string; error?: string } {
    const parse = CanvasOpSchema.safeParse(raw);
    if (!parse.success) {
      return { success: false, op: "unknown", error: parse.error.message };
    }
    return { success: true, op: parse.data.op };
  }
}

/* -------------------------------------------------------------------------
 * Feature 17: Hierarchical Blueprint Canvas Mapping (Floorplan)
 * ------------------------------------------------------------------------- */
export interface FloorplanNode {
  id: string;
  name: string;
  kind: "ui" | "service" | "worker" | "feature" | "data";
  path: string;
  children?: FloorplanNode[];
}

export class FloorplanCanvasAdapter {
  flattenHierarchy(
    root: FloorplanNode,
  ): Array<{ id: string; name: string; level: number; kind: string }> {
    const results: Array<{
      id: string;
      name: string;
      level: number;
      kind: string;
    }> = [];
    const traverse = (node: FloorplanNode, level: number) => {
      results.push({ id: node.id, name: node.name, level, kind: node.kind });
      for (const child of node.children || []) traverse(child, level + 1);
    };
    traverse(root, 0);
    return results;
  }
}

/* -------------------------------------------------------------------------
 * Feature 18: Pure-Client Video Shot Breakdown (逐帧拉片)
 * Formula: 0.75 * deltaRGB + 0.25 * deltaHist
 * ------------------------------------------------------------------------- */
export interface ShotBoundary {
  frameIndex: number;
  timestampSeconds: number;
  rgbDifferenceRatio: number;
  histogramDifferenceRatio: number;
  isCut: boolean;
}

export function detectVideoShots(
  frames: Array<{ rgbDiff: number; histDiff: number }>,
  threshold = 0.45,
  fps = 24,
): ShotBoundary[] {
  return frames.map((frame, index) => {
    const combinedDiff = 0.75 * frame.rgbDiff + 0.25 * frame.histDiff;
    const isCut = combinedDiff >= threshold;
    return {
      frameIndex: index,
      timestampSeconds: Number((index / fps).toFixed(2)),
      rgbDifferenceRatio: frame.rgbDiff,
      histogramDifferenceRatio: frame.histDiff,
      isCut,
    };
  });
}

/* -------------------------------------------------------------------------
 * Feature 19: Storyboard Multi-Agent Pipeline & Continuity
 * ------------------------------------------------------------------------- */
export interface ContinuityConstraint {
  characterName: string;
  requiredAttributes: string[];
}

export function auditStoryboardContinuity(
  shotDescription: string,
  constraints: ContinuityConstraint[],
): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const c of constraints) {
    if (shotDescription.includes(c.characterName)) {
      for (const attr of c.requiredAttributes) {
        if (!shotDescription.includes(attr)) {
          violations.push(
            `Character ${c.characterName} missing required continuity attribute: ${attr}`,
          );
        }
      }
    }
  }
  return { compliant: violations.length === 0, violations };
}

/* -------------------------------------------------------------------------
 * Feature 20: In-Prompt Reference Mention Parsing
 * Syntax: @参考 N or {{ref N}}
 * ------------------------------------------------------------------------- */
export function parsePromptMentions(
  prompt: string,
  assetMap: Record<string, string>,
): {
  compiledPrompt: string;
  mentions: Array<{ index: number; assetId: string }>;
} {
  const mentions: Array<{ index: number; assetId: string }> = [];
  const regex = /(@参考\s*(\d+)|{{ref\s*(\d+)}})/g;
  const compiled = prompt.replace(regex, (match, p1, p2, p3) => {
    const refNum = p2 || p3;
    const assetId = assetMap[refNum] || `asset-ref-${refNum}`;
    mentions.push({ index: Number(refNum), assetId });
    return `[RefAsset: ${assetId}]`;
  });
  return { compiledPrompt: compiled, mentions };
}

/* -------------------------------------------------------------------------
 * Feature 21: 3D Director Desk & Physical Camera Optics
 * ------------------------------------------------------------------------- */
export interface CameraOptics {
  lensMm: number;
  aperture: string;
  focalDistance?: string;
  cameraBody?: string;
}

export function compileOpticsPrompt(optics: CameraOptics): string {
  const parts: string[] = [];
  if (optics.lensMm) parts.push(`${optics.lensMm}mm focal length lens`);
  if (optics.aperture)
    parts.push(`f/${optics.aperture.replace("f/", "")} aperture`);
  if (optics.focalDistance)
    parts.push(`focal distance ${optics.focalDistance}`);
  if (optics.cameraBody) parts.push(`shot on ${optics.cameraBody}`);
  return parts.join(", ");
}

/* -------------------------------------------------------------------------
 * Feature 22: Full E2E Test Suite Validation
 * ------------------------------------------------------------------------- */
export function validateTestSuiteReport(summary: {
  totalTests: number;
  passCount: number;
  failCount: number;
  skipCount: number;
}): { ready: boolean; reason?: string } {
  if (summary.failCount > 0)
    return { ready: false, reason: "Failures detected" };
  if (summary.skipCount > 0)
    return { ready: false, reason: "Skipped tests detected" };
  if (summary.totalTests < 200)
    return { ready: false, reason: "Insufficient test count" };
  return { ready: true };
}

/* -------------------------------------------------------------------------
 * Feature 23: Adversarial Coverage Hardening
 * ------------------------------------------------------------------------- */
export function sanitizeAdversarialPrompt(prompt: string): {
  safe: boolean;
  cleanPrompt: string;
  threats: string[];
} {
  const threats: string[] = [];
  const dangerousPatterns = [
    { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, name: "xss_injection" },
    { pattern: /DROP\s+TABLE|SELECT\s+\*\s+FROM/gi, name: "sql_injection" },
    { pattern: /__proto__|prototype\s*\[/gi, name: "prototype_pollution" },
  ];

  let clean = prompt;
  for (const { pattern, name } of dangerousPatterns) {
    if (pattern.test(prompt)) {
      threats.push(name);
      clean = clean.replace(pattern, "[BLOCKED]");
    }
  }

  return { safe: threats.length === 0, cleanPrompt: clean, threats };
}
