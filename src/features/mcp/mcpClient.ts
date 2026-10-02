import { z } from "zod";
import { appVersion } from "../../runtime/appInfo.ts";

const MCP_PROTOCOL_VERSION = "2025-11-25";
const MCP_CLIENT_NAME = "kk-studio";
const MCP_CLIENT_VERSION = appVersion;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOOLS = 500;
const MAX_PAGES = 32;
const MAX_SAVED_SERVERS = 50;
const DEFAULT_TIMEOUT_MS = 15_000;

export const MCP_SERVERS_STORAGE_KEY = "kk-studio-next:mcp-servers:v1";

const CREDENTIAL_PATTERNS = [
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
  /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
];
function containsCredentialLikeText(value: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(value));
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/** MCP endpoints never carry credentials, query tokens, or fragments. */
export function parseMcpEndpoint(value: string): URL {
  const url = new URL(value.trim());
  if (!/^(https?):$/i.test(url.protocol))
    throw new Error("MCP 地址仅支持 HTTP 或 HTTPS。");
  if (url.username || url.password || url.search || url.hash)
    throw new Error("MCP 地址不能包含账号、密钥参数或片段。");
  if (url.protocol === "http:" && !isLoopback(url.hostname))
    throw new Error("远程 MCP 必须使用 HTTPS；HTTP 仅允许本机地址。");
  return url;
}

export const mcpServerSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/),
    name: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine(
        (value) => !containsCredentialLikeText(value),
        "MCP 名称疑似包含密钥或凭据",
      ),
    transport: z.literal("streamable_http"),
    endpoint: z.string().trim().min(1).max(2048),
    enabled: z.boolean().default(true),
  })
  .strict()
  .superRefine((server, context) => {
    try {
      parseMcpEndpoint(server.endpoint);
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["endpoint"],
        message: error instanceof Error ? error.message : "MCP 地址无效。",
      });
    }
  });

export type McpServerConfig = z.infer<typeof mcpServerSchema>;

const mcpToolSchema = z
  .object({
    name: z.string().min(1).max(200),
    title: z.string().max(200).optional(),
    description: z.string().max(10_000).optional(),
    inputSchema: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export type McpTool = z.infer<typeof mcpToolSchema>;

const jsonRpcResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
});

interface RpcResponse {
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcId(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}

function parseSseMessages(text: string): unknown[] {
  const messages: unknown[] = [];
  let data: string[] = [];
  const flush = () => {
    if (!data.length) return;
    try {
      messages.push(JSON.parse(data.join("\n")) as unknown);
    } catch {
      /* Ignore comments/keep-alives and malformed SSE records. */
    }
    data = [];
  };
  for (const line of text.split(/\r?\n/)) {
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  flush();
  return messages;
}

function extractRpcResponse(
  text: string,
  contentType: string,
  id: number,
): RpcResponse {
  const parsed: unknown[] = contentType.includes("text/event-stream")
    ? parseSseMessages(text)
    : (() => {
        try {
          return [JSON.parse(text) as unknown];
        } catch {
          return [];
        }
      })();
  const response = parsed
    .map((entry) => jsonRpcResponseSchema.safeParse(entry))
    .find((entry) => entry.success && entry.data.id === id);
  if (!response || !response.success)
    throw new Error("MCP 响应不是有效的 JSON-RPC 结果。");
  return response.data;
}

function timeoutSignal(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  if (externalSignal?.aborted) controller.abort(externalSignal.reason);
  const timer = globalThis.setTimeout(
    () => controller.abort(new Error("MCP 请求超时。")),
    timeoutMs,
  );
  const onAbort = () => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    dispose: () => {
      globalThis.clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onAbort);
    },
  };
}

