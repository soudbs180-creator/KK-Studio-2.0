import type {
  AnthropicContentBlock,
  AnthropicMessagesResponse,
  OpenAIChatMessage,
  OpenAIChatResponse,
  OpenAIChoice,
  OpenAIToolCall,
} from "./protocolTypes.ts";

function collectAnthropicResponseParts(
  content: AnthropicContentBlock[] | undefined,
): {
  textParts: string[];
  reasoningParts: string[];
  toolCalls: OpenAIToolCall[];
} {
  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: OpenAIToolCall[] = [];

  for (const block of content || []) {
    if (block.type === "text") {
      if (block.text) textParts.push(block.text);
    } else if (block.type === "thinking") {
      if (block.thinking) reasoningParts.push(block.thinking);
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments:
            typeof block.input === "string"
              ? block.input
              : JSON.stringify(block.input ?? {}),
        },
      });
    }
  }

  return { textParts, reasoningParts, toolCalls };
}

function mapAnthropicStopReason(
  stopReason: AnthropicMessagesResponse["stop_reason"],
  hasToolCalls: boolean,
): OpenAIChoice["finish_reason"] {
  if (stopReason === "tool_use") return "tool_calls";
  if (stopReason === "max_tokens") return "length";
  if (stopReason === "end_turn") return "stop";
  if (hasToolCalls) return "tool_calls";
  return "stop";
}

/**
 * Transpiles an Anthropic /v1/messages response to an OpenAI /v1/chat/completions response.
 */
export function transpileAnthropicToOpenAiResponse(
  resp: AnthropicMessagesResponse,
  originalModel?: string,
): OpenAIChatResponse {
  const { textParts, reasoningParts, toolCalls } =
    collectAnthropicResponseParts(resp.content);

  const message: OpenAIChatMessage = {
    role: "assistant",
    content: textParts.length > 0 ? textParts.join("\n\n") : null,
  };

  if (reasoningParts.length > 0) {
    message.reasoning_content = reasoningParts.join("\n\n");
  }

  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  const choice: OpenAIChoice = {
    index: 0,
    message,
    finish_reason: mapAnthropicStopReason(
      resp.stop_reason,
      toolCalls.length > 0,
    ),
  };

  const inputTokens = resp.usage?.input_tokens ?? 0;
  const outputTokens = resp.usage?.output_tokens ?? 0;

  return {
    id: resp.id.startsWith("chatcmpl-") ? resp.id : `chatcmpl-${resp.id}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: originalModel ?? resp.model,
    choices: [choice],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      ...(resp.usage?.cache_read_input_tokens !== undefined
        ? {
            prompt_tokens_details: {
              cached_tokens: resp.usage.cache_read_input_tokens,
            },
          }
        : {}),
    },
  };
}

function parseOpenAiToolInput(rawArguments: unknown): Record<string, unknown> {
  try {
    return typeof rawArguments === "string" && rawArguments.trim()
      ? (JSON.parse(rawArguments) as Record<string, unknown>)
      : {};
  } catch {
    return { raw: rawArguments };
  }
}

function mapOpenAiFinishReason(
  finishReason: string | null | undefined,
  hasToolCalls: boolean,
): AnthropicMessagesResponse["stop_reason"] {
  if (finishReason === "tool_calls") return "tool_use";
  if (finishReason === "length") return "max_tokens";
  if (finishReason === "stop") return "end_turn";
  if (hasToolCalls) return "tool_use";
  return "end_turn";
}

/**
 * Transpiles an OpenAI /v1/chat/completions response to an Anthropic /v1/messages response.
 */
export function transpileOpenAiToAnthropicResponse(
  resp: OpenAIChatResponse,
): AnthropicMessagesResponse {
  const choice = resp.choices?.[0];
  const msg = choice?.message;
  const blocks: AnthropicContentBlock[] = [];

  if (msg?.reasoning_content) {
    blocks.push({
      type: "thinking",
      thinking: msg.reasoning_content,
    });
  }

  if (typeof msg?.content === "string" && msg.content) {
    blocks.push({
      type: "text",
      text: msg.content,
    });
  }

  if (msg?.tool_calls) {
    for (const tc of msg.tool_calls) {
      blocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: parseOpenAiToolInput(tc.function.arguments),
      });
    }
  }

  const stopReason = mapOpenAiFinishReason(
    choice?.finish_reason,
    Boolean(msg?.tool_calls && msg.tool_calls.length > 0),
  );

  const promptTokens = resp.usage?.prompt_tokens ?? 0;
  const completionTokens = resp.usage?.completion_tokens ?? 0;
  const cachedTokens = resp.usage?.prompt_tokens_details?.cached_tokens ?? 0;

  return {
    id: resp.id.replace(/^chatcmpl-/, "msg_"),
    type: "message",
    role: "assistant",
    content: blocks,
    model: resp.model,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      ...(cachedTokens > 0 ? { cache_read_input_tokens: cachedTokens } : {}),
    },
  };
}
