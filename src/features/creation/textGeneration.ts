import {
  fromWireEvent,
  type GatewayProtocol,
} from "../../domain/gatewayTranslate.ts";
import { PrivacyMask } from "../../domain/privacyMask.ts";
import { modelProviderSchema } from "../../domain/modelProvider.ts";
import { readTokenUsage, type TokenUsage } from "../../domain/tokenUsage.ts";
import {
  buildTextRequest,
  providerNeedsKey,
  type ProviderProtocol,
  type ProviderProtocolOptions,
} from "../../domain/providerProtocol.ts";
import { isLocalProviderUrl } from "../../domain/providerUrl.ts";
import {
  bumpGatewayCursor,
  readGatewayPreferences,
  textRoutePlan,
  type TextRouteTarget,
} from "../ai-gateway/index.ts";
import { loadApiKey } from "./providerCredentials.ts";
import { readStreamCostReceipt } from "./taskCostArchive.ts";
import { GenerationProviderError } from "./imageGeneration.ts";
import {
  consumeTextEvent,
  type TextProtocolState,
} from "./textProtocolEvent.ts";

const invalidStream = () =>
  new Error("文本响应不完整或格式无效，请先核对供应商；不会自动重复提交。");

/** Strict bounded SSE consumer. Partial output is a draft, never a completed result. */
export async function readTextStream(
  response: Response,
  signal: AbortSignal,
  onText?: (text: string) => void,
  protocol: ProviderProtocol = "openai-chat",
  onUsage?: (usage: TokenUsage) => void,
  privacy?: PrivacyMask,
  onCostReceipt?: (receipt: Record<string, unknown>) => void,
): Promise<string> {
  signal.throwIfAborted();
  const body = response.body;
  if (
    !response.headers.get("content-type")?.includes("text/event-stream") ||
    !body
  ) {
    await body?.cancel().catch(() => undefined);
    throw invalidStream();
  }
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const encoder = new TextEncoder();
  const modern = protocol === "openai-responses" || protocol === "anthropic";
  const state: TextProtocolState = {
    text: "",
    complete: false,
    endTurn: false,
  };
  let buffer = "",
    text = "",
    data: string[] = [],
    eventType = "";
  let bytes = 0,
    finished = false,
    eventBytes = 0;
  let usage: TokenUsage | undefined;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  function dispatch() {
    if (!data.length) {
      eventType = "";
      return;
    }
    if (modern && finished) throw invalidStream();
    const value = data.join("\n");
    data = [];
    eventBytes = 0;
    if (value === "[DONE]") {
      if (protocol === "openai-responses" || protocol === "anthropic")
        throw invalidStream();
      finished = true;
      return;
    }
    let payload;
    try {
      payload = JSON.parse(value);
    } catch {
      throw invalidStream();
    }
    if (
      eventType &&
      ["openai-responses", "anthropic"].includes(protocol) &&
      payload.type !== eventType
    )
      throw invalidStream();
    eventType = "";
    if (privacy) restoreWirePayload(protocol, payload, privacy);
    const previous = state.text;
    consumeTextEvent(payload, state, protocol);
    usage = readTokenUsage(payload, usage);
    if (usage) onUsage?.(usage);
    const costReceipt = readStreamCostReceipt(payload);
    if (costReceipt) onCostReceipt?.(costReceipt);
    text = state.text;
    if (text !== previous) {
      if (encoder.encode(text).length > 32768) throw invalidStream();
      onText?.(text);
    }
    // Chat providers send usage-only events after finish_reason, before [DONE].
    if (modern) finished = state.complete;
  }
  function consumeLine(line: string): void {
    if (encoder.encode(line).length > 65536) throw invalidStream();
    if (!line) dispatch();
    else if (line.startsWith("data:")) {
      const value = line.slice(5).replace(/^ /, "");
      eventBytes += encoder.encode(value).length;
      if (eventBytes > 65536) throw invalidStream();
      data.push(value);
    } else if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
      if (eventType === "error") throw invalidStream();
    }
  }
  function completeChatAtEof() {
    return !modern && state.complete && !buffer && !data.length;
  }
  try {
    while (!finished) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) {
        buffer += decoder.decode();
        if (completeChatAtEof()) finished = true;
        break;
      }
      bytes += chunk.value.byteLength;
      if (bytes > 2 * 1024 * 1024) throw invalidStream();
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while ((!finished || modern) && (newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        consumeLine(line);
      }
      if (encoder.encode(buffer).length > 65536) throw invalidStream();
      if (modern && finished) {
        buffer += decoder.decode();
        if (buffer || data.length) throw invalidStream();
      }
    }
    validateCompletion();
    function validateCompletion() {
      signal.throwIfAborted();
      if (!finished || !text.trim()) throw invalidStream();
    }
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

