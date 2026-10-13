import { z } from "zod";
import { appVersion } from "../../runtime/appInfo.ts";
import {
  encodeMcpHeaderValue,
  mcpToolParameterHeaders,
  scanMcpHeaderSchema,
} from "./mcpHttpHeaders.ts";

const LEGACY_MCP_PROTOCOL_VERSION = "2025-11-25";
const MODERN_MCP_PROTOCOL_VERSION = "2026-07-28";
const MCP_CLIENT_NAME = "kk-studio";
const MCP_CLIENT_VERSION = appVersion;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOOLS = 500;
const MAX_PAGES = 32;
const MAX_SAVED_SERVERS = 50;
const DEFAULT_TIMEOUT_MS = 15_000;
const MCP_STORAGE_LOCK_NAME = "kk-studio:mcp-server-registry";

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

type McpProtocol = "legacy" | "modern";

export interface McpHttpClientOptions {
  protocolMode?: "auto" | McpProtocol;
  /** Testable upper bound for request cancellation; production defaults to 15s. */
  timeoutMs?: number;
}

interface PostResult {
  rpc?: RpcResponse;
  transportError?: RpcResponse["error"];
  sessionId?: string;
  status: number;
}

function modernRequestPayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    params: {
      ...(payload.params as Record<string, unknown>),
      _meta: {
        "io.modelcontextprotocol/protocolVersion": MODERN_MCP_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": {
          name: MCP_CLIENT_NAME,
          version: MCP_CLIENT_VERSION,
        },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  };
}

function mcpRequestHeaders(
  payload: Record<string, unknown>,
  protocol: McpProtocol,
  sessionId?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (protocol === "modern") {
    headers["MCP-Protocol-Version"] = MODERN_MCP_PROTOCOL_VERSION;
    headers["Mcp-Method"] = String(payload.method);
    const params = payload.params as Record<string, unknown> | undefined;
    if (payload.method === "tools/call" && typeof params?.name === "string")
      headers["Mcp-Name"] = encodeMcpHeaderValue(params.name);
  } else {
    if (payload.method !== "initialize")
      headers["MCP-Protocol-Version"] = LEGACY_MCP_PROTOCOL_VERSION;
    if (sessionId) headers["MCP-Session-Id"] = sessionId;
  }
  return headers;
}

function parseDiscoveryTransportError(
  text: string,
  status: number,
  contentType: string,
): RpcResponse["error"] {
  if (status !== 400 || contentType.split(";")[0].trim() !== "application/json")
    return undefined;
  try {
    const parsed = jsonRpcResponseSchema.safeParse(JSON.parse(text));
    // SDK transport errors can have no request ID. They are evidence about
    // the opening handshake only, never a usable response to a pending RPC.
    if (
      parsed.success &&
      parsed.data.id === null &&
      parsed.data.result === undefined
    )
      return parsed.data.error;
  } catch {
    // Unrecognized transport bodies cannot prove legacy support.
    return undefined;
  }
  return undefined;
}

function requiresLegacyHandshake(response: PostResult): boolean {
  if ([401, 403, 429].includes(response.status) || response.status >= 500)
    throw new Error(`MCP 请求失败（HTTP ${response.status}）。`);
  const error = response.rpc?.error ?? response.transportError;
  if (response.status === 400 && error?.code === -32022) {
    if (isUsableLegacyVersionOffer(error.data)) return true;
    throw new Error("MCP 协议版本不受支持（HTTP 400）。");
  }
  return (
    [404, 405, 415].includes(response.status) ||
    (response.status === 400 && isLegacyDiscoveryTransportError(error))
  );
}

function isUsableLegacyVersionOffer(data: unknown): boolean {
  const parsed = z
    .object({
      requested: z.literal(MODERN_MCP_PROTOCOL_VERSION),
      supported: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    })
    .safeParse(data);
  return (
    parsed.success &&
    parsed.data.supported.includes(LEGACY_MCP_PROTOCOL_VERSION) &&
    // Select only the implemented legacy revision; unknown modern offers fail.
    parsed.data.supported.every(
      (version) => version <= LEGACY_MCP_PROTOCOL_VERSION,
    )
  );
}

function discoveredProtocolVersions(result: object): unknown[] {
  const record = result as Record<string, unknown>;
  return [
    record.supportedVersions,
    record.protocolVersions,
    record.supportedProtocolVersions,
    [record.protocolVersion],
  ].flatMap((value) => (Array.isArray(value) ? value : []));
}

