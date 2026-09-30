/** Google Interactions REST. Credentials are request-only and the destination is fixed. */
export const GOOGLE_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";
export const GOOGLE_TEXT_MODEL = "gemini-3.8-flash";
export const GOOGLE_IMAGE_MODEL = "gemini-3.1-flash-image";
export interface GoogleCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}
export interface GoogleResult {
  id: string;
  status: "completed" | "requires_action";
  text: string;
  images: Blob[];
  calls: GoogleCall[];
}
export interface GoogleRequest {
  model: string;
  mode: "text" | "image";
  input: string | unknown[];
  previousInteractionId?: string;
  aspectRatio?: string;
  imageSize?: string;
  search?: boolean;
  tools?: Record<string, unknown>[];
  systemInstruction?: string;
}
export class GoogleApiError extends Error {
  status: number;
  rejected: boolean;
  constructor(message: string, status = 0, rejected = false) {
    super(message);
    this.name = "GoogleApiError";
    this.status = status;
    this.rejected = rejected;
  }
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

async function readJson(response: Response): Promise<unknown> {
  if (!response.body) throw new GoogleApiError("Google 响应为空，结果未确认。");
  const reader = response.body.getReader(),
    decoder = new TextDecoder();
  let text = "",
    bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 64 * 1024 * 1024)
        throw new GoogleApiError("Google 响应超过大小限制，结果未确认。");
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode()) as unknown;
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    if (error instanceof GoogleApiError) throw error;
    throw new GoogleApiError("Google 响应不完整或格式无效，结果未确认。");
  } finally {
    reader.releaseLock();
  }
}

function parseResult(raw: unknown): GoogleResult {
  const value = object(raw);
  if (
    typeof value.id !== "string" ||
    !value.id ||
    value.id.length > 4096 ||
    !Array.isArray(value.steps)
  )
    throw new GoogleApiError(
      "Google 响应缺少有效的会话标识或内容，结果未确认。",
    );
  if (value.status !== "completed" && value.status !== "requires_action")
    throw new GoogleApiError(
      "Google 未完成本次请求，请检查模型可用性或新建会话。",
      0,
      value.status === "failed" || value.status === "cancelled",
    );
  const result: GoogleResult = {
    id: value.id,
    status: value.status,
    text: "",
    images: [],
    calls: [],
  };
  for (const rawStep of value.steps) {
    const step = object(rawStep);
    if (step.type === "function_call") {
      if (
        typeof step.id !== "string" ||
        typeof step.name !== "string" ||
        !step.id ||
        !step.name ||
        !step.arguments ||
        typeof step.arguments !== "object" ||
        Array.isArray(step.arguments)
      )
        throw new GoogleApiError("Google 工具调用参数无效，未执行。");
      result.calls.push({
        id: step.id,
        name: step.name,
        arguments: object(step.arguments),
      });
    }
    if (step.type !== "model_output" || !Array.isArray(step.content)) continue;
    for (const rawContent of step.content) {
      const content = object(rawContent);
      if (content.type === "text" && typeof content.text === "string")
        result.text += content.text;
      if (content.type !== "image") continue;
      if (
        typeof content.data !== "string" ||
        !content.data ||
        content.data.length > 28 * 1024 * 1024 ||
        typeof content.mime_type !== "string" ||
        !/^image\/(png|jpeg|webp)$/.test(content.mime_type) ||
        result.images.length >= 8
      )
        throw new GoogleApiError("Google 图片格式或大小无效，未归档。");
      try {
        const binary = atob(content.data);
        result.images.push(
          new Blob([Uint8Array.from(binary, (c) => c.charCodeAt(0))], {
            type: content.mime_type,
          }),
        );
      } catch {
        throw new GoogleApiError("Google 图片数据无效，未归档。");
      }
    }
  }
  if (result.text.length > 200000)
    throw new GoogleApiError("Google 回复过长，未保存不完整结果。");
  if (
    result.calls.length > 16 ||
    (result.status === "requires_action" && !result.calls.length) ||
    (result.status === "completed" && result.calls.length)
  )
    throw new GoogleApiError("Google 工具调用状态无效，未执行。");
  if (
    result.status === "completed" &&
    !result.text.trim() &&
    !result.images.length
  )
    throw new GoogleApiError(
      "Google 未返回文字或图片，本次没有生成结果。",
      0,
      true,
    );
  return result;
}

export function createGoogleInteractions(options: {
  apiKey: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = options.fetcher ?? fetch;
  async function request(path: string, signal: AbortSignal, body?: unknown) {
    signal.throwIfAborted();
    if (!options.apiKey.trim())
      throw new GoogleApiError(
        "请先在模型供应商设置中保存 Google API Key。",
        0,
        true,
      );
    const response = await fetcher(GOOGLE_API_BASE + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "x-goog-api-key": options.apiKey.trim(),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      const reason =
        response.status === 401 || response.status === 403
          ? "请检查 API Key 和项目权限"
          : response.status === 429
            ? "额度或速率受限，请稍后检查 Google 配额"
            : response.status === 404
              ? "模型或历史会话不可用，请检查型号或新建会话"
              : "请求失败，请检查 Google 服务";
      throw new GoogleApiError(
        `Google ${reason}（HTTP ${response.status}）。`,
        response.status,
        response.status >= 400 &&
          response.status < 500 &&
          response.status !== 408,
      );
    }
    const raw = await readJson(response);
    signal.throwIfAborted();
    return raw;
  }
  return {
    async create(
      input: GoogleRequest,
      signal: AbortSignal,
    ): Promise<GoogleResult> {
      const model = input.model.trim().replace(/^models\//, "");
      if (!/^gemini-[a-zA-Z0-9_.-]{1,110}$/.test(model))
        throw new GoogleApiError("请填写有效的完整 Gemini 模型 ID。", 0, true);
      const tools = [
        ...(input.tools ?? []),
        ...(input.search ? [{ type: "google_search" }] : []),
      ];
      return parseResult(
        await request("/interactions", signal, {
          model,
          input: input.input,
          store: true,
          ...(input.previousInteractionId
            ? { previous_interaction_id: input.previousInteractionId }
            : {}),
          ...(input.systemInstruction
            ? { system_instruction: input.systemInstruction }
            : {}),
          ...(tools.length ? { tools } : {}),
          response_format:
            input.mode === "image"
              ? [
                  { type: "text" },
                  {
                    type: "image",
                    aspect_ratio: input.aspectRatio ?? "1:1",
                    image_size: input.imageSize ?? "2K",
                  },
                ]
              : { type: "text" },
        }),
      );
    },
    async models(signal: AbortSignal): Promise<string[]> {
      const data = object(await request("/models?pageSize=1000", signal));
      if (!Array.isArray(data.models))
        throw new GoogleApiError("Google 模型列表响应无效。");
      return data.models.flatMap((item) => {
        const name = object(item).name;
        return typeof name === "string" && /^models\/gemini-[\w.-]+$/.test(name)
          ? [name.slice(7)]
          : [];
      });
    },
  };
}

export async function googleImageId(
  interactionId: string,
  index: number,
): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(interactionId),
  );
  return `google-${Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")}-${index}`;
}