function wireProtocol(protocol: ProviderProtocol): GatewayProtocol | undefined {
  if (
    protocol === "openai-chat" ||
    protocol === "openai-responses" ||
    protocol === "anthropic"
  )
    return protocol;
  return undefined;
}

function unmaskStrings(value: unknown, privacy: PrivacyMask): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === "string") value[index] = privacy.unmask(item);
      else unmaskStrings(item, privacy);
    });
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string")
      (value as Record<string, unknown>)[key] = privacy.unmask(item);
    else unmaskStrings(item, privacy);
  }
}

function restoreWirePayload(
  protocol: ProviderProtocol,
  payload: unknown,
  privacy: PrivacyMask,
): void {
  const wire = wireProtocol(protocol);
  if (wire) {
    const delta = fromWireEvent(wire, payload);
    if (delta?.text) delta.text = privacy.unmask(delta.text);
    if (delta?.reasoning) delta.reasoning = privacy.unmask(delta.reasoning);
    if (delta?.toolCall)
      delta.toolCall.arguments = privacy.unmask(delta.toolCall.arguments);
  }
  unmaskStrings(payload, privacy);
}

export async function generateText(options: {
  protocol?: ProviderProtocolOptions["protocol"];
  authMode?: ProviderProtocolOptions["authMode"];
  prompt: string;
  model: string;
  providerBaseUrl: string;
  credentialRef?: string;
  idempotencyKey: string;
  signal: AbortSignal;
  beforeRequest: () => void;
  onRequestStart: () => void;
  onText?: (text: string) => void;
  onUsage?: (usage: TokenUsage) => void;
  onCostReceipt?: (receipt: Record<string, unknown>) => void;
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
    protocol: options.protocol,
    authMode: options.authMode,
  });
  signal.throwIfAborted();
  if (
    typeof navigator !== "undefined" &&
    !navigator.onLine &&
    !isLocalProviderUrl(options.providerBaseUrl)
  )
    throw new Error("当前离线，未提交文本任务；草稿已保留。");
  const prefs = readGatewayPreferences();
  const privacy = !prefs || prefs.maskOutbound ? new PrivacyMask() : undefined;
  const targets = textRoutePlan({
    providerBaseUrl: options.providerBaseUrl,
    credentialRef: options.credentialRef,
    protocol: options.protocol,
    authMode: options.authMode,
    model: options.model,
  });
  let lastError: unknown;
  for (let index = 0; index < targets.length; index += 1) {
    try {
      const text = await postText(
        options,
        targets[index]!,
        privacy,
        signal,
        index,
      );
      bumpGatewayCursor();
      return text;
    } catch (error) {
      lastError = error;
      const retry =
        error instanceof GenerationProviderError &&
        error.status === 429 &&
        index < targets.length - 1;
      if (!retry) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("文本请求没有可用账号");
}

async function postText(
  options: Parameters<typeof generateText>[0],
  target: TextRouteTarget,
  privacy: PrivacyMask | undefined,
  signal: AbortSignal,
  index: number,
): Promise<string> {
  const route = {
    baseUrl: target.providerBaseUrl,
    protocol: target.protocol,
    authMode: target.authMode,
  };
  modelProviderSchema.parse({
    version: 1,
    name: "provider",
    baseUrl: route.baseUrl,
    model: target.model,
    protocol: route.protocol,
    authMode: route.authMode,
  });
  const apiKey = providerNeedsKey(route)
    ? await loadApiKey(route.baseUrl, target.credentialRef)
    : "";
  signal.throwIfAborted();
  if (index === 0) options.beforeRequest();
  const prompt = privacy ? privacy.mask(options.prompt) : options.prompt;
  const request = buildTextRequest(
    {
      ...route,
      prompt,
      model: target.model,
      idempotencyKey:
        index === 0
          ? options.idempotencyKey
          : `${options.idempotencyKey}:${index}`,
    },
    apiKey,
  );
  signal.throwIfAborted();
  options.onRequestStart();
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: "POST",
      credentials: "omit",
      redirect: "error",
      signal,
      headers: request.headers,
      body: JSON.stringify(request.body),
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
  const text = await readTextStream(
    response,
    signal,
    options.onText
      ? (value) => options.onText?.(privacy ? privacy.unmask(value) : value)
      : undefined,
    target.protocol,
    options.onUsage,
    privacy,
    options.onCostReceipt,
  );
  return privacy ? privacy.unmask(text) : text;
}