function isLegacyDiscoveryTransportError(
  error?: RpcResponse["error"],
): boolean {
  if (error?.code !== -32000) return false;
  const message = error.message.trim();
  if (
    /^Bad Request: (?:No valid session ID provided|Server not initialized|Mcp-Session-Id header is required)$/i.test(
      message,
    )
  )
    return true;
  const unsupported = message.match(
    /^Bad Request: Unsupported protocol version: 2026-07-28 \(supported versions: (\d{4}-\d{2}-\d{2}(?:, \d{4}-\d{2}-\d{2})*)\)$/i,
  );
  return (
    unsupported?.[1].split(", ").includes(LEGACY_MCP_PROTOCOL_VERSION) ?? false
  );
}

/** Streamable HTTP client with safe 2026 modern discovery and legacy fallback. */
export class McpHttpClient {
  readonly server: McpServerConfig;
  private readonly protocolMode: McpHttpClientOptions["protocolMode"];
  private readonly timeoutMs: number;
  private sessionId: string | undefined;
  private activeProtocol: McpProtocol | undefined;
  private connected = false;
  private tools: McpTool[] = [];

  constructor(server: McpServerConfig, options: McpHttpClientOptions = {}) {
    this.server = mcpServerSchema.parse(server);
    this.protocolMode = options.protocolMode ?? "auto";
    this.timeoutMs =
      typeof options.timeoutMs === "number" &&
      Number.isFinite(options.timeoutMs) &&
      options.timeoutMs > 0
        ? Math.min(Math.floor(options.timeoutMs), DEFAULT_TIMEOUT_MS)
        : DEFAULT_TIMEOUT_MS;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get discoveredTools(): McpTool[] {
    return [...this.tools];
  }

  private async post(
    payload: Record<string, unknown>,
    protocol: McpProtocol,
    signal?: AbortSignal,
    allowErrorStatus = false,
    parameterHeaders: Record<string, string> = {},
  ): Promise<PostResult> {
    const timeout = timeoutSignal(this.timeoutMs, signal);
    try {
      const headers = {
        ...mcpRequestHeaders(payload, protocol, this.sessionId),
        ...parameterHeaders,
      };
      const response = await fetch(this.server.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(
          protocol === "modern" ? modernRequestPayload(payload) : payload,
        ),
        credentials: "omit",
        redirect: "error",
        signal: timeout.signal,
      });
      const sessionId = response.headers.get("MCP-Session-Id") ?? undefined;
      // Keep initialization headers even if body parsing fails, so connect's
      // cleanup can terminate a session created by a malformed response.
      if (
        protocol === "legacy" &&
        payload.method === "initialize" &&
        response.ok
      )
        this.sessionId = sessionId;
      if (response.status === 202)
        return { sessionId, status: response.status };
      const body = await readResponseBody(response);
      const contentType = response.headers.get("content-type") ?? "";
      const id = typeof payload.id === "number" ? payload.id : undefined;
      let rpc: RpcResponse | undefined;
      if (id !== undefined && body) {
        try {
          rpc = extractRpcResponse(body, contentType, id);
        } catch {
          if (!allowErrorStatus)
            throw new Error("MCP 响应不是有效的 JSON-RPC 结果。");
        }
      }
      if (!response.ok && !allowErrorStatus)
        throw new Error(`MCP 请求失败（HTTP ${response.status}）。`);
      return {
        rpc,
        sessionId,
        status: response.status,
        transportError: parseDiscoveryTransportError(
          body,
          response.status,
          contentType,
        ),
      };
    } finally {
      timeout.dispose();
    }
  }

  private async discoverModern(signal?: AbortSignal): Promise<boolean> {
    const response = await this.post(
      {
        jsonrpc: "2.0",
        id: jsonRpcId(),
        method: "server/discover",
        params: {},
      },
      "modern",
      signal,
      true,
    );
    if (requiresLegacyHandshake(response)) return false;
    if (!response.rpc) {
      if (response.status >= 400 && response.status < 500)
        throw new Error(`MCP 请求失败（HTTP ${response.status}）。`);
      throw new Error("MCP 现代协议发现响应无效。");
    }
    if (response.rpc.error) {
      const discoveryError = response.rpc.error.message.trim();
      if (
        response.rpc.error.code === -32601 ||
        /^(?:method\s+not\s+found|unknown\s+method)$/i.test(discoveryError)
      )
        return false;
      throw new Error(`MCP 现代协议发现失败：${response.rpc.error.message}`);
    }
    if (response.status >= 400)
      throw new Error(`MCP 请求失败（HTTP ${response.status}）。`);
    const result = response.rpc.result;
    if (!result || typeof result !== "object")
      throw new Error("MCP 现代协议发现响应无效。");
    const versions = discoveredProtocolVersions(result);
    if (!versions.includes(MODERN_MCP_PROTOCOL_VERSION))
      throw new Error("MCP 现代协议发现响应未声明 2026-07-28 支持。");
    return true;
  }

