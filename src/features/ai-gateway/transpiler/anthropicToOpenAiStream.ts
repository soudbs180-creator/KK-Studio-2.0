import type {
  AnthropicStreamEvent,
  OpenAIChatChunk,
} from "./types.ts";

export class AnthropicToOpenAiStreamState {
  responseId = "";
  model = "";
  created = Math.floor(Date.now() / 1000);
  inputTokens = 0;
  outputTokens = 0;
  cacheReadTokens = 0;

  // Map block index to tool index
  readonly toolBlockMap = new Map<number, number>();
  nextToolIndex = 0;
  hasToolCalls = false;

  constructor(defaultModel = "claude-3-5-sonnet") {
    this.model = defaultModel;
  }
}

/**
 * Converts one Anthropic stream event into zero or more OpenAI ChatCompletions chunks.
 */
export function transpileAnthropicEventToOpenAiChunks(
  event: AnthropicStreamEvent,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  const chunks: OpenAIChatChunk[] = [];

  const baseChunk = (): OpenAIChatChunk => ({
    id: state.responseId || `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: state.created,
    model: state.model,
    choices: [],
  });

  if (event.type === "message_start") {
    const msg = event.message;
    state.responseId = msg.id.startsWith("chatcmpl-")
      ? msg.id
      : `chatcmpl-${msg.id}`;
    if (msg.model) state.model = msg.model;
    if (msg.usage) {
      state.inputTokens = msg.usage.input_tokens ?? 0;
      state.cacheReadTokens = msg.usage.cache_read_input_tokens ?? 0;
    }

    const chunk = baseChunk();
    chunk.choices.push({
      index: 0,
      delta: {
        role: "assistant",
        content: "",
      },
      finish_reason: null,
    });
    chunks.push(chunk);
    return chunks;
  }

  if (event.type === "content_block_start") {
    const block = event.content_block;
    if (block.type === "tool_use") {
      state.hasToolCalls = true;
      const tIndex = state.nextToolIndex++;
      state.toolBlockMap.set(event.index, tIndex);

      const chunk = baseChunk();
      chunk.choices.push({
        index: 0,
        delta: {
          tool_calls: [
            {
              index: tIndex,
              id: block.id,
              type: "function",
              function: {
                name: block.name,
                arguments: "",
              },
            },
          ],
        },
        finish_reason: null,
      });
      chunks.push(chunk);
    }
    return chunks;
  }

  if (event.type === "content_block_delta") {
    const delta = event.delta;
    if (delta.type === "thinking_delta") {
      const chunk = baseChunk();
      chunk.choices.push({
        index: 0,
        delta: {
          reasoning_content: delta.thinking,
        },
        finish_reason: null,
      });
      chunks.push(chunk);
    } else if (delta.type === "text_delta") {
      const chunk = baseChunk();
      chunk.choices.push({
        index: 0,
        delta: {
          content: delta.text,
        },
        finish_reason: null,
      });
      chunks.push(chunk);
    } else if (delta.type === "input_json_delta") {
      const tIndex = state.toolBlockMap.get(event.index) ?? 0;
      const chunk = baseChunk();
      chunk.choices.push({
        index: 0,
        delta: {
          tool_calls: [
            {
              index: tIndex,
              function: {
                arguments: delta.partial_json,
              },
            },
          ],
        },
        finish_reason: null,
      });
      chunks.push(chunk);
    }
    return chunks;
  }

  if (event.type === "message_delta") {
    if (event.usage?.output_tokens !== undefined) {
      state.outputTokens = event.usage.output_tokens;
    }

    let finishReason = "stop";
    if (event.delta?.stop_reason === "tool_use" || state.hasToolCalls) {
      finishReason = "tool_calls";
    } else if (event.delta?.stop_reason === "max_tokens") {
      finishReason = "length";
    } else if (event.delta?.stop_reason === "end_turn") {
      finishReason = "stop";
    }

    const chunk = baseChunk();
    chunk.choices.push({
      index: 0,
      delta: {},
      finish_reason: finishReason,
    });
    chunk.usage = {
      prompt_tokens: state.inputTokens,
      completion_tokens: state.outputTokens,
      total_tokens: state.inputTokens + state.outputTokens,
      ...(state.cacheReadTokens > 0
        ? {
            prompt_tokens_details: {
              cached_tokens: state.cacheReadTokens,
            },
          }
        : {}),
    };
    chunks.push(chunk);
    return chunks;
  }

  return chunks;
}
