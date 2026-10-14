import type { ProviderProtocol, ProviderAuthMode } from "./providerProtocol.ts";
export interface ProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly category: "官方" | "网关" | "本地";
  readonly protocol: string;
  readonly wireProtocol?: ProviderProtocol;
  readonly authMode?: ProviderAuthMode;
  readonly website: string;
  readonly keyUrl: string;
  readonly docsUrl: string;
  readonly keyLabel?: string;
  readonly unavailableReason?: string;
}

// Public metadata only; protocol support is explicit and never inferred from a brand.
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    name: "OpenAI",
    category: "官方",
    protocol: "Chat Completions",
    baseUrl: "https://api.openai.com/v1",
    website: "https://openai.com",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl:
      "https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create",
  },
  {
    id: "openai-responses",
    label: "OpenAI Responses",
    name: "OpenAI Responses",
    category: "官方",
    protocol: "Responses",
    wireProtocol: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    website: "https://openai.com",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl:
      "https://developers.openai.com/api/docs/guides/streaming-responses",
  },
  {
    id: "gemini",
    label: "Gemini",
    name: "Google Gemini",
    category: "官方",
    protocol: "GenerateContent",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    website: "https://ai.google.dev",
    keyUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/api",
    unavailableReason:
      "请在下方 Google 连接中配置 Gemini API Key；通用 API 表单暂不支持此协议。",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    name: "Anthropic",
    category: "官方",
    protocol: "Messages",
    wireProtocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    website: "https://www.anthropic.com",
    keyUrl: "https://platform.claude.com/settings/keys",
    docsUrl: "https://platform.claude.com/docs/en/api/messages",
  },
  {
    id: "azure-openai",
    label: "Azure OpenAI",
    name: "Azure OpenAI",
    category: "官方",
    protocol: "Azure v1 · 部署名称",
    wireProtocol: "azure-openai",
    baseUrl: "",
    website: "https://azure.microsoft.com/products/ai-services/openai-service",
    keyUrl: "https://portal.azure.com",
    docsUrl: "https://learn.microsoft.com/azure/ai-foundry/openai/reference",
  },
  {
    id: "new-api",
    label: "New API",
    name: "New API",
    category: "网关",
    protocol: "OpenAI 兼容 · 自有实例",
    baseUrl: "",
    website: "https://www.newapi.ai",
    keyUrl: "https://docs.newapi.pro/zh/docs/guide/feature-guide/user/token",
    docsUrl: "https://docs.newapi.pro/zh",
    keyLabel: "实例密钥说明",
  },
  {
    id: "lm-studio",
    label: "LM Studio",
    name: "LM Studio",
    category: "本地",
    protocol: "OpenAI 兼容",
    authMode: "none",
    baseUrl: "http://127.0.0.1:1234/v1",
    website: "https://lmstudio.ai",
    keyUrl: "https://lmstudio.ai/docs/developer/core/authentication",
    docsUrl: "https://lmstudio.ai/docs/developer/openai-compat",
    keyLabel: "密钥设置说明",
  },
  {
    id: "ollama",
    label: "Ollama",
    name: "Ollama",
    category: "本地",
    protocol: "OpenAI 兼容",
    wireProtocol: "ollama",
    authMode: "none",
    baseUrl: "http://127.0.0.1:11434/v1",
    website: "https://ollama.com",
    keyUrl: "https://docs.ollama.com/api/authentication",
    docsUrl: "https://docs.ollama.com/api/openai-compatibility",
    keyLabel: "认证说明",
  },
  {
    id: "doubao-ark",
    label: "豆包（火山方舟）",
    name: "豆包（火山方舟）",
    category: "官方",
    protocol: "OpenAI 兼容",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    website: "https://www.volcengine.com/product/ark",
    keyUrl: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
    docsUrl: "https://www.volcengine.com/docs/82379",
  },
];

export function findProviderPreset(
  id: string | undefined,
): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id);
}
