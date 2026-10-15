import { z } from "zod";
import { isAllowedProviderUrl } from "./providerUrl.ts";

export const providerProtocolSchema = z.preprocess(
  (value) =>
    value === "openai-compatible"
      ? "openai-chat"
      : value === "anthropic-messages"
        ? "anthropic"
        : value,
  z.enum([
    "openai-chat",
    "openai-responses",
    "anthropic",
    "azure-openai",
    "ollama",
    "gemini",
  ]),
);
export const providerAuthModeSchema = z.preprocess(
  (value) => (value === "api_key" ? "api-key" : value),
  z.enum(["api-key", "none"]),
);
export type ProviderProtocol = z.infer<typeof providerProtocolSchema>;
export type ProviderAuthMode = z.infer<typeof providerAuthModeSchema>;
export interface ProviderProtocolOptions {
  baseUrl: string;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
}
export const providerProtocol = (
  value: Pick<ProviderProtocolOptions, "protocol">,
): ProviderProtocol =>
  providerProtocolSchema.parse(
    value.protocol === undefined ? "openai-chat" : value.protocol,
  );
export const providerAuthMode = (
  value: Pick<ProviderProtocolOptions, "authMode">,
): ProviderAuthMode =>
  providerAuthModeSchema.parse(
    value.authMode === undefined ? "api-key" : value.authMode,
  );
export function isStrictLoopbackProviderUrl(value: string): boolean {
  if (
    !/^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(
      value,
    )
  )
    return false;
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}
export function isProviderAuthAllowed(value: ProviderProtocolOptions): boolean {
  try {
    const url = new URL(value.baseUrl);
    if (
      !isAllowedProviderUrl(value.baseUrl) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return false;
    if (
      providerProtocol(value) === "azure-openai" &&
      url.pathname.replace(/\/+$/, "") !== "/openai/v1"
    )
      return false;
    return (
      providerAuthMode(value) !== "none" ||
      (isStrictLoopbackProviderUrl(value.baseUrl) &&
        ["openai-chat", "ollama"].includes(providerProtocol(value)))
    );
  } catch {
    return false;
  }
}
export const providerNeedsKey = (value: ProviderProtocolOptions) =>
  providerAuthMode(value) !== "none";
export const supportsProviderImages = (
  value: Pick<ProviderProtocolOptions, "protocol">,
) => providerProtocol(value) === "openai-chat";
export const protocolBindingMatches = (
  left: ProviderProtocolOptions,
  right: ProviderProtocolOptions,
) =>
  providerProtocol(left) === providerProtocol(right) &&
  providerAuthMode(left) === providerAuthMode(right);

export function providerHeaders(
  value: ProviderProtocolOptions,
  apiKey: string,
): Record<string, string> {
  if (!isProviderAuthAllowed(value))
    throw new Error("免密仅支持本机 Chat/Ollama 服务，请检查协议和认证方式。");
  const headers: Record<string, string> = {};
  if (providerNeedsKey(value)) {
    if (!apiKey.trim()) throw new Error("原绑定连接缺少密钥，请配置后重试。");
    if (providerProtocol(value) === "anthropic")
      headers["x-api-key"] = apiKey.trim();
    else if (providerProtocol(value) === "gemini")
      headers["x-goog-api-key"] = apiKey.trim();
    else if (providerProtocol(value) === "azure-openai")
      headers["api-key"] = apiKey.trim();
    else headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  if (providerProtocol(value) === "anthropic") {
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  return headers;
}
export interface ProviderTextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export function buildTextRequestParts(
  value: Pick<ProviderProtocolOptions, "baseUrl" | "protocol"> & {
    model: string;
    prompt: string;
    messages?: readonly ProviderTextMessage[];
  },
) {
  const protocol = providerProtocol(value);
  const messages = value.messages ?? [
    { role: "user" as const, content: value.prompt },
  ];
  if (
    !messages.length ||
    messages.length > 200 ||
    messages.at(-1)?.role !== "user" ||
    messages.some(
      (message) =>
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim(),
    ) ||
    new TextEncoder().encode(JSON.stringify(messages)).length > 2 * 1024 * 1024
  )
    throw new Error("文本对话内容无效或过大，请检查消息与角色。");
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const chat = messages.filter((message) => message.role !== "system");
  const base = value.baseUrl.replace(/\/+$/, "");
  if (protocol === "gemini") {
    const model = value.model.replace(/^models\//, "");
    if (!model || !/^[A-Za-z0-9._-]+$/.test(model))
      throw new Error("Gemini 模型 ID 无效。");
    return {
      url:
        base +
        "/models/" +
        encodeURIComponent(model) +
        ":streamGenerateContent?alt=sse",
      body: {
        contents: chat.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      } as Record<string, unknown>,
    };
  }
  const route =
    protocol === "openai-responses"
      ? "responses"
      : protocol === "anthropic"
        ? "messages"
        : "chat/completions";
  return {
    url: base + "/" + route,
    body:
      protocol === "openai-responses"
        ? { model: value.model, input: messages, stream: true, store: false }
        : ({
            model: value.model,
            messages: protocol === "anthropic" ? chat : messages,
            stream: true,
            ...(protocol === "anthropic"
              ? { max_tokens: 4096, ...(system ? { system } : {}) }
              : {}),
          } as Record<string, unknown>),
  };
}
export function buildTextRequest(
  value: ProviderProtocolOptions & {
    model: string;
    prompt: string;
    idempotencyKey: string;
    messages?: readonly ProviderTextMessage[];
  },
  apiKey: string,
) {
  return {
    ...buildTextRequestParts(value),
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Idempotency-Key": value.idempotencyKey,
      ...providerHeaders(value, apiKey),
    },
  };
}
