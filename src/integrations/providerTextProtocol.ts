import {
  resolveProviderAuthMode,
  resolveProviderProtocol,
  type ProviderProtocol,
  type ProviderProtocolOptions,
} from "../domain/modelProvider.ts";

export interface ProviderTextMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Protocol selection is explicit; provider names and model names never select a dialect. */
export function providerRequestHeaders(
  baseUrl: string,
  apiKey: string,
  options: ProviderProtocolOptions,
): Record<string, string> {
  const protocol = resolveProviderProtocol(options);
  if (resolveProviderAuthMode(baseUrl, options) === "none")
    return protocol === "anthropic-messages"
      ? { "anthropic-version": "2023-06-01" }
      : {};
  if (!apiKey.trim()) throw new Error("原绑定连接缺少密钥，请配置后重试。");
  switch (protocol) {
    case "anthropic-messages":
      return {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
    case "gemini":
      return { "x-goog-api-key": apiKey.trim() };
    default:
      return { Authorization: `Bearer ${apiKey.trim()}` };
  }
}

export function buildProviderTextRequest(input: {
  baseUrl: string;
  model: string;
  prompt: string;
  messages?: readonly ProviderTextMessage[];
  protocol?: ProviderProtocol;
}): { url: URL; body: Record<string, unknown> } {
  const protocol = resolveProviderProtocol(input);
  const messages = input.messages ?? [
    { role: "user" as const, content: input.prompt },
  ];
  if (
    !messages.length ||
    messages.length > 200 ||
    messages.some(
      (message) =>
        !["system", "user", "assistant"].includes(message.role) ||
        typeof message.content !== "string" ||
        !message.content.trim(),
    )
  )
    throw new Error("文本对话内容无效，请检查消息与角色。");
  if (
    new TextEncoder().encode(JSON.stringify(messages)).length >
    2 * 1024 * 1024
  )
    throw new Error("文本对话内容过大，请减少上下文。");
  const url = new URL(input.baseUrl);
  const prefix = url.pathname.replace(/\/$/, "");
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const chat = messages.filter((message) => message.role !== "system");
  if (!chat.length || chat.at(-1)?.role !== "user")
    throw new Error("文本对话必须以用户消息结束。");
  if (protocol === "anthropic-messages") {
    url.pathname = `${prefix}/messages`;
    return {
      url,
      body: {
        model: input.model,
        messages: chat,
        ...(system ? { system } : {}),
        max_tokens: 4096,
        stream: true,
      },
    };
  }
  if (protocol === "gemini") {
    const model = input.model.replace(/^models\//, "");
    if (!model || !/^[A-Za-z0-9._-]+$/.test(model))
      throw new Error("Gemini 模型 ID 无效。");
    url.pathname = `${prefix}/models/${encodeURIComponent(model)}:streamGenerateContent`;
    url.searchParams.set("alt", "sse");
    return {
      url,
      body: {
        contents: chat.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      },
    };
  }
  url.pathname = `${prefix}/chat/completions`;
  return { url, body: { model: input.model, messages, stream: true } };
}