  private async listTools(
    protocol: McpProtocol,
    signal?: AbortSignal,
  ): Promise<McpTool[]> {
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
        protocol,
        signal,
      );
      if (listed.rpc?.error)
        throw new Error(`MCP tools/list 失败：${listed.rpc.error.message}`);
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
    if (protocol === "modern")
      this.tools = this.tools.filter(
        (tool) => scanMcpHeaderSchema(tool.inputSchema).valid,
      );
    return this.discoveredTools;
  }

  private async connectLegacy(signal?: AbortSignal): Promise<McpTool[]> {
    const initializeId = jsonRpcId();
    const initialize = await this.post(
      {
        jsonrpc: "2.0",
        id: initializeId,
        method: "initialize",
        params: {
          protocolVersion: LEGACY_MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: MCP_CLIENT_NAME, version: MCP_CLIENT_VERSION },
        },
      },
      "legacy",
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
      LEGACY_MCP_PROTOCOL_VERSION
    )
      throw new Error("MCP 服务器返回了不受支持的协议版本。");

    const initialized = await this.post(
      { jsonrpc: "2.0", method: "notifications/initialized", params: {} },
      "legacy",
      signal,
    );
    if (initialized.status !== 202)
      throw new Error("MCP initialized 通知未被接受。");
    return this.listTools("legacy", signal);
  }

  private async connectModern(signal?: AbortSignal): Promise<McpTool[]> {
    return this.listTools("modern", signal);
  }

  async connect(signal?: AbortSignal): Promise<McpTool[]> {
    await this.disconnect();
    this.connected = false;
    this.tools = [];
    this.activeProtocol = undefined;
    try {
      signal?.throwIfAborted();
      let protocol: McpProtocol = "legacy";
      if (this.protocolMode !== "legacy") {
        const modern = await this.discoverModern(signal);
        if (!modern && this.protocolMode === "modern")
          throw new Error("MCP 服务器不支持 2026-07-28 modern 协议。");
        protocol = modern ? "modern" : "legacy";
      }
      this.activeProtocol = protocol;
      const tools =
        protocol === "modern"
          ? await this.connectModern(signal)
          : await this.connectLegacy(signal);
      signal?.throwIfAborted();
      this.connected = true;
      return tools;
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    const sessionId = this.sessionId;
    const protocol = this.activeProtocol;
    this.connected = false;
    this.sessionId = undefined;
    this.activeProtocol = undefined;
    this.tools = [];
    if (sessionId && protocol === "legacy") {
      const timeout = timeoutSignal(this.timeoutMs, signal);
      try {
        await fetch(this.server.endpoint, {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            "MCP-Session-Id": sessionId,
            "MCP-Protocol-Version": LEGACY_MCP_PROTOCOL_VERSION,
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
    const tool = this.tools.find((tool) => tool.name === name);
    if (!tool) throw new Error("MCP 工具不存在或未被发现。");
    const parameterHeaders =
      this.activeProtocol === "modern"
        ? mcpToolParameterHeaders(tool.inputSchema, arguments_)
        : {};
    const response = await this.post(
      {
        jsonrpc: "2.0",
        id: jsonRpcId(),
        method: "tools/call",
        params: { name, arguments: arguments_ },
      },
      this.activeProtocol ?? "legacy",
      signal,
      false,
      parameterHeaders,
    );
    if (response.rpc?.error)
      throw new Error(`MCP 工具调用失败：${response.rpc.error.message}`);
    return response.rpc?.result ?? null;
  }
}

export interface McpServerStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  /** Serialize mutations across tabs with a real cross-agent lock. */
  withExclusiveLock<T>(callback: () => T | Promise<T>): Promise<T>;
  /** Present when this storage can be read but cannot safely mutate across tabs. */
  readOnlyReason?: string;
}

interface NavigatorWithLocks {
  locks?: {
    request<T>(
      name: string,
      options: { mode: "exclusive" },
      callback: () => T | Promise<T>,
    ): Promise<T>;
  };
}

function defaultStorage(): McpServerStorage | null {
  if (typeof window === "undefined") return null;
  try {
    const localStorage = window.localStorage;
    const locks = (globalThis.navigator as NavigatorWithLocks | undefined)
      ?.locks;
    const readOnlyReason =
      "当前浏览器不支持跨标签安全写入，MCP 配置暂为只读；可导出原始配置。";
    const storage: McpServerStorage = {
      getItem: (key) => localStorage.getItem(key),
      setItem: (key, value) => localStorage.setItem(key, value),
      withExclusiveLock: (callback) =>
        locks?.request
          ? locks.request(
              MCP_STORAGE_LOCK_NAME,
              { mode: "exclusive" },
              callback,
            )
          : Promise.reject(new Error(readOnlyReason)),
      readOnlyReason: locks?.request ? undefined : readOnlyReason,
    };
    return storage;
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

  get hasCorruption(): boolean {
    return this.corruptedOnRead;
  }

  get isReadOnly(): boolean {
    return Boolean(this.storage?.readOnlyReason);
  }

  get persistenceWarning(): string {
    const readOnlySuffix = this.storage?.readOnlyReason
      ? ` ${this.storage.readOnlyReason}`
      : "";
    if (this.corruptedOnRead)
      return `MCP 本地记录无法读取，已停止覆盖原数据；请先导出原始配置后再清理。${readOnlySuffix}`;
    if (this.overflowOnRead)
      return `MCP 本地记录有 ${this.servers.length} 项，超过当前 ${MAX_SAVED_SERVERS} 项上限；已停止覆盖原数据，请先导出或显式恢复。${readOnlySuffix}`;
    if (this.storage?.readOnlyReason) return this.storage.readOnlyReason;
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
    if (this.storage?.readOnlyReason)
      throw new Error(this.storage.readOnlyReason);
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
      if (this.storage.getItem(MCP_SERVERS_STORAGE_KEY) !== raw)
        throw new Error(
          "MCP 并发冲突：配置在写入后被其他标签页变更，请刷新后重试。",
        );
      this.servers = [...next];
      this.baselineServers = [...next];
      this.baselineRaw = raw;
    } catch (error) {
      this.servers = [...latest];
      this.baselineServers = [...latest];
      if (error instanceof Error && error.message.includes("并发冲突"))
        throw error;
      throw new Error("无法保存 MCP 服务器设置。", { cause: error });
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

  async add(value: unknown): Promise<McpServerConfig> {
    const server = mcpServerSchema.parse(value);
    if (!this.storage) throw new Error("无法保存 MCP 服务器设置。");
    return this.storage.withExclusiveLock(() => {
      const latest = this.latestWritableSnapshot();
      const baseline = new Map(
        this.baselineServers.map((item) => [item.id, item]),
      );
      const current = latest.servers.find((item) => item.id === server.id);
      const original = baseline.get(server.id);
      if (
        (original && (!current || !sameServer(original, current))) ||
        (!original && current)
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
    });
  }

  async remove(id: string): Promise<boolean> {
    if (!this.storage) throw new Error("无法保存 MCP 服务器设置。");
    return this.storage.withExclusiveLock(() => {
      const latest = this.latestWritableSnapshot();
      const current = latest.servers.find((item) => item.id === id);
      const original = this.baselineServers.find((item) => item.id === id);
      if (
        (original && (!current || !sameServer(original, current))) ||
        (!original && current)
      )
        throw new Error("MCP 并发冲突：配置已在其他标签页变更，请刷新后重试。");
      if (!current) {
        this.servers = [...latest.servers];
        this.baselineServers = [...latest.servers];
        this.baselineRaw = latest.raw;
        return false;
      }
      const next = latest.servers.filter((item) => item.id !== id);
      this.write(next, latest.raw, latest.servers);
      return true;
    });
  }

  /** Explicitly trim a valid legacy over-limit record after the caller has exported it. */
  async recover(keepIds: readonly string[]): Promise<McpServerConfig[]> {
    if (!this.storage) throw new Error("无法保存 MCP 服务器设置。");
    return this.storage.withExclusiveLock(() => {
      if (this.corruptedOnRead) throw new Error(this.persistenceWarning);
      if (!this.overflowOnRead)
        throw new Error("当前没有需要恢复的超限 MCP 配置。");
      const ids = [...keepIds];
      if (new Set(ids).size !== ids.length)
        throw new Error("恢复列表不能包含重复的 MCP 服务器。");
      if (ids.length > MAX_SAVED_SERVERS)
        throw new Error(
          `恢复后的 MCP 服务器最多保存 ${MAX_SAVED_SERVERS} 个。`,
        );
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
    });
  }
}