async function readResponseBody(response: Response): Promise<string> {
  if (!response.body) {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_RESPONSE_BYTES)
      throw new Error("MCP 响应超过 2 MB 限制。");
    return new TextDecoder().decode(bytes);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("MCP 响应超过 2 MB 限制。");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Streamable HTTP client for the 2025-11-25 initialize/session protocol. */
export class McpHttpClient {
  readonly server: McpServerConfig;
  private sessionId: string | undefined;
  private connected = false;
  private tools: McpTool[] = [];

  constructor(server: McpServerConfig) {
    this.server = mcpServerSchema.parse(server);
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get discoveredTools(): McpTool[] {
    return [...this.tools];
  }

  private async post(
    payload: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<{ rpc?: RpcResponse; sessionId?: string; status: number }> {
    const timeout = timeoutSignal(DEFAULT_TIMEOUT_MS, signal);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      };
      if (this.sessionId) headers["MCP-Session-Id"] = this.sessionId;
      if (payload.method !== "initialize")
        headers["MCP-Protocol-Version"] = MCP_PROTOCOL_VERSION;
      const response = await fetch(this.server.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "omit",
        redirect: "error",
        signal: timeout.signal,
      });
      const sessionId = response.headers.get("MCP-Session-Id") ?? undefined;
      // Keep initialization headers even if body parsing fails, so connect's
      // cleanup can terminate a session created by a malformed response.
      if (payload.method === "initialize" && response.ok)
        this.sessionId = sessionId;
      if (response.status === 202)
        return { sessionId, status: response.status };
      const body = await readResponseBody(response);
      if (!response.ok)
        throw new Error(`MCP 请求失败（HTTP ${response.status}）。`);
      const id = typeof payload.id === "number" ? payload.id : undefined;
      return {
        rpc:
          id === undefined
            ? undefined
            : extractRpcResponse(
                body,
                response.headers.get("content-type") ?? "",
                id,
              ),
        sessionId,
        status: response.status,
      };
    } finally {
      timeout.dispose();
    }
  }

  async connect(signal?: AbortSignal): Promise<McpTool[]> {
    await this.disconnect();
    this.connected = false;
    this.tools = [];
    try {
      signal?.throwIfAborted();
      const initializeId = jsonRpcId();
      const initialize = await this.post(
        {
          jsonrpc: "2.0",
          id: initializeId,
          method: "initialize",
          params: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {},
            clientInfo: { name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION },
          },
        },
        signal,
      );
      this.sessionId = initialize.sessionId;
      if (initialize.rpc?.error)
        throw new Error(`MCP 初始化失败：${initialize.rpc.error.message}`);
      const result = initialize.rpc?.result;
      if (!result || typeof result !== "object")
        throw new Error("MCP 初始化没有返回服务器信息。");
      if (
        (result as { protocolVersion?: unknown }).protocolVersion !==
        MCP_PROTOCOL_VERSION
      )
        throw new Error("MCP 服务器返回了不受支持的协议版本。");

      const initialized = await this.post(
        { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
        signal,
      );
      if (initialized.status !== 202)
        throw new Error("MCP initialized 通知未被接受。");

      let cursor: string | undefined;
      const cursors = new Set<string>();
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const listId = jsonRpcId();
        const listed = await this.post(
          {
            jsonrpc: "2.0",
            id: listId,
            method: "tools/list",
            params: cursor ? { cursor } : {},
          },
          signal,
        );
        const listResult = listed.rpc?.result;
        if (!listResult || typeof listResult !== "object")
          throw new Error("MCP tools/list 没有返回工具列表。");
        const rawTools = (listResult as { tools?: unknown }).tools;
        if (!Array.isArray(rawTools)) throw new Error("MCP 工具列表格式无效。");
        const pageTools = rawTools.map((tool) => {
          const parsed = mcpToolSchema.safeParse(tool);
          if (!parsed.success) throw new Error("MCP 工具列表格式无效。");
          return parsed.data;
        });
        this.tools.push(...pageTools);
        if (this.tools.length > MAX_TOOLS)
          throw new Error("MCP 工具数量超过 500 个限制。");
        const nextCursor = (listResult as { nextCursor?: unknown }).nextCursor;
        if (typeof nextCursor !== "string" || !nextCursor) {
          cursor = undefined;
          break;
        }
        if (cursors.has(nextCursor)) throw new Error("MCP 分页游标重复。");
        cursors.add(nextCursor);
        cursor = nextCursor;
      }
      if (cursor && cursors.size >= MAX_PAGES)
        throw new Error("MCP 工具分页超过 32 页限制。");
      signal?.throwIfAborted();
      this.connected = true;
      return this.discoveredTools;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    const sessionId = this.sessionId;
    this.connected = false;
    this.sessionId = undefined;
    this.tools = [];
    if (sessionId) {
      const timeout = timeoutSignal(DEFAULT_TIMEOUT_MS, signal);
      try {
        await fetch(this.server.endpoint, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "MCP-Session-Id": sessionId,
            "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
          },
          credentials: "omit",
          redirect: "error",
          signal: timeout.signal,
        });
      } catch {
        /* Disconnect is best effort; local state must still be cleared. */
      } finally {
        timeout.dispose();
      }
    }
  }

  /** Manual call is deliberately confirmation-bound and not wired to Agent. */
  async callTool(
    name: string,
    arguments_: Record<string, unknown>,
    confirmed = false,
    signal?: AbortSignal,
  ): Promise<unknown> {
    if (!confirmed) throw new Error("调用 MCP 工具前需要明确确认。");
    if (!this.connected) throw new Error("MCP 服务器尚未连接。");
    if (!this.tools.some((tool) => tool.name === name))
      throw new Error("MCP 工具不存在或未被发现。");
    const response = await this.post(
      {
        jsonrpc: "2.0",
        id: jsonRpcId(),
        method: "tools/call",
        params: { name, arguments: arguments_ },
      },
      signal,
    );
    if (response.rpc?.error)
      throw new Error(`MCP 工具调用失败：${response.rpc.error.message}`);
    return response.rpc?.result ?? null;
  }
}

