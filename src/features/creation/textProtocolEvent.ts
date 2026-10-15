import type { ProviderProtocol } from "../../domain/providerProtocol.ts";

type Json = Record<string, unknown>;
interface ResponsesState {
  responseId?: string;
  itemId?: string;
  outputIndex?: number;
  contentIndex?: number;
  sequence?: number;
  textDone?: boolean;
}
interface AnthropicState {
  started?: boolean;
  blocks: number;
  active?: { index: number; kind: "text" | "thinking" };
}
export interface TextProtocolState {
  text: string;
  complete: boolean;
  endTurn: boolean;
  responses?: ResponsesState;
  anthropic?: AnthropicState;
}
const invalid = () => {
  throw new Error(
    "文本响应不完整或格式无效，请先核对供应商；不会自动重复提交。",
  );
};
const object = (value: unknown): Json =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Json)
    : {};
const id = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 160 ||
    [...value].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
  )
    return invalid();
  return value;
};
const index = (value: unknown): number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value < 64
    ? value
    : invalid();
function bindText(value: Json, state: ResponsesState) {
  const itemId = id(value.item_id),
    outputIndex = index(value.output_index),
    contentIndex = index(value.content_index);
  if (
    (state.itemId !== undefined && state.itemId !== itemId) ||
    (state.outputIndex !== undefined && state.outputIndex !== outputIndex) ||
    (state.contentIndex !== undefined && state.contentIndex !== contentIndex)
  )
    invalid();
  Object.assign(state, { itemId, outputIndex, contentIndex });
}
function finalResponseMessage(
  item: Json,
  outputIndex: number,
  route: ResponsesState,
): string {
  if (
    item.type !== "message" ||
    item.role !== "assistant" ||
    item.status !== "completed" ||
    !Array.isArray(item.content) ||
    item.content.length !== 1
  )
    invalid();
  const itemId = id(item.id),
    part = object((item.content as unknown[])[0]);
  if (
    part.type !== "output_text" ||
    typeof part.text !== "string" ||
    !part.text.trim() ||
    (route.itemId && route.itemId !== itemId) ||
    (route.outputIndex !== undefined && route.outputIndex !== outputIndex) ||
    (route.contentIndex !== undefined && route.contentIndex !== 0)
  )
    invalid();
  return part.text as string;
}
function completeResponses(
  value: Json,
  state: TextProtocolState,
  route: ResponsesState,
) {
  const response = object(value.response),
    responseId = id(response.id);
  if (
    response.status !== "completed" ||
    response.error != null ||
    response.incomplete_details != null ||
    (route.responseId && responseId !== route.responseId) ||
    !Array.isArray(response.output) ||
    !response.output.length ||
    response.output.length > 64
  )
    invalid();
  let finalText: string | undefined;
  (response.output as unknown[]).forEach((raw, outputIndex) => {
    const item = object(raw);
    if (item.type === "reasoning") return;
    if (finalText !== undefined) invalid();
    finalText = finalResponseMessage(item, outputIndex, route);
  });
  if (
    finalText === undefined ||
    ((state.text || route.itemId) && state.text !== finalText)
  )
    invalid();
  state.text = finalText!;
  state.complete = true;
}
function responseSequence(value: Json, route: ResponsesState) {
  if (value.sequence_number !== undefined) {
    const next = value.sequence_number;
    if (
      typeof next !== "number" ||
      !Number.isSafeInteger(next) ||
      next < 0 ||
      (route.sequence !== undefined && next <= route.sequence)
    )
      invalid();
    route.sequence = next as number;
  }
}
function responses(value: Json, state: TextProtocolState) {
  const route = (state.responses ??= {});
  responseSequence(value, route);
  switch (value.type) {
    case "response.created": {
      const responseId = id(object(value.response).id);
      if (route.responseId && route.responseId !== responseId) invalid();
      route.responseId = responseId;
      break;
    }
    case "response.output_text.delta":
      bindText(value, route);
      if (route.textDone || typeof value.delta !== "string") invalid();
      state.text += value.delta;
      break;
    case "response.output_text.done":
      bindText(value, route);
      if (route.textDone || value.text !== state.text) invalid();
      route.textDone = true;
      break;
    case "response.completed":
      completeResponses(value, state, route);
      break;
    default:
      responseMetadata(value);
  }
}
function responseMetadata(value: Json) {
  switch (value.type) {
    case "response.output_item.added":
    case "response.output_item.done": {
      const item = object(value.item);
      if (
        item.type !== "reasoning" &&
        !(item.type === "message" && item.role === "assistant")
      )
        invalid();
      break;
    }
    case "response.content_part.added":
    case "response.content_part.done":
      if (object(value.part).type !== "output_text") invalid();
      break;
    default:
      if (
        typeof value.type !== "string" ||
        /failed|incomplete|refusal|function_call|tool|search|mcp/.test(
          value.type,
        ) ||
        value.type === "error"
      )
        invalid();
  }
}
function startMessage(
  value: Json,
  state: TextProtocolState,
  route: AnthropicState,
) {
  const message = object(value.message);
  id(message.id);
  if (
    route.started ||
    message.role !== "assistant" ||
    !Array.isArray(message.content) ||
    message.content.length
  )
    invalid();
  route.started = true;
}

