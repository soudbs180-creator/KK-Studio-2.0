/** Gemini CLI 本地桥客户端。凭据为 gemini 的本地 OAuth 登录态,KK 不接触 token。 */
export const GEMINI_BRIDGE_DEFAULT_URL = "http://127.0.0.1:1424";
export const GEMINI_CLI_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];
export interface GeminiCliStatus {
  installed: boolean;
  version?: string;
  login: boolean;
}
export interface GeminiCliChatInput {
  prompt: string;
  resumeSessionId?: string;
  model?: string;
}
export interface GeminiCliChatResult {
  text: string;
  sessionId?: string;
}
export type GeminiCliErrorCode =
  | "unreachable"
  | "not-installed"
  | "not-logged-in"
  | "quota"
  | "timeout"
  | "failed";
export class GeminiCliError extends Error {
  code: GeminiCliErrorCode;
  constructor(code: GeminiCliErrorCode, message: string) {
    super(message);
    this.name = "GeminiCliError";
    this.code = code;
  }
}
type BridgeError = { error?: { code?: string; message?: string } };

function baseUrlOf(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
function errorCodeOf(code: string | undefined): GeminiCliErrorCode {
  switch (code) {
    case "not-logged-in":
      return "not-logged-in";
    case "not-installed":
      return "not-installed";
    case "quota":
      return "quota";
    case "timeout":
      return "timeout";
    default:
      return "failed";
  }
}
async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new Error("桥响应为空。");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024) throw new Error("桥响应超过大小限制。");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } finally {
    reader.releaseLock();
  }
}
export async function geminiCliStatus(options?: {
  baseUrl?: string;
  fetcher?: typeof fetch;
}): Promise<GeminiCliStatus> {
  const baseUrl = baseUrlOf(options?.baseUrl ?? GEMINI_BRIDGE_DEFAULT_URL);
  const fetcher = options?.fetcher ?? fetch;
  try {
    const response = await fetcher(baseUrl + "/status", {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new GeminiCliError("failed", `桥返回 HTTP ${response.status}。`);
    const data = (await readJson(response)) as GeminiCliStatus & BridgeError;
    if (data.error)
      throw new GeminiCliError(
        errorCodeOf(data.error.code),
        data.error.message ?? "桥状态检查失败。",
      );
    return {
      installed: data.installed === true,
      login: data.login === true,
      ...(typeof data.version === "string" ? { version: data.version } : {}),
    };
  } catch (error) {
    if (error instanceof GeminiCliError) throw error;
    throw new GeminiCliError(
      "unreachable",
      `无法连接 Gemini CLI 桥（${baseUrl}），请先运行 node scripts/gemini-bridge.mjs。`,
    );
  }
}

export async function geminiCliChat(
  input: GeminiCliChatInput,
  signal: AbortSignal,
  options?: { baseUrl?: string; fetcher?: typeof fetch },
): Promise<GeminiCliChatResult> {
  const baseUrl = baseUrlOf(options?.baseUrl ?? GEMINI_BRIDGE_DEFAULT_URL);
  const fetcher = options?.fetcher ?? fetch;
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 30000)
    throw new GeminiCliError("failed", "请输入 1–30000 字的任务。");
  try {
    const response = await fetcher(baseUrl + "/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify({
        prompt,
        ...(input.resumeSessionId
          ? { resumeSessionId: input.resumeSessionId }
          : {}),
        ...(input.model ? { model: input.model.trim() } : {}),
      }),
      signal,
    });
    signal.throwIfAborted();
    if (!response.ok) {
      const data = (await readJson(response).catch(
        () => null,
      )) as BridgeError | null;
      throw new GeminiCliError(
        errorCodeOf(data?.error?.code),
        data?.error?.message ?? `桥返回 HTTP ${response.status}。`,
      );
    }
    const data = (await readJson(response)) as GeminiCliChatResult &
      BridgeError;
    if (data.error)
      throw new GeminiCliError(
        errorCodeOf(data.error.code),
        data.error.message ?? "gemini 执行失败。",
      );
    if (typeof data.text !== "string" || !data.text.trim())
      throw new GeminiCliError("failed", "gemini 未返回文字内容。");
    return {
      text: data.text,
      ...(typeof data.sessionId === "string"
        ? { sessionId: data.sessionId }
        : {}),
    };
  } catch (error) {
    if (error instanceof GeminiCliError) throw error;
    if (signal.aborted) throw new GeminiCliError("timeout", "请求已停止。");
    throw new GeminiCliError(
      "unreachable",
      `无法连接 Gemini CLI 桥（${baseUrl}），请确认桥已启动。`,
    );
  }
}
