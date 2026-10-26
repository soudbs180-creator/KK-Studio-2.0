import type { AnthropicStreamEvent, OpenAIChatChunk } from "./types.ts";

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

function createBaseChunk(state: AnthropicToOpenAiStreamState): OpenAIChatChunk {
  return {
    id: state.responseId || `chatcmpl-${Date.now()}`,
    object: "chat.completion.chunk",
    created: state.created,
    model: state.model,
    choices: [],
  };
}

function handleMessageStart(
  event: Extract<AnthropicStreamEvent, { type: "message_start" }>,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  const msg = event.message;
  state.responseId = msg.id.startsWith("chatcmpl-")
    ? msg.id
    : `chatcmpl-${msg.id}`;
  if (msg.model) state.model = msg.model;
  if (msg.usage) {
    state.inputTokens = msg.usage.input_tokens ?? 0;
    state.cacheReadTokens = msg.usage.cache_read_input_tokens ?? 0;
  }

  const chunk = createBaseChunk(state);
  chunk.choices.push({
    index: 0,
    delta: {
      role: "assistant",
      content: "",
    },
    finish_reason: null,
  });
  return [chunk];
}

function handleContentBlockStart(
  event: Extract<AnthropicStreamEvent, { type: "content_block_start" }>,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  const block = event.content_block;
  if (block.type !== "tool_use") return [];

  state.hasToolCalls = true;
  const tIndex = state.nextToolIndex++;
  state.toolBlockMap.set(event.index, tIndex);

  const chunk = createBaseChunk(state);
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
  return [chunk];
}

function handleContentBlockDelta(
  event: Extract<AnthropicStreamEvent, { type: "content_block_delta" }>,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  const delta = event.delta;
  const chunk = createBaseChunk(state);

  if (delta.type === "thinking_delta") {
    chunk.choices.push({
      index: 0,
      delta: {
        reasoning_content: delta.thinking,
      },
      finish_reason: null,
    });
    return [chunk];
  }

  if (delta.type === "text_delta") {
    chunk.choices.push({
      index: 0,
      delta: {
        content: delta.text,
      },
      finish_reason: null,
    });
    return [chunk];
  }

  if (delta.type === "input_json_delta") {
    const tIndex = state.toolBlockMap.get(event.index) ?? 0;
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
    return [chunk];
  }

  return [];
}

function resolveDeltaFinishReason(
  stopReason: string | null | undefined,
  hasToolCalls: boolean,
): string {
  if (stopReason === "tool_use" || hasToolCalls) return "tool_calls";
  if (stopReason === "max_tokens") return "length";
  return "stop";
}

function handleMessageDelta(
  event: Extract<AnthropicStreamEvent, { type: "message_delta" }>,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  if (event.usage?.output_tokens !== undefined) {
    state.outputTokens = event.usage.output_tokens;
  }

  const finishReason = resolveDeltaFinishReason(
    event.delta?.stop_reason,
    state.hasToolCalls,
  );

  const chunk = createBaseChunk(state);
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
  return [chunk];
}

/**
 * Converts one Anthropic stream event into zero or more OpenAI ChatCompletions chunks.
 */
export function transpileAnthropicEventToOpenAiChunks(
  event: AnthropicStreamEvent,
  state: AnthropicToOpenAiStreamState,
): OpenAIChatChunk[] {
  switch (event.type) {
    case "message_start":
      return handleMessageStart(event, state);
    case "content_block_start":
      return handleContentBlockStart(event, state);
    case "content_block_delta":
      return handleContentBlockDelta(event, state);
    case "message_delta":
      return handleMessageDelta(event, state);
    default:
      return [];
  }
}
