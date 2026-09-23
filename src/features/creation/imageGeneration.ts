import {
  getModelsEndpoint,
  modelProviderSchema,
  parseModelProvider,
} from "../../domain/modelProvider.ts";
import { MODEL_PROVIDER_STORAGE_KEY } from "../../domain/modelProvider.ts";
import { modelSupportsKind, type CreationAttachment } from "./model.ts";
import { getSessionApiKey, loadApiKey } from "./providerCredentials.ts";
import { loadStoredAsset } from "./assetRepository.ts";
import { resolveImageAttachments } from "./resolveAttachments.ts";
import { ProviderSubmissionError } from "./providerSubmission.ts";
import { readModelCatalogs } from "../models/modelCatalog.ts";

export { getSessionApiKey, setSessionApiKey } from "./providerCredentials.ts";

export type ProviderFailureClass =
  | "rate_limited"
  | "unauthorized"
  | "forbidden"
  | "provider_unavailable"
  | "invalid_request"
  | "network"
  | "cancelled";

/** A safe, structured provider error. Response bodies are intentionally not retained. */
export class GenerationProviderError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly failureClass: ProviderFailureClass;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      retryAfterSeconds?: number;
      failureClass: ProviderFailureClass;
      retryable: boolean;
    },
  ) {
    super(message);
    this.name = "GenerationProviderError";
    this.status = options.status ?? 0;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.failureClass = options.failureClass;
    this.retryable = options.retryable;
  }
}

export function readProvider(): {
  baseUrl: string;
  model: string;
  apiKey: string;
} {
  const parsed = parseModelProvider(
    window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY),
  );
  return {
    baseUrl: parsed.profile.baseUrl,
    model: parsed.profile.model,
    apiKey: getSessionApiKey(parsed.profile.baseUrl),
  };
}

function endpoint(baseUrl: string, path: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/${path}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded] = dataUrl.split(",", 2);
  const mime =
    header.match(/^data:([^;]+)/i)?.[1] ?? "application/octet-stream";
  const binary = atob(encoded ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++)
    bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mime });
}

function resultDataList(payload: unknown): string[] {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length === 0)
    throw new Error("服务返回了响应，但没有可预览的图片结果。");
  return data.map((item) => {
    if (!item || typeof item !== "object")
      throw new Error("服务返回了无效的图片结果。");
    const result = item as { url?: unknown; b64_json?: unknown };
    if (typeof result.url === "string" && result.url) {
      try {
        const url = new URL(result.url);
        if (
          !(url.protocol === "https:" || url.protocol === "http:") ||
          url.username ||
          url.password
        )
          throw new Error("服务返回的图片地址不安全。");
        return url.toString();
      } catch (error) {
        throw error instanceof Error
          ? error
          : new Error("服务返回的图片地址无效。");
      }
    }
    if (typeof result.b64_json === "string" && result.b64_json)
      return `data:image/png;base64,${result.b64_json}`;
    throw new Error("服务返回了无效的图片结果。");
  });
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value.trim());
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, (timestamp - Date.now()) / 1000);
}

function providerError(response: Response): GenerationProviderError {
  const status = response.status;
  if (status === 401 || status === 403)
    return new GenerationProviderError(
      `图片生成失败（HTTP ${status}），连接权限已失效，请重新验证 API Key 或项目权限。`,
      {
        status,
        failureClass: status === 401 ? "unauthorized" : "forbidden",
        retryable: false,
      },
    );
  if (status === 429) {
    const retryAfter = retryAfterSeconds(response.headers.get("Retry-After"));
    return new GenerationProviderError(
      retryAfter === undefined
        ? "图片生成请求过于频繁，连接已进入冷却，请稍后重试。"
        : `图片生成请求过于频繁，请在 ${Math.ceil(retryAfter)} 秒后重试。`,
      {
        status,
        retryAfterSeconds: retryAfter,
        failureClass: "rate_limited",
        retryable: true,
      },
    );
  }
  if (status >= 500 && status <= 599)
    return new GenerationProviderError(
      `图片生成服务暂时不可用（HTTP ${status}），稍后可重试。`,
      { status, failureClass: "provider_unavailable", retryable: true },
    );
  return new GenerationProviderError(
    `图片生成请求无效（HTTP ${status}），请检查模型、输入和服务权限。`,
    { status, failureClass: "invalid_request", retryable: false },
  );
}

function linkAbortSignal(signal: AbortSignal): {
  controller: AbortController;
  unlink: () => void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  return {
    controller,
    unlink: () => signal.removeEventListener("abort", abort),
  };
}