function startBlock(
  value: Json,
  state: TextProtocolState,
  route: AnthropicState,
) {
  const blockIndex = index(value.index),
    block = object(value.content_block);
  if (
    !route.started ||
    route.active ||
    state.endTurn ||
    blockIndex !== route.blocks
  )
    invalid();
  let kind: "text" | "thinking";
  if (block.type === "text") {
    if (typeof block.text !== "string") invalid();
    state.text += block.text;
    kind = "text";
  } else if (block.type === "thinking" || block.type === "redacted_thinking")
    kind = "thinking";
  else return invalid();
  route.active = { index: blockIndex, kind };
  route.blocks++;
}

function blockDelta(
  value: Json,
  state: TextProtocolState,
  route: AnthropicState,
) {
  const delta = object(value.delta);
  if (
    !route.active ||
    index(value.index) !== route.active.index ||
    state.endTurn
  )
    invalid();
  if (
    route.active!.kind === "text" &&
    delta.type === "text_delta" &&
    typeof delta.text === "string"
  )
    state.text += delta.text;
  else if (!(
    route.active!.kind === "thinking" &&
    ["thinking_delta", "signature_delta"].includes(String(delta.type))
  ))
    invalid();
}

function stopMessage(
  value: Json,
  state: TextProtocolState,
  route: AnthropicState,
) {
  const delta = object(value.delta);
  if (
    !route.started ||
    route.active ||
    object(delta.stop_details).type === "refusal"
  )
    invalid();
  if (delta.stop_reason !== undefined && delta.stop_reason !== null) {
    if (delta.stop_reason !== "end_turn") invalid();
    state.endTurn = true;
  }
}
function anthropic(value: Json, state: TextProtocolState) {
  const route = (state.anthropic ??= { blocks: 0 });
  switch (value.type) {
    case "message_start":
      startMessage(value, state, route);
      break;
    case "content_block_start":
      startBlock(value, state, route);
      break;
    case "content_block_delta":
      blockDelta(value, state, route);
      break;
    case "content_block_stop":
      if (!route.active || index(value.index) !== route.active.index) invalid();
      route.active = undefined;
      break;
    case "message_delta":
      stopMessage(value, state, route);
      break;
    case "message_stop":
      if (!route.started || route.active || !state.endTurn) invalid();
      state.complete = true;
      break;
    case "ping":
      break;
    default:
      invalid();
  }
}
export function consumeTextEvent(
  payload: unknown,
  state: TextProtocolState,
  protocol: ProviderProtocol,
): void {
  const value = object(payload);
  if (value.error != null || !Object.keys(value).length) invalid();
  if (protocol === "openai-responses") return responses(value, state);
  if (protocol === "anthropic") return anthropic(value, state);
  if (protocol === "gemini") return gemini(value, state);
  return consumeChat(value, state);
}
function gemini(value: Json, state: TextProtocolState) {
  if (state.complete || object(value.promptFeedback).blockReason) invalid();
  if (!Array.isArray(value.candidates)) {
    if (value.usageMetadata) return;
    invalid();
  }
  if ((value.candidates as unknown[]).length !== 1) invalid();
  const candidate = object((value.candidates as unknown[])[0]);
  if (candidate.index !== undefined && candidate.index !== 0) invalid();
  if (candidate.content) {
    const parts = object(candidate.content).parts;
    if (!Array.isArray(parts)) invalid();
    for (const raw of parts as unknown[]) {
      const part = object(raw);
      if (typeof part.text !== "string") invalid();
      if (part.thought !== true) state.text += part.text;
    }
  }
  if (candidate.finishReason != null) {
    if (candidate.finishReason !== "STOP") invalid();
    state.complete = true;
  }
}
function consumeChat(value: Json, state: TextProtocolState) {
  if (!Array.isArray(value.choices)) invalid();
  if (!(value.choices as unknown[]).length) {
    if (!value.usage) invalid();
    return;
  }
  if ((value.choices as unknown[]).length !== 1) invalid();
  const choice = object((value.choices as unknown[])[0]),
    delta = object(choice.delta);
  if (
    !choice.delta ||
    typeof choice.delta !== "object" ||
    delta.tool_calls != null ||
    delta.function_call != null ||
    delta.refusal != null
  )
    invalid();
  if (choice.index !== undefined && choice.index !== 0) invalid();
  if (delta.content != null && typeof delta.content !== "string") invalid();
  if (typeof delta.content === "string") state.text += delta.content;
  if (choice.finish_reason !== undefined && choice.finish_reason !== null) {
    if (choice.finish_reason !== "stop") invalid();
    state.complete = true;
  }
}
