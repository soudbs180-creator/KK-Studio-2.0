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
  loginStatus?: "verified" | "required" | "unknown";
}
/** Legacy false and contradictory bridge reports cannot prove that login is missing. */
export function resolveGeminiCliLoginStatus(
  status: Pick<GeminiCliStatus, "login" | "loginStatus">,
): "verified" | "required" | "unknown" {
  if (status.loginStatus === "required" && !status.login) return "required";
  if (status.loginStatus !== undefined && status.loginStatus !== "verified")
    return "unknown";
  return status.login ? "verified" : "unknown";
}
export function geminiCliStatusMessage(status: GeminiCliStatus): string {
  if (!status.installed)
    return "未安装 Gemini CLI，请先在终端运行 npm install -g @google/gemini-cli。";
  const state = resolveGeminiCliLoginStatus(status);
  if (state === "required")
    return "Gemini CLI 需要登录，请在终端运行 gemini 并选择 Login with Google。";
  if (state === "verified")
    return (
      "Gemini CLI 已验证（" +
      (status.version ?? "版本未报告") +
      "），可连接对话。"
    );
  return "Gemini CLI 已安装，但本次验证未确认。请核对 CLI 登录、网络、额度和模型后重试。";
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

export function normalizeGeminiBridgeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    if (
      url.protocol === "http:" &&
      (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
      url.port &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    )
      return url.origin;
  } catch {
    /* Invalid bridge URL is rejected below. */
  }
  throw new GeminiCliError(
    "failed",
    "Gemini CLI 桥地址必须是本机 HTTP 地址和明确端口。",
  );
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
  signal?: AbortSignal;
}): Promise<GeminiCliStatus> {
  const baseUrl = normalizeGeminiBridgeUrl(
    options?.baseUrl ?? GEMINI_BRIDGE_DEFAULT_URL,
  );
  const fetcher = options?.fetcher ?? fetch;
  try {
    const response = await fetcher(baseUrl + "/status", {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      signal: options?.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new GeminiCliError("failed", `桥返回 HTTP ${response.status}。`);
    const data = (await readJson(response)) as GeminiCliStatus & BridgeError;
    if (data.error)
      throw new GeminiCliError(
        errorCodeOf(data.error.code),
        data.error.message ?? "桥状态检查失败。",
      );
    if (
      data.loginStatus !== undefined &&
      !["verified", "required", "unknown"].includes(data.loginStatus)
    )
      throw new GeminiCliError(
        "failed",
        "桥登录状态格式无效，不能确认可用性。",
      );
    const loginStatus = resolveGeminiCliLoginStatus({
      login: data.login === true,
      loginStatus: data.loginStatus,
    });
    return {
      installed: data.installed === true,
      login: loginStatus === "verified",
      ...(data.loginStatus ? { loginStatus } : {}),
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
  const baseUrl = normalizeGeminiBridgeUrl(
    options?.baseUrl ?? GEMINI_BRIDGE_DEFAULT_URL,
  );
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
