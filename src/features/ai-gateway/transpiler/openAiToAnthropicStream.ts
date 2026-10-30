import type { AnthropicStreamEvent, OpenAIChatChunk } from "./protocolTypes.ts";

interface ToolTracking {
  readonly blockIndex: number;
  id: string;
  name: string;
  announced: boolean;
  bufferedArgs: string;
}

export class OpenAiToAnthropicStreamState {
  messageStartSent = false;
  messageStopSent = false;
  nextBlockIndex = 0;

  activeBlockType: "text" | "thinking" | "tool_use" | null = null;
  activeTextBlockIndex: number | null = null;
  activeThinkingBlockIndex: number | null = null;

  // Track tools by upstream tool_call index
  readonly tools = new Map<number, ToolTracking>();
  activeToolIndex: number | null = null;
  readonly blockClosed: Record<number, boolean> = {};

  responseId = "";
  model = "";
  outputTokens = 0;
  inputTokens = 0;
  cacheReadTokens = 0;

  constructor(defaultModel = "gpt-4o") {
    this.model = defaultModel;
  }
}

type OpenAiStreamToolCall = NonNullable<
  NonNullable<OpenAIChatChunk["choices"][number]>["delta"]["tool_calls"]
>[number];

function syncStreamMetadata(
  chunk: OpenAIChatChunk,
  state: OpenAiToAnthropicStreamState,
): void {
  if (chunk.id && !state.responseId) {
    state.responseId = chunk.id.replace(/^chatcmpl-/, "msg_");
  }
  if (chunk.model && (!state.model || state.model === "gpt-4o")) {
    state.model = chunk.model;
  }

  if (chunk.usage) {
    state.inputTokens = chunk.usage.prompt_tokens ?? state.inputTokens;
    state.outputTokens = chunk.usage.completion_tokens ?? state.outputTokens;
    if (chunk.usage.prompt_tokens_details?.cached_tokens !== undefined) {
      state.cacheReadTokens = chunk.usage.prompt_tokens_details.cached_tokens;
    }
  }
}

function ensureMessageStart(
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  if (state.messageStartSent) return;
  state.messageStartSent = true;
  events.push({
    type: "message_start",
    message: {
      id: state.responseId || `msg_${Date.now()}`,
      type: "message",
      role: "assistant",
      model: state.model,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: {
        input_tokens: state.inputTokens,
        output_tokens: 0,
        ...(state.cacheReadTokens > 0
          ? { cache_read_input_tokens: state.cacheReadTokens }
          : {}),
      },
    },
  });
}

function appendReasoningDelta(
  reasoning: string,
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  if (state.activeBlockType !== "thinking") {
    // Close other block
    closeActiveBlock(state, events);
    const bIndex = state.nextBlockIndex++;
    state.activeBlockType = "thinking";
    state.activeThinkingBlockIndex = bIndex;
    events.push({
      type: "content_block_start",
      index: bIndex,
      content_block: {
        type: "thinking",
        thinking: "",
      },
    });
  }

  events.push({
    type: "content_block_delta",
    index: state.activeThinkingBlockIndex!,
    delta: {
      type: "thinking_delta",
      thinking: reasoning,
    },
  });
}

function appendTextDelta(
  text: string,
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  if (state.activeBlockType !== "text") {
    closeActiveBlock(state, events);
    const bIndex = state.nextBlockIndex++;
    state.activeBlockType = "text";
    state.activeTextBlockIndex = bIndex;
    events.push({
      type: "content_block_start",
      index: bIndex,
      content_block: {
        type: "text",
        text: "",
      },
    });
  }

  events.push({
    type: "content_block_delta",
    index: state.activeTextBlockIndex!,
    delta: {
      type: "text_delta",
      text,
    },
  });
}

function getOrCreateToolTracking(
  tc: OpenAiStreamToolCall,
  tcIndex: number,
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): ToolTracking {
  let tool = state.tools.get(tcIndex);
  if (!tool) {
    closeActiveBlock(state, events);
    const bIndex = state.nextBlockIndex++;
    tool = {
      blockIndex: bIndex,
      id: tc.id || `call_${Date.now()}_${tcIndex}`,
      name: tc.function?.name || "",
      announced: false,
      bufferedArgs: "",
    };
    state.tools.set(tcIndex, tool);
  }
  if (tc.id) tool.id = tc.id;
  if (tc.function?.name) tool.name = tc.function.name;
  return tool;
}

