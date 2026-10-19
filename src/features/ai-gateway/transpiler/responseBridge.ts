import type {
  AnthropicContentBlock,
  AnthropicMessagesResponse,
  OpenAIChatMessage,
  OpenAIChatResponse,
  OpenAIChoice,
  OpenAIToolCall,
} from "./types.ts";

/**
 * Transpiles an Anthropic /v1/messages response to an OpenAI /v1/chat/completions response.
 */
export function transpileAnthropicToOpenAiResponse(
  resp: AnthropicMessagesResponse,
  originalModel?: string,
): OpenAIChatResponse {
  const textParts: string[] = [];
  const reasoningParts: string[] = [];
  const toolCalls: OpenAIToolCall[] = [];

  for (const block of resp.content || []) {
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

  let finishReason: OpenAIChoice["finish_reason"] = "stop";
  if (resp.stop_reason === "tool_use") {
    finishReason = "tool_calls";
  } else if (resp.stop_reason === "max_tokens") {
    finishReason = "length";
  } else if (resp.stop_reason === "end_turn") {
    finishReason = "stop";
  } else if (toolCalls.length > 0) {
    finishReason = "tool_calls";
  }

  const choice: OpenAIChoice = {
    index: 0,
    message,
    finish_reason: finishReason,
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
      let parsedInput: Record<string, unknown>;
      try {
        parsedInput =
          typeof tc.function.arguments === "string" && tc.function.arguments.trim()
            ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
            : {};
      } catch {
        parsedInput = { raw: tc.function.arguments };
      }
      blocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: parsedInput,
      });
    }
  }

  let stopReason: AnthropicMessagesResponse["stop_reason"] = "end_turn";
  if (choice?.finish_reason === "tool_calls") {
    stopReason = "tool_use";
  } else if (choice?.finish_reason === "length") {
    stopReason = "max_tokens";
  } else if (choice?.finish_reason === "stop") {
    stopReason = "end_turn";
  } else if (msg?.tool_calls && msg.tool_calls.length > 0) {
    stopReason = "tool_use";
  }

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
