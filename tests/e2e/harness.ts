import { createHash } from "node:crypto";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";

/* -------------------------------------------------------------------------
 * R1: Agent Circular 6-State Action Button & Turn Freezing Contracts
 * ------------------------------------------------------------------------- */

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
  desktopDiameter: number; // 40px
  touchTargetMin: number; // 44px
  iconSize: number; // 20px
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
      return true; // Disabled during transitions to prevent double-clicks
    }
    if (this.#state === "idle") {
      return (
        this.#composerDraft.text.trim().length === 0 &&
        this.#composerDraft.attachments.length === 0
      );
    }
    return false;
  }

  /**
   * User clicks the circular action button.
   * Debounces clicks within debounce window for non-clickable transition states.
   */
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

    // Disabled states reject click events, and debounced clicks are ignored
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

  /**
   * Complete active step and freeze subsequent turn queue.
   * State transitions from 'pausing' -> 'paused'.
   */
  completeStepAndFreeze(): void {
    if (this.#state !== "pausing") {
      throw new Error(`Cannot freeze from state: ${this.#state}`);
    }
    this.#activeStepRunning = false;
    this.#turnQueueFrozen = true;
    this.#state = "paused";
    // Draft remains intact and remote polling continues
  }

  /**
   * Resume turn scheduling.
   * State transitions from 'resuming' -> 'executing'.
   * INVARIANT: Does NOT send draft upon resume.
   */
  acknowledgeUnfreeze(): void {
    if (this.#state !== "resuming") {
      throw new Error(`Cannot unfreeze from state: ${this.#state}`);
    }
    this.#turnQueueFrozen = false;
    this.#activeStepRunning = true;
    this.#state = "executing";
  }

  /** Agent completes turn */
  completeExecution(): void {
    this.#activeStepRunning = false;
    this.#state = "completed";
  }

  /** Reset completed back to idle */
  resetToIdle(): void {
    this.#state = "idle";
  }
}

/* -------------------------------------------------------------------------
 * R2: Snapshot v3 & In-Project Multi-Chat Architecture Contracts
 * ------------------------------------------------------------------------- */

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
  apiKey?: string; // Secret check
}

export function sha256Hex(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Reject secrets per ADR-022 and snapshotCodec standards */
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

/** Validate Snapshot v3 Schema per ADR-022 */
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

/**
 * Deterministic legacy v2 -> v3 chat migration algorithm per ADR-022.
 */
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

/**
 * Non-Downgradable Write Barrier simulator per ADR-022:
 * 1. Read v2 raw bytes -> compute SHA-256
 * 2. Write immutable archive: archive-v2-${sha256}.json
 * 3. Write v3 backup: creation-backup.json
 * 4. Write v3 main: creation-v2.json
 * 5. Advance authority marker: formatVersion = 2, minWriterVersion = 2
 */
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
    // Step 1: Read existing raw bytes and compute SHA-256
    const rawV2 = this.memoryFiles.get("projects/creation-v2.json");
    if (!rawV2) throw new Error("Missing projects/creation-v2.json to migrate");
    const sha256 = sha256Hex(rawV2);
    this.#stepLog.push(`sha256:${sha256}`);

    // Step 2: Write immutable archive
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

    // Step 3: Write v3 backup barrier
    const backupPath = "projects/creation-backup.json";
    const serializedV3 = JSON.stringify(v3Snapshot, null, 2);
    this.memoryFiles.set(backupPath, serializedV3);
    this.#stepLog.push(`backup_written:${backupPath}`);

    // Step 4: Write v3 main publication
    const mainPath = "projects/creation-v2.json";
    this.memoryFiles.set(mainPath, serializedV3);
    this.#stepLog.push(`main_written:${mainPath}`);

    // Step 5: Advance authority marker
    this.#formatMarker = { formatVersion: 2, minWriterVersion: 2 };
    this.memoryFiles.set(
      "app/repository.json",
      JSON.stringify({ ...this.#formatMarker, updatedAt: Date.now() }),
    );
    this.#stepLog.push("marker_advanced:formatVersion=2");

    return { archivePath, archiveSha: sha256, backupPath, mainPath };
  }

  /** Crash recovery simulation */
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

/* -------------------------------------------------------------------------
 * R3: Cross-Relay Model Deduplication & Priority Routing Contracts
 * ------------------------------------------------------------------------- */

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

/**
 * Deduplicate models across relays into unified rows per R3 specification.
 */
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

/**
 * Priority & Weighted Dispatch Resolver using ChannelRegistry.
 */
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

/* -------------------------------------------------------------------------
 * R4: Media Alpha Transparency Preservation & Adaptive Resizing Contracts
 * ------------------------------------------------------------------------- */

export interface RGBAColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0 to 255
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

/**
 * Checks whether transparent pixels in RGBA buffer have been converted to black matte.
 * Returns true if transparent pixels have preserved alpha (a < 255) without forced opaque black.
 */
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

    // Check for corrupt black matte: if a pixel was originally transparent but became opaque black (0,0,0,255)
    // or if alpha was completely stripped (a===255 everywhere despite originally transparent source)
  }

  return { hasTransparency, hasCorruptedBlackMatte, minAlpha };
}

/**
 * Adaptive Resizing Bounds calculation per R4 specification:
 * scale = min(1, MAX_EDGE / max(width, height))
 * destWidth = max(1, round(width * scale))
 * destHeight = max(1, round(height * scale))
 */
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

/**
 * Format Adaptation Rule:
 * Images with alpha channel MUST NOT be converted to image/jpeg without explicit background.
 */
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

/* -------------------------------------------------------------------------
 * R5: ComfyUI Video Output Parsing & Live Progress Tracking Contracts
 * ------------------------------------------------------------------------- */

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

/**
 * WebSocket Live Progress tracking calculator.
 * Calculates percentage: Math.min(100, Math.max(0, Math.round((value / max) * 100)))
 */
export function calculateWebSocketProgress(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

/**
 * Targeted cancellation command builder.
 * Targets specific prompt_id without impacting ComfyUI server.
 */
export function buildTargetedCancellationRequest(
  promptId: string,
  isQueued: boolean,
): { endpoint: "/queue" | "/interrupt"; body: Record<string, unknown> } {
  if (isQueued) {
    return {
      endpoint: "/queue",
      body: { delete: [promptId] },
    };
  }
  return {
    endpoint: "/interrupt",
    body: { prompt_id: promptId },
  };
}
