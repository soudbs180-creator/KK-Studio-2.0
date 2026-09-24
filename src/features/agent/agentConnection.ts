/** Codex 会话、具名 SSE 与 KK 画布桥的应用级 store。 */
import { memoryService } from "../memory/index.ts";
import {
  AGENT_CONNECT_TIMEOUT_MS,
  AGENT_DEFAULT_URL,
  type AgentApprovalDecision,
  type AgentApprovalRequest,
  type AgentChatItem,
  type AgentConversationState,
  type AgentEvent,
  type AgentModel,
  type AgentPermissionMode,
  type AgentReasoningEffort,
  type CanvasAgentOp,
  type CanvasAgentSnapshot,
  type AgentTurnResponse,
  type AgentThreadResponse,
} from "./agentTypes.ts";
import {
  AgentApiError,
  agentEndpoint,
  createAgentApi,
  type AgentApi,
} from "./agentApi.ts";
import {
  formatAgentActivity,
  mergeAgentChatItem,
  parseAgentSseEvent,
} from "./agentEvents.ts";
import {
  createAgentEventStream,
  type EventSourceLike,
} from "./agentEventStream.ts";
export type { EventSourceLike } from "./agentEventStream.ts";
import {
  parseAgentUsage,
  isAgentQuotaExhausted,
  type AgentUsageWindow,
} from "./agentUsage.ts";
import {
  generatedImageItems,
  generatedImageId,
  generatedImageSource,
  canvasGenerationMetadata,
} from "./agentImages.ts";
import {
  prepareAgentAttachments,
  type AgentDraftAttachment,
} from "./agentAttachments.ts";
export interface AgentOpResult {
  applied: CanvasAgentOp[];
  rejected: Array<{ op: CanvasAgentOp; reason: string }>;
  tasks?: Array<{ taskId: string; nodeId: string; status: string }>;
}
export interface AgentBridge {
  hasGeneratedImage?(id: string): boolean;
  importGeneratedImage?(input: {
    id: string;
    blob: Blob;
    projectId: string;
    signal: AbortSignal;
    sourceNodeId?: string;
  }): Promise<void>;
  getSnapshot(): CanvasAgentSnapshot | null;
  applyOps(
    ops: CanvasAgentOp[],
    context?: { signal: AbortSignal },
  ): AgentOpResult | Promise<AgentOpResult>;
}
export type AgentConnectionStatus =
  "disconnected" | "connecting" | "connected" | "error";
export interface AgentConnectionState {
  connectionRevision: number;
  preparing: boolean;
  endpoint: string;
  token: string;
  status: AgentConnectionStatus;
  activity: string;
  error: string | null;
  clientId: string;
  conversation: AgentConversationState | null;
  messages: AgentChatItem[];
  pendingApproval: AgentApprovalRequest | null;
  sending: boolean;
  lastConnectedAt: number | null;
  protocolVersion?: number;
  models: AgentModel[];
  usage: AgentUsageWindow[];
  usageError: string | null;
  usageCheckedAt?: number;
  canvasNodeId?: string;
}
export interface AgentConnectionOptions {
  prepareAttachments?: typeof prepareAgentAttachments;
  eventSourceFactory?: (url: string, token?: string) => EventSourceLike;
  fetcher?: typeof fetch;
  clientId?: string;
  storage?: AgentStorage;
  connectTimeoutMs?: number;
}
export type AgentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export const safeStorage: AgentStorage =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem(key: string) {
          return globalThis.__agentMemoryStorage?.get(key) ?? null;
        },
        setItem(key: string, value: string) {
          (globalThis.__agentMemoryStorage ??= new Map()).set(key, value);
        },
        removeItem(key: string) {
          globalThis.__agentMemoryStorage?.delete(key);
        },
      };
declare global {
  var __agentMemoryStorage: Map<string, string> | undefined;
}

