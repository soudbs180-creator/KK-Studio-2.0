import { z } from "zod";
import { PROVIDER_PRESETS } from "./providerPresets.ts";
import { isLocalProviderUrl } from "./providerUrl.ts";

export const providerChannelSchema = z.enum(["relay", "official", "local"]);
export const providerPrioritySchema = z.number().int().min(0).max(9999);
export type ProviderChannel = z.infer<typeof providerChannelSchema>;
export type PickerChannel = ProviderChannel | "account";
export const modelChannels: readonly { id: PickerChannel; label: string }[] = [
  { id: "relay", label: "中转 API" },
  { id: "account", label: "登录账号" },
  { id: "official", label: "官方 API" },
  { id: "local", label: "本地" },
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
  channel?: ProviderChannel;
  baseUrl?: string;
  kind?: string;
}): ProviderChannel {
  if (value.kind === "local_comfyui" || isLocalProviderUrl(value.baseUrl ?? ""))
    return "local";
  if (value.channel && value.channel !== "local") return value.channel;
  const actual = endpoint(value.baseUrl);
  return actual &&
    PROVIDER_PRESETS.some(
      (preset) =>
        preset.category === "官方" && actual === endpoint(preset.baseUrl),
    )
    ? "official"
    : "relay";
}