export interface McpServerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): McpServerStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const persistedServersSchema = z.array(mcpServerSchema).max(MAX_SAVED_SERVERS);
const persistedServersUnboundedSchema = z.array(mcpServerSchema);

interface ServerSnapshot {
  raw: string | null;
  servers: McpServerConfig[];
  corrupted: boolean;
  overflow: boolean;
}

function sameServer(left: McpServerConfig, right: McpServerConfig): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** Metadata registry; session IDs, discovered tools and secrets are memory-only. */
export class McpServerRegistry {
  private readonly storage: McpServerStorage | null;
  private servers: McpServerConfig[];
  private corruptedOnRead: boolean;
  private overflowOnRead: boolean;
  private baselineServers: McpServerConfig[];
  private baselineRaw: string | null;

  constructor(storage: McpServerStorage | null = defaultStorage()) {
    this.storage = storage;
    const result = this.read();
    this.servers = result.servers;
    this.corruptedOnRead = result.corrupted;
    this.overflowOnRead = result.overflow;
    this.baselineServers = [...result.servers];
    this.baselineRaw = result.raw;
  }

  private read(): ServerSnapshot {
    if (!this.storage)
      return { raw: null, servers: [], corrupted: false, overflow: false };
    const raw = this.storage.getItem(MCP_SERVERS_STORAGE_KEY);
    if (!raw)
      return { raw: null, servers: [], corrupted: false, overflow: false };
    try {
      const unbounded = persistedServersUnboundedSchema.safeParse(
        JSON.parse(raw),
      );
      if (!unbounded.success)
        return { raw, servers: [], corrupted: true, overflow: false };
      const bounded = persistedServersSchema.safeParse(unbounded.data);
      return bounded.success
        ? { raw, servers: bounded.data, corrupted: false, overflow: false }
        : {
            raw,
            servers: unbounded.data,
            corrupted: false,
            overflow: true,
          };
    } catch {
      return { raw, servers: [], corrupted: true, overflow: false };
    }
  }

  get hasOverflow(): boolean {
    return this.overflowOnRead;
  }

  get persistenceWarning(): string {
    if (this.corruptedOnRead)
      return "MCP 本地记录无法读取，已停止覆盖原数据；请先导出原始配置后再清理。";
    if (this.overflowOnRead)
      return `MCP 本地记录有 ${this.servers.length} 项，超过当前 ${MAX_SAVED_SERVERS} 项上限；已停止覆盖原数据，请先导出或显式恢复。`;
    return "";
  }

  /** Return the exact persisted bytes so a damaged or over-limit record can be saved elsewhere. */
  exportRaw(): string {
    return (
      this.storage?.getItem(MCP_SERVERS_STORAGE_KEY) ??
      JSON.stringify(this.servers)
    );
  }