const PERMISSION_MODE_KEY = "canvas-agent-permission-mode";
const MODEL_KEY = "canvas-agent-model";
const EFFORT_KEY = "canvas-agent-reasoning-effort";
const preferenceListeners = new Set<() => void>();
export function subscribeAgentPreferences(listener: () => void) {
  preferenceListeners.add(listener);
  return () => {
    preferenceListeners.delete(listener);
  };
}

export function readPermissionMode(): AgentPermissionMode {
  const value = safeStorage.getItem(PERMISSION_MODE_KEY);
  return value === "automatic" || value === "full" ? value : "request";
}
export function writePermissionMode(mode: AgentPermissionMode): void {
  safeStorage.setItem(PERMISSION_MODE_KEY, mode);
  preferenceListeners.forEach((listener) => listener());
}
export function readAgentModel(): string | undefined {
  return safeStorage.getItem(MODEL_KEY) ?? undefined;
}
export function writeAgentModel(model: string | undefined): void {
  if (model) safeStorage.setItem(MODEL_KEY, model);
  else safeStorage.removeItem(MODEL_KEY);
}
export function readAgentEffort(): AgentReasoningEffort | "" {
  const value = safeStorage.getItem(EFFORT_KEY) as AgentReasoningEffort | "";
  return value ? value : "";
}
export function writeAgentEffort(effort: AgentReasoningEffort | ""): void {
  if (effort) safeStorage.setItem(EFFORT_KEY, effort);
  else safeStorage.removeItem(EFFORT_KEY);
}

