import { z } from "zod";
import { BROWSER_STORAGE_KEYS } from "../runtime/storage-contract.ts";
import { isAllowedProviderUrl } from "./providerUrl.ts";

export const MODEL_PROVIDER_STORAGE_KEY = BROWSER_STORAGE_KEYS.modelProvider;

export const providerProtocolSchema = z.enum([
  "openai-compatible",
  "anthropic-messages",
  "gemini",
]);
export type ProviderProtocol = z.infer<typeof providerProtocolSchema>;
export const providerAuthModeSchema = z.enum(["api_key", "none"]);
export type ProviderAuthMode = z.infer<typeof providerAuthModeSchema>;

/** Check raw authority too: URL normalizes abbreviated/numeric IPv4. */
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
export interface ProviderProtocolOptions {
  protocol?: ProviderProtocol;
  authMode?: ProviderAuthMode;
}
export function resolveProviderProtocol(
  options: ProviderProtocolOptions = {},
): ProviderProtocol {
  return providerProtocolSchema.parse(options.protocol ?? "openai-compatible");
}
export function resolveProviderAuthMode(
  baseUrl: string,
  options: ProviderProtocolOptions = {},
): ProviderAuthMode {
  const mode = providerAuthModeSchema.parse(options.authMode ?? "api_key");
  if (mode === "none" && !isStrictLoopbackProviderUrl(baseUrl))
    throw new Error("免密认证仅允许显式配置的本机回环服务。");
  return mode;
}

export const modelProviderSchema = z
  .object({
    version: z.literal(1),
    name: z
      .string()
      .trim()
      .min(1, "请输入供应商名称")
      .max(60, "供应商名称过长"),
    baseUrl: z
      .string()
      .trim()
      .url("请输入有效的 API 地址")
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "仅支持 HTTP 或 HTTPS 地址",
      )
      .refine(
        isAllowedProviderUrl,
        "远程供应商必须使用 HTTPS；HTTP 仅允许本机回环地址",
      )
      .refine((value) => {
        try {
          const url = new URL(value);
          return !url.username && !url.password && !url.search && !url.hash;
        } catch {
          return false;
        }
      }, "请填写不含账号、密钥参数或片段的 Base URL；密钥请放入 API Key 字段"),
    model: z.string().trim().max(120, "模型名称过长"),
    /** Non-secret identity of the selected account in the provider registry. */
    connectionId: z.string().min(1).max(120).optional(),
    protocol: providerProtocolSchema.optional(),
    authMode: providerAuthModeSchema.optional(),
  })
  .refine(
    (profile) =>
      profile.authMode !== "none" ||
      isStrictLoopbackProviderUrl(profile.baseUrl),
    {
      path: ["authMode"],
      message: "免密认证仅允许本机 localhost、127.0.0.1 或 [::1] 服务",
    },
  );

export type ModelProviderProfile = z.infer<typeof modelProviderSchema>;

export const modelListSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

export const DEFAULT_MODEL_PROVIDER: ModelProviderProfile = {
  version: 1,
  name: "OpenAI 兼容 API",
  baseUrl: "https://api.openai.com/v1",
  model: "",
};

export interface ProviderPreset {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly protocol?: ProviderProtocol;
  readonly authMode?: ProviderAuthMode;
}

/**
 * One-click presets for the model provider settings form. Presets fill only
 * name/baseUrl/protocol/auth; model ids are left to the catalog refreshed by the
 * connection test so vendor model names do not go stale in source.
 */
export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI API",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    protocol: "openai-compatible",
    authMode: "api_key",
  },
  {
    id: "anthropic",
    label: "Anthropic API",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    protocol: "anthropic-messages",
    authMode: "api_key",
  },
  {
    id: "gemini",
    label: "Google Gemini API",
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    protocol: "gemini",
    authMode: "api_key",
  },
  {
    id: "ollama",
    label: "Ollama · 本地接口",
    name: "Ollama",
    baseUrl: "http://127.0.0.1:11434/v1",
    protocol: "openai-compatible",
    authMode: "none",
  },
  {
    id: "lm-studio",
    label: "LM Studio · 本地接口",
    name: "LM Studio",
    baseUrl: "http://127.0.0.1:1234/v1",
    protocol: "openai-compatible",
    authMode: "none",
  },
  {
    id: "doubao-ark",
    label: "豆包（火山方舟）",
    name: "豆包（火山方舟）",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    protocol: "openai-compatible",
    authMode: "api_key",
  },
];

export function findProviderPreset(
  id: string | undefined,
): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id);
}

export function parseModelProvider(raw: string | null): {
  profile: ModelProviderProfile;
  recovered: boolean;
} {
  if (raw === null) {
    return { profile: { ...DEFAULT_MODEL_PROVIDER }, recovered: false };
  }
  try {
    const parsed = modelProviderSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { profile: parsed.data, recovered: false };
  } catch {
    // Keep the original value so a later save can replace it deliberately.
  }
  return { profile: { ...DEFAULT_MODEL_PROVIDER }, recovered: true };
}

export function serializeModelProvider(profile: ModelProviderProfile): string {
  return JSON.stringify(modelProviderSchema.parse(profile), null, 2);
}

export function getModelsEndpoint(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/models`;
  url.search = "";
  url.hash = "";
  return url.toString();
}
