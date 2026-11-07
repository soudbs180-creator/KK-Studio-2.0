import { z } from "zod";
import { PROVIDER_PRESETS } from "./providerPresets.ts";
import { isLocalProviderUrl } from "./providerUrl.ts";

export const providerChannelSchema = z.enum([
  "official",
  "relay",
  "oauth",
  "cli",
  "local",
]);
export const providerPrioritySchema = z.number().int().min(0).max(9999);
export type ProviderChannel = z.infer<typeof providerChannelSchema>;
export type PickerChannel = ProviderChannel | "account";
export const modelChannels: readonly {
  id: PickerChannel;
  label: string;
  description?: string;
}[] = [
  {
    id: "official",
    label: "官方 API 直连",
    description: "OpenAI, Anthropic, Gemini, DeepSeek",
  },
  {
    id: "relay",
    label: "中转路由",
    description: "12ai, SiliconFlow, OpenRouter, 自建网关",
  },
  { id: "oauth", label: "账号授权", description: "OAuth / 网页授权" },
  {
    id: "cli",
    label: "CLI 直连",
    description: "Gemini CLI, Codex CLI, CodeBuddy CLI",
  },
  {
    id: "local",
    label: "本地模型",
    description: "Ollama, LM Studio, llama.cpp, ComfyUI",
  },
];

function endpoint(value: string | undefined): string | undefined {
  try {
    const url = new URL(value ?? "");
    if (url.username || url.password || url.search || url.hash) return;
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return;
  }
}

/** Legacy names never establish an official endpoint or a model identity. */
export function providerChannel(value: {
  channel?: ProviderChannel | string;
  baseUrl?: string;
  kind?: string;
}): ProviderChannel {
  if (value.kind === "local_comfyui" || isLocalProviderUrl(value.baseUrl ?? ""))
    return "local";
  if (value.channel === "account") return "oauth";
  if (
    value.channel &&
    value.channel !== "local" &&
    providerChannelSchema.safeParse(value.channel).success
  )
    return value.channel as ProviderChannel;
  const actual = endpoint(value.baseUrl);
  return actual &&
    PROVIDER_PRESETS.some(
      (preset) =>
        preset.category === "官方" && actual === endpoint(preset.baseUrl),
    )
    ? "official"
    : "relay";
}
