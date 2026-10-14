import { z } from "zod";
import { isAllowedProviderUrl } from "./providerUrl.ts";

export const providerProtocolSchema = z.enum([
  "openai-chat",
  "openai-responses",
  "anthropic",
  "azure-openai",
  "ollama",
]);
export const providerAuthModeSchema = z.enum(["api-key", "none"]);
export type ProviderProtocol = z.infer<typeof providerProtocolSchema>;
export type ProviderAuthMode = z.infer<typeof providerAuthModeSchema>;
export interface ProviderProtocolOptions {
  baseUrl: string;
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
}
export const providerProtocol = (
  value: Pick<ProviderProtocolOptions, "protocol">,
): ProviderProtocol => value.protocol ?? "openai-chat";
export const providerAuthMode = (
  value: Pick<ProviderProtocolOptions, "authMode">,
): ProviderAuthMode => value.authMode ?? "api-key";
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
      (["localhost", "127.0.0.1", "::1"].includes(
        url.hostname.replace(/^\[|\]$/g, "").toLowerCase(),
      ) &&
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
    else if (providerProtocol(value) === "azure-openai")
      headers["api-key"] = apiKey.trim();
    else headers.Authorization = `Bearer ${apiKey.trim()}`;
  }
  if (providerProtocol(value) === "anthropic")
    headers["anthropic-version"] = "2023-06-01";
  return headers;
}
export function buildTextRequest(
  value: ProviderProtocolOptions & {
    model: string;
    prompt: string;
    idempotencyKey: string;
  },
  apiKey: string,
) {
  const protocol = providerProtocol(value);
  const route =
    protocol === "openai-responses"
      ? "responses"
      : protocol === "anthropic"
        ? "messages"
        : "chat/completions";
  const body: Record<string, unknown> =
    protocol === "openai-responses"
      ? {
          model: value.model,
          input: [{ role: "user", content: value.prompt }],
          stream: true,
          store: false,
        }
      : {
          model: value.model,
          messages: [{ role: "user", content: value.prompt }],
          stream: true,
          ...(protocol === "anthropic" ? { max_tokens: 4096 } : {}),
        };
  return {
    url: `${value.baseUrl.replace(/\/+$/, "")}/${route}`,
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Idempotency-Key": value.idempotencyKey,
      ...providerHeaders(value, apiKey),
    },
    body,
  };
}
