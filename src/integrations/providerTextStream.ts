import type { ProviderProtocol } from "../domain/modelProvider.ts";

export const invalidTextStream = () =>
  new Error("文本响应不完整或格式无效，请先核对供应商；不会自动重复提交。");
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw invalidTextStream();
  return value as Record<string, unknown>;
};

/** Text-only execution rejects tool/media output rather than claiming it was executed. */
export function createTextStreamDecoder(protocol: ProviderProtocol) {
  let finished = false;
  let started = false;
  let anthropicStop = false;
  function decode(value: string): string {
    if (protocol === "openai-compatible" && value === "[DONE]") {
      finished = true;
      return "";
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw invalidTextStream();
    }
    const payload = record(parsed);
    if (payload.error || payload.type === "error") throw invalidTextStream();
    if (protocol === "anthropic-messages") {
      switch (payload.type) {
        case "message_start":
          started = true;
          return "";
        case "ping":
          return "";
        case "content_block_start": {
          if (!started) throw invalidTextStream();
          const block = record(payload.content_block);
          if (
            block.type !== "text" &&
            block.type !== "thinking" &&
            block.type !== "redacted_thinking"
          )
            throw invalidTextStream();
          if (block.type === "text") {
            if (typeof block.text !== "string") throw invalidTextStream();
            return block.text;
          }
          return "";
        }
        case "content_block_delta": {
          if (!started) throw invalidTextStream();
          const delta = record(payload.delta);
          if (
            ["thinking_delta", "signature_delta"].includes(String(delta.type))
          )
            return "";
          if (delta.type !== "text_delta" || typeof delta.text !== "string")
            throw invalidTextStream();
          return delta.text;
        }
        case "content_block_stop":
          return "";
        case "message_delta": {
          const delta = record(payload.delta);
          if (
            !["end_turn", "stop_sequence"].includes(String(delta.stop_reason))
          )
            throw invalidTextStream();
          anthropicStop = true;
          return "";
        }
        case "message_stop":
          if (!started || !anthropicStop) throw invalidTextStream();
          finished = true;
          return "";
        default:
          throw invalidTextStream();
      }
    }
    if (protocol === "gemini") {
      if (payload.promptFeedback && record(payload.promptFeedback).blockReason)
        throw invalidTextStream();
      if (!Array.isArray(payload.candidates)) {
        if (payload.usageMetadata) return "";
        throw invalidTextStream();
      }
      if (payload.candidates.length !== 1) throw invalidTextStream();
      const candidate = record(payload.candidates[0]);
      let text = "";
      if (candidate.content) {
        const parts = record(candidate.content).parts;
        if (!Array.isArray(parts)) throw invalidTextStream();
        for (const value of parts) {
          const part = record(value);
          if (typeof part.text !== "string") throw invalidTextStream();
          if (part.thought !== true) text += part.text;
        }
      }
      if (candidate.finishReason != null) {
        if (candidate.finishReason !== "STOP") throw invalidTextStream();
        finished = true;
      }
      return text;
    }
    if (!Array.isArray(payload.choices)) throw invalidTextStream();
    if (!payload.choices.length && payload.usage) return "";
    if (payload.choices.length !== 1) throw invalidTextStream();
    const choice = record(payload.choices[0]);
    if (choice.index !== undefined && choice.index !== 0)
      throw invalidTextStream();
    const delta = record(choice.delta);
    if (delta.tool_calls || delta.function_call || delta.refusal)
      throw invalidTextStream();
    if (delta.content != null && typeof delta.content !== "string")
      throw invalidTextStream();
    if (choice.finish_reason != null) {
      if (choice.finish_reason !== "stop") throw invalidTextStream();
      finished = true;
    }
    return typeof delta.content === "string" ? delta.content : "";
  }
  return { decode, isFinished: () => finished };
}
