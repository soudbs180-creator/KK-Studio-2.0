import type { ProviderConnection } from "../../domain/providerConnections.ts";
import {
  providerProtocol,
  providerNeedsKey,
} from "../../domain/providerProtocol.ts";
import { twelveAiApiBase, twelveAiModelKind } from "./twelveAiTaskProtocol.ts";

export function knownMediaModelKind(
  model: string,
): "video" | "audio" | undefined {
  if (twelveAiModelKind(model) === "video") return "video";
  if (/^(tts-1(?:-hd)?|gpt-4o-mini-tts(?:-[\w-]+)?)$/.test(model))
    return "audio";
}

export function mediaConnectionBlockReason(
  connection: Pick<ProviderConnection, "baseUrl" | "protocol" | "authMode">,
  model: string,
  kind: "video" | "audio",
): string | undefined {
  const route = { ...connection, baseUrl: connection.baseUrl ?? "" };
  if (providerProtocol(route) !== "openai-chat" || !providerNeedsKey(route))
    return "视频和语音需要 OpenAI Chat 协议及 API Key 认证。";
  if (
    kind === "video" &&
    (!twelveAiApiBase(connection.baseUrl) ||
      twelveAiModelKind(model) !== "video")
  )
    return "视频仅支持 12AI 的 Veo 3.1 标准或 Fast 模型，请前往模型设置。";
}
