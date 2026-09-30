import type {
  AgentApprovalDecision,
  AgentConfigResponse,
  AgentConversationState,
  AgentModel,
  AgentPermissionMode,
  AgentThreadResponse,
  CanvasAgentSnapshot,
  AgentTurnInput,
  AgentTurnResponse,
} from "./agentTypes.ts";

export class AgentApiError<T = unknown> extends Error {
  readonly status: number;
  readonly response: T & { code?: string; error?: string; msg?: string };
  constructor(
    status: number,
    response: T & { code?: string; error?: string; msg?: string },
  ) {
    super(response.error || response.msg || `Agent 请求失败（HTTP ${status}）`);
    this.name = "AgentApiError";
    this.status = status;
    this.response = response;
  }
}

export type AgentApiClientOptions = {
  endpoint: string;
  token: string;
  clientId: string;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

export function agentEndpoint(value: string): string {
  if (value === "/kk-agent") return value;
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Agent 地址必须是本机 HTTP 地址，且不含凭据或路径。");
  return url.origin;
}

export function createAgentApi(options: AgentApiClientOptions) {
  const fetchImpl = options.fetcher ?? fetch;
  const endpoint = agentEndpoint(options.endpoint.trim());
  async function request<T>(
    path: string,
    body?: unknown,
    authenticated = true,
  ): Promise<T> {
    const response = await fetchImpl(endpoint + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(authenticated
          ? { "x-canvas-agent-token": options.token.trim() }
          : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)])
        : AbortSignal.timeout(60000),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => ({}))) as T & {
      ok?: boolean;
      code?: string;
      error?: string;
      msg?: string;
    };
    if (!response.ok || data.ok === false)
      throw new AgentApiError(response.status, data);
    return data;
  }
  const clientQuery = `?clientId=${encodeURIComponent(options.clientId)}`;
  return {
    health: () =>
      request<{ ok?: boolean; protocolVersion?: number }>(
        "/health",
        undefined,
        false,
      ),
    discover: () => request<AgentConfigResponse>("/config", undefined, false),
    codebuddyConfig: () =>
      request<{ ok: true; configured: boolean; cliPath: string }>(
        "/agent/codebuddy/config",
      ),
    saveCodebuddyConfig: (cliPath: string) =>
      request<{ ok: true; configured: boolean; cliPath: string }>(
        "/agent/codebuddy/config",
        { cliPath },
      ),
    probeCodebuddy: () =>
      request<{ ok: true; model?: string; durationMs: number }>(
        "/agent/codebuddy/probe",
        {},
      ),
    async postState(snapshot: CanvasAgentSnapshot | null): Promise<boolean> {
      await request(
        "/canvas/state" + clientQuery,
        snapshot
          ? {
              ...snapshot,
              // Upstream protocol uses d3's k; KK's internal transform uses scale.
              viewport: {
                x: snapshot.viewport.x,
                y: snapshot.viewport.y,
                k: snapshot.viewport.scale,
              },
              hasCanvas: true,
            }
          : { hasCanvas: false },
      );
      return true;
    },
    async activate(): Promise<void> {
      await request("/canvas/activate" + clientQuery, {});
    },
    async postToolResult(body: {
      requestId: string;
      result?: unknown;
      error?: string;
    }): Promise<void> {
      await request("/canvas/result" + clientQuery, body);
    },
    postTurn: (input: AgentTurnInput) =>
      request<AgentTurnResponse>("/agent/codex/turn", input),
    async resolveApproval(
      requestId: string,
      decision: AgentApprovalDecision,
    ): Promise<void> {
      await request("/agent/codex/approval", { requestId, decision });
    },
    async interrupt(threadId?: string): Promise<void> {
      await request("/agent/codex/interrupt", { threadId });
    },
    async acknowledgeHistory(
      threadId: string,
      turnIds: string[],
    ): Promise<void> {
      await request("/agent/codex/history/ack", { threadId, turnIds });
    },
    newThread: (permissionMode: AgentPermissionMode) =>
      request<AgentThreadResponse>("/agent/codex/threads/new", {
        clientId: options.clientId,
        permissionMode,
      }),
    async prepareConversation(
      permissionMode: AgentPermissionMode,
      conversation: AgentConversationState,
    ) {
      try {
        return await request<AgentThreadResponse>(
          "/agent/codex/conversation/prepare",
          {
            clientId: options.clientId,
            permissionMode,
            expectedConversationId: conversation.conversationId,
            expectedRevision: conversation.revision,
          },
        );
      } catch (error) {
        if (error instanceof AgentApiError && error.status === 404)
          throw new Error(
            "当前 Agent 服务不支持安全准备会话，请更新并重新启动本地服务（npm run agent）。",
            { cause: error },
          );
        throw error;
      }
    },
    resumeThread: (threadId: string, permissionMode: AgentPermissionMode) =>
      request<AgentThreadResponse>(
        `/agent/codex/threads/${encodeURIComponent(threadId)}/resume`,
        { clientId: options.clientId, permissionMode },
      ),
    readThread: (threadId: string) =>
      request<AgentThreadResponse>(
        `/agent/codex/threads/${encodeURIComponent(threadId)}`,
      ),
    async generatedImage(threadId: string, itemId: string): Promise<Blob> {
      const response = await fetchImpl(
        endpoint +
          `/agent/codex/generated-image/${encodeURIComponent(threadId)}/${encodeURIComponent(itemId)}`,
        {
          headers: { "x-canvas-agent-token": options.token.trim() },
          signal: options.signal
            ? AbortSignal.any([options.signal, AbortSignal.timeout(60000)])
            : AbortSignal.timeout(60000),
          cache: "no-store",
        },
      );
      if (!response.ok)
        throw new Error(`无法读取 Codex 生图结果（HTTP ${response.status}）`);
      const blob = await response.blob();
      if (
        !/^image\/(png|jpeg|webp)$/.test(blob.type) ||
        blob.size > 25 * 1024 * 1024 ||
        !blob.size
      )
        throw new Error("Codex 图片格式或大小无效");
      return blob;
    },
    models: () => request<{ data: AgentModel[] }>("/agent/codex/models"),
    usage: () =>
      request<Parameters<typeof import("./agentUsage.ts").parseAgentUsage>[0]>(
        "/agent/codex/usage",
      ),
  };
}
export type AgentApi = ReturnType<typeof createAgentApi>;