  private assertWritable(snapshot: ServerSnapshot): void {
    if (this.corruptedOnRead || snapshot.corrupted)
      throw new Error(
        snapshot.corrupted
          ? "MCP 本地记录无法读取，已停止覆盖原数据；请先导出原始配置后再清理。"
          : this.persistenceWarning,
      );
    if (this.overflowOnRead || snapshot.overflow)
      throw new Error(
        snapshot.overflow
          ? `MCP 本地记录超过当前 ${MAX_SAVED_SERVERS} 项上限，已停止覆盖原数据；请先导出或显式恢复。`
          : this.persistenceWarning,
      );
  }

  private write(
    next: McpServerConfig[],
    expectedRaw: string | null,
    latest: McpServerConfig[],
  ): void {
    if (!this.storage) throw new Error("无法保存 MCP 服务器设置。");
    if (this.storage.getItem(MCP_SERVERS_STORAGE_KEY) !== expectedRaw)
      throw new Error("MCP 并发冲突：配置已在其他标签页变更，请刷新后重试。");
    try {
      const raw = JSON.stringify(next);
      this.storage.setItem(MCP_SERVERS_STORAGE_KEY, raw);
      this.servers = [...next];
      this.baselineServers = [...next];
      this.baselineRaw = raw;
    } catch {
      this.servers = [...latest];
      this.baselineServers = [...latest];
      throw new Error("无法保存 MCP 服务器设置。");
    }
  }

  private latestWritableSnapshot(): ServerSnapshot {
    const latest = this.read();
    this.assertWritable(latest);
    return latest;
  }

  list(): McpServerConfig[] {
    return [...this.servers];
  }

  add(value: unknown): McpServerConfig {
    const server = mcpServerSchema.parse(value);
    const latest = this.latestWritableSnapshot();
    const baseline = new Map(
      this.baselineServers.map((item) => [item.id, item]),
    );
    const current = latest.servers.find((item) => item.id === server.id);
    const original = baseline.get(server.id);
    if (
      current &&
      ((!original && current) || (original && !sameServer(original, current)))
    )
      throw new Error("MCP 并发冲突：配置已在其他标签页变更，请刷新后重试。");
    const next = [
      ...latest.servers.filter((item) => item.id !== server.id),
      server,
    ];
    if (next.length > MAX_SAVED_SERVERS)
      throw new Error(`MCP 服务器最多保存 ${MAX_SAVED_SERVERS} 个。`);
    this.write(next, latest.raw, latest.servers);
    return server;
  }

  remove(id: string): boolean {
    const latest = this.latestWritableSnapshot();
    const current = latest.servers.find((item) => item.id === id);
    if (!current) {
      this.servers = [...latest.servers];
      this.baselineServers = [...latest.servers];
      this.baselineRaw = latest.raw;
      return false;
    }
    const original = this.baselineServers.find((item) => item.id === id);
    if (original && !sameServer(original, current))
      throw new Error("MCP 并发冲突：配置已在其他标签页变更，请刷新后重试。");
    const next = latest.servers.filter((item) => item.id !== id);
    this.write(next, latest.raw, latest.servers);
    return true;
  }

  /** Explicitly trim a valid legacy over-limit record after the caller has exported it. */
  recover(keepIds: readonly string[]): McpServerConfig[] {
    if (this.corruptedOnRead) throw new Error(this.persistenceWarning);
    if (!this.overflowOnRead)
      throw new Error("当前没有需要恢复的超限 MCP 配置。");
    const ids = [...keepIds];
    if (new Set(ids).size !== ids.length)
      throw new Error("恢复列表不能包含重复的 MCP 服务器。");
    if (ids.length > MAX_SAVED_SERVERS)
      throw new Error(`恢复后的 MCP 服务器最多保存 ${MAX_SAVED_SERVERS} 个。`);
    const latest = this.read();
    if (latest.corrupted || !latest.overflow)
      throw new Error(
        "MCP 并发冲突：超限配置已在其他标签页变更，请刷新后重试。",
      );
    if (latest.raw !== this.baselineRaw)
      throw new Error("MCP 并发冲突：配置已在其他标签页变更，请刷新后重试。");
    const byId = new Map(latest.servers.map((item) => [item.id, item]));
    const next = ids.map((id) => {
      const item = byId.get(id);
      if (!item) throw new Error("恢复列表包含不存在的 MCP 服务器。");
      return item;
    });
    this.write(next, latest.raw, latest.servers);
    this.overflowOnRead = false;
    this.corruptedOnRead = false;
    return this.list();
  }
}