async function requestImageChunk(options: {
  baseUrl: string;
  model: string;
  prompt: string;
  attachments: CreationAttachment[];
  count: number;
  idempotencyKey?: string;
  apiKey: string;
  signal: AbortSignal;
  /** Resolved provider size label such as "1024x1024"; omitted means provider default. */
  size?: string;
}): Promise<string[]> {
  const linked = linkAbortSignal(options.signal);
  let timedOut = false;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    linked.controller.abort("timeout");
  }, 120_000);
  const headers = {
    Authorization: `Bearer ${options.apiKey.trim()}`,
    ...(options.idempotencyKey
      ? { "Idempotency-Key": options.idempotencyKey }
      : {}),
  };
  try {
    const response = options.attachments.length
      ? await fetch(endpoint(options.baseUrl, "images/edits"), {
          method: "POST",
          headers,
          body: (() => {
            const form = new FormData();
            form.set("model", options.model);
            form.set("prompt", options.prompt);
            form.set("n", String(options.count));
            if (options.size) form.set("size", options.size);
            options.attachments.forEach((attachment, index) => {
              if (attachment.dataUrl)
                form.append(
                  "image[]",
                  dataUrlToBlob(attachment.dataUrl),
                  attachment.name || `reference-${index + 1}.png`,
                );
            });
            return form;
          })(),
          credentials: "omit",
          redirect: "error",
          signal: linked.controller.signal,
        })
      : await fetch(endpoint(options.baseUrl, "images/generations"), {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: options.model,
            prompt: options.prompt,
            n: options.count,
            ...(options.size ? { size: options.size } : {}),
          }),
          credentials: "omit",
          redirect: "error",
          signal: linked.controller.signal,
        });
    if (!response.ok) throw providerError(response);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new Error("服务没有返回有效的图片结果。");
    }
    return resultDataList(payload);
  } catch (error) {
    if (timedOut && !options.signal.aborted)
      throw new GenerationProviderError("请求超时，任务已停止，可重试。", {
        failureClass: "network",
        retryable: true,
      });
    if (options.signal.aborted)
      throw new GenerationProviderError("已取消任务。", {
        failureClass: "cancelled",
        retryable: false,
      });
    if (error instanceof GenerationProviderError) throw error;
    if (error instanceof TypeError)
      throw new GenerationProviderError(
        "无法连接图片服务，请检查网络、地址和跨域设置。",
        { failureClass: "network", retryable: true },
      );
    // A response that arrived but cannot be decoded is a known provider
    // failure. Unknown is reserved for transport ambiguity after send.
    throw new GenerationProviderError(
      error instanceof Error ? error.message : "服务返回了无效的图片结果。",
      { failureClass: "provider_unavailable", retryable: false },
    );
  } finally {
    window.clearTimeout(timeout);
    linked.unlink();
  }
}

export interface GeneratedImages {
  sources: string[];
  failure?: GenerationProviderError | ProviderSubmissionError;
}

export async function generateImages(options: {
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  signal: AbortSignal;
  providerBaseUrl?: string;
  credentialRef?: string;
  count?: number;
  idempotencyKey?: string;
  /** Resolved provider size label such as "1024x1024"; omitted means provider default. */
  size?: string;
  onChunk?: (sources: string[], offset: number) => Promise<void>;
  beforeRequest?: () => void;
  onRequestStart?: () => void;
}): Promise<GeneratedImages> {
  if (!navigator.onLine) throw new Error("网络已断开，请恢复网络后重试。");
  const profile = modelProviderSchema.parse(
    parseModelProvider(window.localStorage.getItem(MODEL_PROVIDER_STORAGE_KEY))
      .profile,
  );
  const baseUrl = options.providerBaseUrl?.trim() || profile.baseUrl;
  const model = options.model.trim() || profile.model.trim();
  if (!model) throw new Error("尚未选择模型，请在输入栏选择本次创作模型。");
  if (
    !modelSupportsKind(model, "image") &&
    !readModelCatalogs().some(
      (catalog) =>
        catalog.baseUrl === baseUrl &&
        catalog.credentialRef === options.credentialRef &&
        catalog.models.some(
          (item) => item.id === model && item.kind === "image",
        ),
    )
  )
    throw new Error("当前模型不支持图片创作，请更换图片模型。");
  const sessionApiKey = await loadApiKey(baseUrl, options.credentialRef);
  if (!sessionApiKey.trim())
    throw new Error("尚未配置 API Key，请先在设置中配置模型连接。");
  const requestedCount = Math.max(
    1,
    Math.min(64, Math.floor(options.count ?? 1)),
  );
  const attachments = await resolveImageAttachments(
    options.attachments,
    loadStoredAsset,
  );
  // OpenAI's official image endpoint accepts at most ten outputs per request
  // (and dall-e-3 only accepts one). Larger UI batches become idempotent chunks.
  const perRequest = /dall[-_ ]?e[-_ ]?3/i.test(model) ? 1 : 10;
  const results: string[] = [];
  for (let offset = 0; offset < requestedCount; offset += perRequest) {
    if (options.signal.aborted)
      throw new GenerationProviderError("已取消任务。", {
        failureClass: "cancelled",
        retryable: false,
      });
    const count = Math.min(perRequest, requestedCount - offset);
    try {
      if (getSessionApiKey(baseUrl, options.credentialRef) !== sessionApiKey)
        throw new ProviderSubmissionError(
          "连接密钥已清除或更改，本次剩余输出未提交，请确认凭据后重试。",
        );
      options.beforeRequest?.();
      options.onRequestStart?.();
      const chunk = await requestImageChunk({
        baseUrl,
        model,
        prompt: options.prompt,
        attachments,
        count,
        apiKey: sessionApiKey,
        signal: options.signal,
        size: options.size,
        idempotencyKey: options.idempotencyKey
          ? `${options.idempotencyKey}-part-${Math.floor(offset / perRequest) + 1}`
          : undefined,
      });
      results.push(...chunk);
      if (options.onChunk) await options.onChunk(chunk, offset);
    } catch (error) {
      if (results.length && !options.signal.aborted)
        return {
          sources: results,
          failure:
            error instanceof GenerationProviderError ||
            error instanceof ProviderSubmissionError
              ? error
              : new GenerationProviderError(
                  "部分图片未完成，请重试剩余结果。",
                  {
                    failureClass: "provider_unavailable",
                    retryable: false,
                  },
                ),
        };
      throw error;
    }
  }
  return { sources: results };
}

export async function generateImage(options: {
  prompt: string;
  model: string;
  attachments: CreationAttachment[];
  signal: AbortSignal;
  providerBaseUrl?: string;
  credentialRef?: string;
}): Promise<string> {
  return (await generateImages({ ...options, count: 1 })).sources[0];
}

export function providerModelsEndpoint(): string {
  return getModelsEndpoint(readProvider().baseUrl);
}
