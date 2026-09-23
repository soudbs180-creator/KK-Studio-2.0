import { modelProviderSchema } from "../../domain/modelProvider.ts";
import { loadApiKey } from "./providerCredentials.ts";
import { GenerationProviderError } from "./imageGeneration.ts";

const invalidStream = () =>
  new Error("文本响应不完整或格式无效，请先核对供应商；不会自动重复提交。");

/** Strict bounded SSE consumer. Partial output is a draft, never a completed result. */
export async function readTextStream(
  response: Response,
  signal: AbortSignal,
  onText?: (text: string) => void,
): Promise<string> {
  signal.throwIfAborted();
  if (
    !response.headers.get("content-type")?.includes("text/event-stream") ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => undefined);
    throw invalidStream();
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const encoder = new TextEncoder();
  let buffer = "",
    text = "",
    data: string[] = [];
  let bytes = 0,
    finished = false,
    eventBytes = 0;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  function dispatch() {
    if (!data.length) return;
    const value = data.join("\n");
    data = [];
    eventBytes = 0;
    if (value === "[DONE]") {
      finished = true;
      return;
    }
    let payload;
    try {
      payload = JSON.parse(value);
    } catch {
      throw invalidStream();
    }
    if (!payload || payload.error || !Array.isArray(payload.choices))
      throw invalidStream();
    // OpenAI optionally emits a final usage-only event with an empty choices array.
    if (!payload.choices.length && payload.usage) return;
    const choice = payload.choices[0];
    if (!choice || !choice.delta || typeof choice.delta !== "object")
      throw invalidStream();
    if (
      choice.delta.tool_calls ||
      choice.delta.function_call ||
      choice.delta.refusal
    )
      throw invalidStream();
    const content = choice.delta.content;
    if (content != null && typeof content !== "string") throw invalidStream();
    if (content) {
      text += content;
      if (encoder.encode(text).length > 32768) throw invalidStream();
      onText?.(text);
    }
    if (choice.finish_reason != null) {
      if (choice.finish_reason !== "stop") throw invalidStream();
      finished = true;
    }
  }
  try {
    while (!finished) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) {
        buffer += decoder.decode();
        break;
      }
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw invalidStream();
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while (!finished && (newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (encoder.encode(line).length > 65536) throw invalidStream();
        if (!line) dispatch();
        else if (line.startsWith("data:")) {
          const value = line.slice(5).replace(/^ /, "");
          eventBytes += encoder.encode(value).length;
          if (eventBytes > 65536) throw invalidStream();
          data.push(value);
        } else if (
          line.startsWith("event:") &&
          line.slice(6).trim() === "error"
        )
          throw invalidStream();
      }
      if (encoder.encode(buffer).length > 65536) throw invalidStream();
    }
    signal.throwIfAborted();
    if (!finished || !text.trim()) throw invalidStream();
    return text;
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (error instanceof TypeError) throw invalidStream();
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function generateText(options: {
  prompt: string;
  model: string;
  providerBaseUrl: string;
  credentialRef?: string;
  idempotencyKey: string;
  signal: AbortSignal;
  beforeRequest: () => void;
  onRequestStart: () => void;
  onText?: (text: string) => void;
}): Promise<string> {
  const signal = AbortSignal.any([
    options.signal,
    AbortSignal.timeout(120_000),
  ]);
  modelProviderSchema.parse({
    version: 1,
    name: "provider",
    baseUrl: options.providerBaseUrl,
    model: options.model,
  });
  signal.throwIfAborted();
  if (typeof navigator !== "undefined" && !navigator.onLine)
    throw new Error("当前离线，未提交文本任务；草稿已保留。");
  const apiKey = await loadApiKey(
    options.providerBaseUrl,
    options.credentialRef,
  );
  signal.throwIfAborted();
  if (!apiKey) throw new Error("原绑定连接缺少密钥，请配置后重试。");
  options.beforeRequest();
  signal.throwIfAborted();
  const url = new URL(options.providerBaseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  options.onRequestStart();
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": options.idempotencyKey,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: options.prompt }],
        stream: true,
      }),
    });
  } catch {
    signal.throwIfAborted();
    throw new GenerationProviderError("文本请求连接中断，请先核对供应商。", {
      failureClass: "network",
      retryable: false,
    });
  }
  if (!response.ok) {
    const status = response.status;
    await response.body?.cancel().catch(() => undefined);
    const retryAfter = response.headers.get("retry-after");
    const seconds =
      retryAfter && /^\d+(\.\d+)?$/.test(retryAfter)
        ? Number(retryAfter)
        : retryAfter
          ? Math.max(0, (Date.parse(retryAfter) - Date.now()) / 1000)
          : undefined;
    throw new GenerationProviderError(
      `文本生成失败（HTTP ${status}），请检查连接后重试。`,
      {
        status,
        retryAfterSeconds:
          seconds !== undefined && Number.isFinite(seconds)
            ? seconds
            : undefined,
        failureClass:
          status === 401
            ? "unauthorized"
            : status === 403
              ? "forbidden"
              : status === 429
                ? "rate_limited"
                : status >= 500
                  ? "provider_unavailable"
                  : "invalid_request",
        retryable: false,
      },
    );
  }
  return readTextStream(response, signal, options.onText);
}