const KK_INSTRUCTIONS = `你是 KK Studio 的主 Agent。用户选择的生成模型不是你的推理模型。
先读取画布再操作。KK 支持 canvas_apply_ops 的 add_node/update_node/delete_node/connect_nodes/delete_connections/run_generation/select_nodes/set_viewport。选择节点和设置视口会更新真实界面；视口缩放范围 0.2–4。
节点类型为 text、image（video/audio 生成暂未接入）；配置节点 metadata.mode 指定 image/text，metadata.prompt 为提示词。
run_generation 通过 KK 已配置的 Provider 提交真实任务，返回任务 ID 仅表示已受理。通过 canvas_get_state 的 generationStatus 和 generationTask 查询状态，不能把 queued/running 当作完成。
先优化提示词，再按用户要求生成。没有 Provider 或登录时说明缺口，不虚构成功，不自行改用其他付费接口。
用户明确要求 Codex/ChatGPT 内置生图、或选择 Codex 图片入口时，可直接使用内置 imagegen/image_generation 工具，KK 会读取完成事件并将图片归档到画布；这使用 Codex 账号额度，不需要生成 API Key。必须实际调用内置工具，不能用脚本绘图冒充。
用户主动添加的图片会作为附件传给你；引用画布图片时以所附原件为准。附件导入画布工具尚未接入，其他工具如返回 unsupported，不得声称已执行。不要为实现画布操作修改项目源码。
`;
export function createAgentConnection(options: AgentConnectionOptions = {}) {
  const clientId = options.clientId ?? crypto.randomUUID();
  const storage = options.storage ?? safeStorage;
  storage.removeItem("canvas-agent-token");
  let state: AgentConnectionState = {
    connectionRevision: 0,
    preparing: false,
    endpoint: storage.getItem("canvas-agent-url") ?? AGENT_DEFAULT_URL,
    token: "",
    status: "disconnected",
    activity: "",
    error: null,
    clientId,
    conversation: null,
    messages: [],
    pendingApproval: null,
    sending: false,
    lastConnectedAt: null,
    models: [],
    usage: [],
    usageError: null,
  };
  const listeners = new Set<() => void>();
  let api: AgentApi | null = null;
  let source: EventSourceLike | null = null;
  let controller: AbortController | null = null;
  let toolController = new AbortController();
  let bridge: AgentBridge | null = null;
  let epoch = 0;
  let projectId = "";
  let initializing = false;
  let rejectHello: ((error: Error) => void) | null = null;
  const handledTools = new Map<string, Promise<void>>();
  let toolQueue = Promise.resolve();
  let toolReceiptError: string | null = null;
  const approvals = new Map<string, AgentApprovalRequest>();
  const patch = (next: Partial<AgentConnectionState>) => {
    state = { ...state, ...next };
    listeners.forEach((fn) => fn());
  };
  const errorText = (error: unknown) =>
    error instanceof Error ? error.message : "Agent 请求失败";
  const currentProject = () => bridge?.getSnapshot()?.projectId ?? "";
  const threadKey = () => "kk-agent-thread:" + (projectId || "workspace");
  function stopTransport() {
    toolController.abort();
    epoch++;
    approvals.clear();
    patch({
      connectionRevision: epoch,
      preparing: false,
      pendingApproval: null,
    });
    controller?.abort();
    controller = null;
    source?.close();
    source = null;
    api = null;
    rejectHello?.(new Error("连接已取消"));
    rejectHello = null;
    handledTools.clear();
  }
  function disconnect() {
    stopTransport();
    patch({
      status: "disconnected",
      conversation: null,
      messages: [],
      pendingApproval: null,
      sending: false,
      activity: "",
      error: null,
      models: [],
      canvasNodeId: undefined,
      usage: [],
      usageError: null,
      usageCheckedAt: undefined,
    });
  }
  function fail(error: unknown) {
    stopTransport();
    patch({
      status: "error",
      sending: false,
      error: errorText(error),
      activity: "连接或执行失败",
    });
  }
  function message(item: AgentChatItem) {
    const existing = state.messages.find(
      (x) =>
        x.id === item.id ||
        Boolean(
          x.turnId &&
          x.turnId === item.turnId &&
          (x.itemId ?? x.id) === (item.itemId ?? item.id) &&
          (!x.threadId || !item.threadId || x.threadId === item.threadId),
        ) ||
        Boolean(
          item.clientMessageId && x.clientMessageId === item.clientMessageId,
        ),
    );
    patch({
      messages: existing
        ? state.messages.map((x) =>
            x === existing ? mergeAgentChatItem(x, item) : x,
          )
        : [...state.messages, mergeAgentChatItem(undefined, item)],
    });
  }
  function handle(event: AgentEvent) {
    switch (event.kind) {
      case "conversation":
        if (
          !initializing &&
          state.conversation?.threadId &&
          event.conversation.threadId !== state.conversation.threadId
        ) {
          fail(new Error("服务会话已被其他窗口切换，请重新连接当前项目。"));
          return;
        }
        patch({
          conversation: event.conversation,
          ...(event.conversation.status === "running" ? { sending: true } : {}),
        });
        break;
      case "message":
        if (
          event.item.threadId &&
          state.conversation?.threadId &&
          event.item.threadId !== state.conversation.threadId
        )
          return;
        message(event.item);
        break;
      case "activity": {
        const text = formatAgentActivity(event.itemType, event.item);
        patch({ activity: text });
        message({ id: "activity:" + event.item.id, role: "tool", text });
        break;
      }
      case "terminal":
        toolController.abort();
        void finishTurn(event);
        break;
      case "approval":
        approvals.set(event.approval.requestId, event.approval);
        patch({ pendingApproval: approvals.values().next().value ?? null });
        break;
      case "approval_resolved":
        approvals.delete(event.requestId);
        patch({ pendingApproval: approvals.values().next().value ?? null });
        break;
      case "codex":
        if (event.busy) patch({ sending: true });
        else if (state.sending && !initializing) {
          toolController.abort();
          void finishTurn({ kind: "terminal", status: "completed" });
        }
        break;
      case "bootstrap":
        if (event.type === "codex.prepare_failed")
          fail(new Error(event.error || "Codex 启动失败，请检查登录状态。"));
        break;
      case "tool_call":
        if (!handledTools.has(event.requestId)) {
          const version = epoch,
            signal = toolController.signal;
          // A new request ID may be a retry of an already accepted operation.
          // Do not execute another write until the previous receipt is confirmed.
          const run = toolQueue.then(async () => {
            if (version !== epoch || signal.aborted || toolReceiptError) return;
            await handleTool(event.requestId, event.name, event.input);
          });
          toolQueue = run.catch(() => undefined);
          handledTools.set(event.requestId, run);
          void run.finally(() => {
            if (handledTools.size > 128)
              handledTools.delete(handledTools.keys().next().value!);
          });
        }
        break;
    }
  }
  async function syncGeneratedImages(
    messages?: AgentChatItem[],
  ): Promise<void> {
    const activeApi = api,
      activeBridge = bridge,
      threadId = state.conversation?.threadId,
      boundProject = projectId,
      version = epoch,
      signal = controller?.signal;
    if (
      !activeApi ||
      !activeBridge?.importGeneratedImage ||
      !threadId ||
      !signal
    )
      return;
    const history =
      messages ?? (await activeApi.readThread(threadId)).messages ?? [];
    for (const item of generatedImageItems(history)) {
      const id = generatedImageId(threadId, item.itemId ?? item.id);
      if (version !== epoch || signal.aborted) return;
      if (
        activeBridge.hasGeneratedImage?.(id) ||
        activeBridge.getSnapshot()?.nodes.some((node) => node.id === id)
      )
        continue;
      const blob = await activeApi.generatedImage(
        threadId,
        item.itemId ?? item.id,
      );
      if (version !== epoch || signal.aborted) return;
      await activeBridge.importGeneratedImage({
        id,
        blob,
        projectId: boundProject,
        signal,
        sourceNodeId: generatedImageSource(history, item, boundProject),
      });
    }
  }
  async function finishTurn(
    event: Extract<AgentEvent, { kind: "terminal" }>,
  ): Promise<void> {
    const version = epoch;
    let error = toolReceiptError ?? event.error ?? null;
    try {
      await syncGeneratedImages();
    } catch (failure) {
      error = errorText(failure) + "；请重新连接以重试归档，勿重复生成。";
    }
    if (version !== epoch) return;
    approvals.clear();
    patch({
      sending: false,
      pendingApproval: null,
      activity: event.status === "completed" ? "本轮已完成" : "本轮已结束",
      error,
      canvasNodeId: undefined,
    });
    if (error) message({ id: crypto.randomUUID(), role: "error", text: error });
    void refreshUsage();
  }
  async function handleTool(
    requestId: string,
    name: string,
    input: Record<string, unknown>,
  ) {
    const activeApi = api;
    const version = epoch;
    if (!activeApi) return;
    try {
      if (currentProject() !== projectId)
        throw new Error("项目已切换，未执行旧会话操作。");
      if (name !== "canvas_apply_ops")
        throw new Error("KK 尚未接入工具 " + name);
      if (!bridge || !Array.isArray(input.ops))
        throw new Error("没有可操作的画布或操作参数无效");
      const result = await bridge.applyOps(input.ops as CanvasAgentOp[], {
        signal: toolController.signal,
      });
      if (version !== epoch) return;
      // Receipt must report already accepted tasks even if the snapshot upload fails.
      await activeApi
        .postToolResult({
          requestId,
          result: {
            ok: result.rejected.length === 0,
            applied: result.applied.length,
            rejected: result.rejected.map((x) => x.reason),
            tasks: result.tasks ?? [],
          },
        })
        .catch(async () => {
          if (version !== epoch) return;
          toolReceiptError =
            "画布操作已执行，但回执未确认。本轮写入已停止；请核对任务记录后重新连接，避免重复生成。";
          toolController.abort();
          patch({ error: toolReceiptError });
          await activeApi
            .interrupt(state.conversation?.threadId)
            .catch(() => undefined);
        });
      await activeApi.postState(bridge.getSnapshot()).catch(() => undefined);
    } catch (error) {
      if (version === epoch)
        await activeApi
          .postToolResult({ requestId, error: errorText(error) })
          .catch(() => undefined);
    }
  }
  async function connect(newConversation = false): Promise<void> {
    if (state.status === "connecting") return;
    stopTransport();
    const version = epoch;
    projectId = currentProject();
    const queuedEvents: AgentEvent[] = [];
    toolQueue = Promise.resolve();
    toolReceiptError = null;
    toolController = new AbortController();
    initializing = true;
    patch({
      status: "connecting",
      activity: "正在连接 Codex…",
      error: null,
      messages: [],
      conversation: null,
      sending: false,
      models: [],
    });
    try {
      const endpoint = agentEndpoint(state.endpoint);
      storage.setItem("canvas-agent-url", endpoint);
      controller = new AbortController();
      const activeApi = createAgentApi({
        endpoint,
        token: state.token,
        clientId,
        fetcher: options.fetcher,
        signal: controller.signal,
      });
      api = activeApi;
      const config = await activeApi.discover();
      if (!config.ok || config.protocolVersion !== 6)
        throw new Error(
          "本地 Agent 协议不兼容，请使用项目提供的 canvas-agent。",
        );
      if (version !== epoch) return;
      patch({ protocolVersion: config.protocolVersion });
      const hello = await new Promise<Extract<AgentEvent, { kind: "hello" }>>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("等待 Agent 握手超时")),
            options.connectTimeoutMs ?? AGENT_CONNECT_TIMEOUT_MS,
          );
          rejectHello = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
          source = options.eventSourceFactory
            ? options.eventSourceFactory(
                endpoint + "/events?clientId=" + encodeURIComponent(clientId),
                state.token,
              )
            : createAgentEventStream(
                endpoint + "/events?clientId=" + encodeURIComponent(clientId),
                state.token,
                options.fetcher,
              );
          source.onmessage = (frame) => {
            if (version !== epoch) return;
            try {
              const event = parseAgentSseEvent(
                frame.type ?? "message",
                JSON.parse(frame.data ?? "null"),
              );
              if (!event) return;
              if (event.kind === "hello") {
                clearTimeout(timeout);
                rejectHello = null;
                resolve(event);
              } else if (initializing && event.kind === "tool_call") {
                // A pending write can expire before history/model reads finish.
                // Reply now; never execute a buffered write after reconnect.
                if (!handledTools.has(event.requestId)) {
                  const error =
                    "KK 正在恢复连接，未执行本次画布操作。请在连接完成后确认是否需要重试。";
                  const receipt = activeApi
                    .postToolResult({ requestId: event.requestId, error })
                    .then(() => undefined)
                    .catch(() => undefined);
                  handledTools.set(event.requestId, receipt);
                  queuedEvents.push({
                    kind: "message",
                    item: {
                      id: "recovery:" + event.requestId,
                      role: "error",
                      text: error,
                    },
                  });
                }
              } else if (initializing) queuedEvents.push(event);
              else handle(event);
            } catch {
              /* Ignore malformed frames without reporting a successful connection. */
            }
          };
          source.onerror = (error) => {
            const failure =
              error ?? new Error("本地 Agent 连接已断开，请重连确认会话状态。");
            clearTimeout(timeout);
            reject(failure);
            if (version === epoch) fail(failure);
          };
        },
      );
      if (version !== epoch) return;
      const saved = newConversation ? null : storage.getItem(threadKey());
      const remote = hello.conversation;
      patch({ conversation: remote ?? null });
      if (
        hello.busy &&
        (newConversation || !saved || saved !== remote?.threadId)
      )
        throw new Error("Codex 当前有其他会话运行，未接管。请等待结束后重连。");
      if (!newConversation && !saved && remote?.threadId)
        throw new Error(
          "服务已有其他会话，未创建或替换。请在原项目继续，或明确点击新建 Agent 会话。",
        );
      await activeApi.activate();
      await activeApi.postState(bridge?.getSnapshot() ?? null);
      let thread: AgentThreadResponse;
      if (newConversation)
        thread = await activeApi.newThread(readPermissionMode());
      else if (saved && saved === remote?.threadId) {
        thread = await activeApi.readThread(saved);
        thread.conversation ??= remote;
      } else if (saved)
        thread = await activeApi.resumeThread(saved, readPermissionMode());
      else {
        if (!remote || remote.status !== "idle" || remote.threadId)
          throw new Error(
            "Agent 未返回可安全初始化的空会话，请更新服务后重连。",
          );
        patch({ preparing: true });
        thread = await activeApi.prepareConversation(
          readPermissionMode(),
          remote,
        );
        if (thread.conversation?.threadId)
          thread = {
            ...thread,
            ...(await activeApi.readThread(thread.conversation.threadId)),
            conversation: thread.conversation,
          };
      }
      if (version !== epoch) return;
      const conversation = thread.conversation ?? state.conversation;
      if (
        !conversation?.threadId ||
        !["ready", "warning", ...(hello.busy ? ["running"] : [])].includes(
          conversation.status,
        )
      )
        throw new Error(
          conversation?.error || "Codex 会话未就绪，请确认 Codex 已登录。",
        );
      const models = await activeApi.models();
      if (version !== epoch) return;
      storage.setItem(threadKey(), conversation.threadId);
      if (thread.settledTurnIds?.length)
        await activeApi.acknowledgeHistory(
          conversation.threadId,
          thread.settledTurnIds,
        );
      if (version !== epoch) return;
      if (saved && saved === remote?.threadId)
        for (const approval of hello.pendingApprovals)
          approvals.set(approval.requestId, approval);
      patch({
        status: "connected",
        activity: "Codex 已就绪",
        conversation,
        messages: (thread.messages ?? []).map((item) =>
          item.role === "assistant"
            ? {
                ...item,
                detail: {
                  ...(item.detail as Record<string, unknown>),
                  phase: "completed",
                },
              }
            : item,
        ),
        models: models.data ?? [],
        sending: hello.busy,
        preparing: false,
        pendingApproval: approvals.values().next().value ?? null,
        lastConnectedAt: Date.now(),
      });
      initializing = false;
      // SSE may advance while the history/model reads are in flight. Replay in
      // order after seeding the snapshot, never overwrite it with stale hello.
      for (const event of queuedEvents) {
        if (version !== epoch) return;
        if (
          event.kind === "conversation" &&
          event.conversation.revision < (state.conversation?.revision ?? 0)
        )
          continue;
        handle(event);
      }
      await refreshUsage();
      await syncGeneratedImages(thread.messages ?? []);
    } catch (error) {
      if (version === epoch) fail(error);
    } finally {
      if (version === epoch) {
        initializing = false;
        patch({ preparing: false });
      }
    }
  }
  async function refreshUsage(): Promise<void> {
    if (!api || state.status !== "connected") return;
    const version = epoch;
    try {
      const payload = await api.usage();
      if (version !== epoch) return;
      const usage = parseAgentUsage(payload);
      patch({
        usage,
        usageError: usage.length ? null : "当前账号未返回额度信息",
        usageCheckedAt: Date.now(),
      });
    } catch {
      if (version === epoch)
        patch({ usageError: "暂时无法读取 Codex 额度；已有数据可能过期" });
    }
  }
  async function sendMessage(
    text: string,
    input?: {
      model?: string;
      effort?: AgentReasoningEffort | "";
      canvasSource?: { nodeId: string; kind: "image" | "text" };
      attachments?: AgentDraftAttachment[];
      /** Internal turns such as memory extraction must not learn from themselves. */
      memoryMode?: "normal" | "none";
    },
  ): Promise<{ ok: boolean; error?: string; messageId?: string }> {
    if (toolReceiptError) return { ok: false, error: toolReceiptError };
    if (!text.trim() || state.status !== "connected" || !api)
      return { ok: false, error: "请先连接 Codex 主 Agent。" };
    if (currentProject() !== projectId) {
      disconnect();
      return { ok: false, error: "项目已切换，请重新连接。" };
    }
    if (state.sending) return { ok: false, error: "Codex 正在运行，请稍候。" };
    const conversation = state.conversation;
    if (!conversation?.threadId) return { ok: false, error: "对话尚未就绪" };
    if (!["ready", "warning"].includes(conversation.status))
      return { ok: false, error: "当前会话尚未就绪，请等待或重新连接。" };
    const version = epoch;
    const activeApi = api;
    const messageId = crypto.randomUUID();
    const selectedAttachments = (input?.attachments ?? []).map((item) => ({
      ...item,
    }));
    const messageText =
      text.trim() +
      (selectedAttachments.length
        ? "\n\n参考图片：" +
          selectedAttachments.map((item) => item.name).join("、")
        : "");
    toolController = new AbortController();
    const signal = toolController.signal;
    message({
      id: messageId,
      clientMessageId: messageId,
      role: "user",
      text: messageText,
      threadId: conversation.threadId,
    });
    patch({ sending: true, error: null, activity: "发送中…" });
    if (input?.memoryMode !== "none")
      void memoryService.ingestMessage(text.trim(), "user");
    try {
      const attachments = await (
        options.prepareAttachments ?? prepareAgentAttachments
      )(selectedAttachments, { signal });
      if (version !== epoch || signal.aborted) throw new Error("发送已取消");
      const snapshot = bridge?.getSnapshot();
      const canvasReferences = selectedAttachments
        .filter((item) => item.canvasNodeId)
        .map((item) => {
          if (!snapshot?.nodes.some((node) => node.id === item.canvasNodeId))
            throw new Error("引用的画布节点已删除，请重新选择图片。");
          return {
            nodeId: item.canvasNodeId!,
            label: "参考图片",
            title: item.name,
            kind: "image" as const,
          };
        });
      await refreshUsage();
      if (version !== epoch || toolController.signal.aborted)
        throw new Error("发送已取消");
      if (!state.usageError && isAgentQuotaExhausted(state.usage))
        throw new Error("Codex 额度已用完，请等待重置。");
      await activeApi.activate();
      if (version !== epoch || toolController.signal.aborted)
        throw new Error("发送已取消");
      await activeApi.postState(bridge?.getSnapshot() ?? null);
      if (version !== epoch || toolController.signal.aborted)
        throw new Error("发送已取消");
      const memoryInjection =
        input?.memoryMode === "none"
          ? ""
          : await memoryService.buildInjection(text.trim());
      if (version !== epoch || toolController.signal.aborted)
        throw new Error("发送已取消");
      const response = await activeApi.postTurn({
        prompt:
          KK_INSTRUCTIONS +
          (memoryInjection ? "\n\n" + memoryInjection + "\n" : "") +
          "\n用户指令：\n" +
          text.trim() +
          (canvasReferences.length
            ? "\n附图对应画布节点：" + JSON.stringify(canvasReferences)
            : ""),
        messageText,
        messageId,
        clientId,
        threadId: conversation.threadId,
        conversationId: conversation.conversationId,
        expectedRevision: conversation.revision,
        permissionMode: readPermissionMode(),
        model: input?.model ?? readAgentModel(),
        effort: input?.effort ?? readAgentEffort(),
        attachments,
        messageMetadata: input?.canvasSource
          ? canvasGenerationMetadata(
              projectId,
              input.canvasSource.nodeId,
              input.canvasSource.kind,
            )
          : canvasReferences.length
            ? { canvasReferences }
            : undefined,
      });
      if (version !== epoch)
        return { ok: false, error: "连接已变更，请重连确认执行结果。" };
      if (toolController.signal.aborted)
        await activeApi.interrupt(conversation.threadId);
      if (response.state)
        handle({ kind: "conversation", conversation: response.state });
      return { ok: true, messageId };
    } catch (error) {
      if (version === epoch) {
        if (
          error instanceof AgentApiError &&
          (error.response as AgentTurnResponse).state
        )
          patch({ conversation: (error.response as AgentTurnResponse).state });
        patch({
          sending: false,
          error: errorText(error),
          activity: "发送未确认，请查看会话后重试",
        });
      }
      return { ok: false, error: errorText(error) };
    }
  }
  async function interrupt(): Promise<{ ok: boolean; error?: string }> {
    const version = epoch;
    toolController.abort();
    if (!api) return { ok: false, error: "Agent 未连接" };
    try {
      await api.interrupt(state.conversation?.threadId);
      if (version !== epoch)
        return { ok: false, error: "连接已变更，请检查当前任务状态。" };
      if (state.sending) patch({ activity: "已请求停止，等待执行结果…" });
      return { ok: true };
    } catch (error) {
      if (version === epoch) patch({ error: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  async function generateFromCanvas(input: {
    nodeId: string;
    prompt: string;
    model: string;
    count: number;
    kind: "image" | "text";
  }): Promise<string | undefined> {
    if (state.sending) return "Codex 正在执行另一项任务，请等待完成。";
    if (!Number.isInteger(input.count) || input.count < 1 || input.count > 4)
      return "Codex 卡片入口每次支持 1 至 4 份，请调整数量。";
    if (state.status !== "connected")
      return "请先在对话面板连接 Codex；不会改用 API。";
    patch({ canvasNodeId: input.nodeId });
    const instruction =
      input.kind === "image"
        ? `使用 Codex 账号内置 imagegen/image_generation 生成 ${input.count} 张图片，完成图片将由 KK 自动归档并连到来源节点。不要调用 KK 的 run_generation 或外部生成 API。`
        : `直接写出文案，然后通过 canvas_apply_ops 新建文本节点并将最终文案写入 metadata.text，与来源节点 ${input.nodeId} 连线。不调用 run_generation 或外部 API。`;
    const result = await sendMessage(
      `${instruction}\n来源节点：${input.nodeId}\n用户提示词：${input.prompt}`,
      {
        model: input.model,
        canvasSource: { nodeId: input.nodeId, kind: input.kind },
      },
    );
    if (!result.ok) {
      patch({ canvasNodeId: undefined });
      return result.error;
    }
    return undefined;
  }
  async function resolveApproval(
    decision: AgentApprovalDecision,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!api || !state.pendingApproval)
      return { ok: false, error: "没有待处理的权限请求" };
    const version = epoch;
    const requestId = state.pendingApproval.requestId;
    try {
      await api.resolveApproval(requestId, decision);
      if (version !== epoch)
        return { ok: false, error: "连接已变更，请检查当前权限请求。" };
      approvals.delete(requestId);
      patch({ pendingApproval: approvals.values().next().value ?? null });
      return { ok: true };
    } catch (error) {
      if (version === epoch) patch({ error: errorText(error) });
      return { ok: false, error: errorText(error) };
    }
  }
  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect,
    refreshUsage,
    disconnect,
    sendMessage,
    generateFromCanvas,
    interrupt,
    resolveApproval,
    setBridge(next: AgentBridge | null) {
      bridge = next;
      if (state.status === "connected" && currentProject() !== projectId)
        disconnect();
    },
    syncProject() {
      if (state.status !== "disconnected" && currentProject() !== projectId)
        disconnect();
    },
    setPermissionMode(mode: AgentPermissionMode) {
      writePermissionMode(mode);
      patch({});
    },
    pushState() {
      if (
        api &&
        state.status === "connected" &&
        currentProject() === projectId
      ) {
        const version = epoch;
        void api.postState(bridge?.getSnapshot() ?? null).catch((error) => {
          if (version === epoch) fail(error);
        });
      }
    },
    setCredentials(endpoint: string, token: string) {
      disconnect();
      patch({ endpoint: endpoint.trim(), token: token.trim() });
      storage.setItem("canvas-agent-url", endpoint.trim());
      storage.removeItem("canvas-agent-token");
    },
    clientId,
  };
}
export type AgentConnection = ReturnType<typeof createAgentConnection>;
export const agentConnection = createAgentConnection();