function appendSingleToolCallDelta(
  tc: OpenAiStreamToolCall,
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  const tcIndex = tc.index ?? 0;
  const tool = getOrCreateToolTracking(tc, tcIndex, state, events);

  // Announce content_block_start when name is available
  if (!tool.announced && tool.name) {
    tool.announced = true;
    state.activeBlockType = "tool_use";
    state.activeToolIndex = tcIndex;
    events.push({
      type: "content_block_start",
      index: tool.blockIndex,
      content_block: {
        type: "tool_use",
        id: tool.id,
        name: tool.name,
        input: {},
      },
    });
  }

  // Input json delta
  if (tc.function?.arguments) {
    if (!tool.announced) {
      tool.bufferedArgs += tc.function.arguments;
    } else {
      // If buffered args exist, flush them first
      const argsToSend = tool.bufferedArgs
        ? tool.bufferedArgs + tc.function.arguments
        : tc.function.arguments;
      tool.bufferedArgs = "";

      events.push({
        type: "content_block_delta",
        index: tool.blockIndex,
        delta: {
          type: "input_json_delta",
          partial_json: argsToSend,
        },
      });
    }
  }
}

function flushRemainingTools(
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  // Make sure any unannounced tool calls get announced and closed
  for (const tool of Array.from(state.tools.values())) {
    if (!tool.announced) {
      tool.announced = true;
      events.push({
        type: "content_block_start",
        index: tool.blockIndex,
        content_block: {
          type: "tool_use",
          id: tool.id,
          name: tool.name || "unknown",
          input: {},
        },
      });
      if (tool.bufferedArgs) {
        events.push({
          type: "content_block_delta",
          index: tool.blockIndex,
          delta: {
            type: "input_json_delta",
            partial_json: tool.bufferedArgs,
          },
        });
      }
    }
    emitBlockStop(state, events, tool.blockIndex);
  }
  state.tools.clear();
}

function mapFinishReason(
  finishReason: string,
): "end_turn" | "tool_use" | "max_tokens" {
  if (finishReason === "tool_calls") return "tool_use";
  if (finishReason === "length") return "max_tokens";
  return "end_turn";
}

function finalizeStreamOnFinishReason(
  finishReason: string,
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  closeActiveBlock(state, events);
  flushRemainingTools(state, events);

  events.push({
    type: "message_delta",
    delta: {
      stop_reason: mapFinishReason(finishReason),
      stop_sequence: null,
    },
    usage: {
      output_tokens: state.outputTokens,
    },
  });

  events.push({
    type: "message_stop",
  });
  state.messageStopSent = true;
}

/**
 * Converts one OpenAI ChatCompletions chunk into zero or more Anthropic stream events.
 */
export function transpileOpenAiChunkToAnthropicEvents(
  chunk: OpenAIChatChunk,
  state: OpenAiToAnthropicStreamState,
): AnthropicStreamEvent[] {
  const events: AnthropicStreamEvent[] = [];

  syncStreamMetadata(chunk, state);
  // 1. Ensure message_start
  ensureMessageStart(state, events);

  const choice = chunk.choices?.[0];
  if (!choice) return events;

  const delta = choice.delta;

  // 2. Reasoning / Thinking delta
  if (delta?.reasoning_content) {
    appendReasoningDelta(delta.reasoning_content, state, events);
  }

  // 3. Text content delta
  if (typeof delta?.content === "string" && delta.content) {
    appendTextDelta(delta.content, state, events);
  }

  // 4. Tool calls delta
  if (delta?.tool_calls && delta.tool_calls.length > 0) {
    for (const tc of delta.tool_calls) {
      appendSingleToolCallDelta(tc, state, events);
    }
  }

  // 5. Finish reason -> close blocks and emit message_delta + message_stop
  if (choice.finish_reason) {
    finalizeStreamOnFinishReason(choice.finish_reason, state, events);
  }

  return events;
}

function emitBlockStop(
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
  index: number,
): void {
  if (state.blockClosed[index]) {
    return;
  }
  state.blockClosed[index] = true;
  events.push({
    type: "content_block_stop",
    index,
  });
}

function closeActiveBlock(
  state: OpenAiToAnthropicStreamState,
  events: AnthropicStreamEvent[],
): void {
  if (
    state.activeBlockType === "thinking" &&
    state.activeThinkingBlockIndex !== null
  ) {
    emitBlockStop(state, events, state.activeThinkingBlockIndex);
    state.activeThinkingBlockIndex = null;
    state.activeBlockType = null;
  } else if (
    state.activeBlockType === "text" &&
    state.activeTextBlockIndex !== null
  ) {
    emitBlockStop(state, events, state.activeTextBlockIndex);
    state.activeTextBlockIndex = null;
    state.activeBlockType = null;
  } else if (
    state.activeBlockType === "tool_use" &&
    state.activeToolIndex !== null
  ) {
    const tool = state.tools.get(state.activeToolIndex);
    if (tool) {
      emitBlockStop(state, events, tool.blockIndex);
    }
    state.activeToolIndex = null;
    state.activeBlockType = null;
  }
}
