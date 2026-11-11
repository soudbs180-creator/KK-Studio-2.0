import {
  consumeTextEvent,
  type TextProtocolState,
} from "../../../domain/textProtocolEvents.ts";
import { normalizeHttpFailure, type NormalizedError } from "../errors.ts";
import type { InlineTextResult } from "./adapter.ts";

class ChatStreamError extends Error {
  readonly normalized: NormalizedError;
  constructor(normalized: NormalizedError) {
    super(normalized.detail);
    this.normalized = normalized;
  }
}

const DEFAULT_STREAM_FAILURE: NormalizedError = {
  errorClass: "UPSTREAM_ERROR",
  httpStatus: 502,
  retryable: false,
};

function createStreamFailure(
  channelId: string,
  normalized: NormalizedError = DEFAULT_STREAM_FAILURE,
): ChatStreamError {
  return new ChatStreamError({
    ...normalized,
    channelId,
    detail:
      normalized.errorClass === "CONTENT_BLOCKED"
        ? "Upstream rejected the chat request."
        : "Upstream chat stream failed or was incomplete.",
  });
}

function isEventStreamResponse(response: Response): boolean {
  if (!response.body) return false;
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();
  return contentType === "text/event-stream";
}

async function abortableWithSignal<T>(
  signal: AbortSignal | undefined,
  work: Promise<T>,
): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) {
    void work.catch(() => undefined);
    throw signal.reason;
  }
  let abort!: () => void;
  const stopped = new Promise<never>((_resolve, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([work, stopped]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function checkUpstreamEventError(
  event: Record<string, unknown>,
  type: string,
  channelId: string,
): void {
  if (event.error == null && type !== "error") return;
  const error = event.error ?? event;
  const status = isPlainObject(error) ? error.status : undefined;
  throw createStreamFailure(
    channelId,
    normalizeHttpFailure({
      status:
        typeof status === "number" && status >= 400 && status <= 599
          ? status
          : 502,
      body: error,
    }),
  );
}

function isValidChoice(choice: unknown): boolean {
  if (!isPlainObject(choice)) return false;
  if (!isPlainObject(choice.delta)) return false;
  if (choice.message !== undefined && !isPlainObject(choice.message)) {
    return false;
  }
  return true;
}

function isContentBlockedChoice(choice: Record<string, unknown>): boolean {
  const delta = choice.delta as Record<string, unknown> | undefined;
  return choice.finish_reason === "content_filter" || delta?.refusal != null;
}

function validateStreamChoices(choices: unknown[], channelId: string): void {
  if (choices.some((choice) => !isValidChoice(choice))) {
    throw createStreamFailure(channelId);
  }
  if (
    choices.some((choice) =>
      isContentBlockedChoice(choice as Record<string, unknown>),
    )
  ) {
    throw createStreamFailure(channelId, {
      errorClass: "CONTENT_BLOCKED",
      httpStatus: 400,
      retryable: false,
    });
  }
}

const USAGE_FIELD_MAP = [
  ["prompt_tokens", "promptTokens"],
  ["completion_tokens", "completionTokens"],
  ["total_tokens", "totalTokens"],
] as const;

function parseUsageField(
  value: unknown,
  channelId: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw createStreamFailure(channelId);
  }
  return value;
}

function mergeStreamUsage(
  rawUsage: unknown,
  currentUsage: InlineTextResult["usage"],
  channelId: string,
): InlineTextResult["usage"] {
  if (rawUsage == null) return currentUsage;
  if (!isPlainObject(rawUsage)) throw createStreamFailure(channelId);
  const next: NonNullable<InlineTextResult["usage"]> = {};
  for (const [wire, key] of USAGE_FIELD_MAP) {
    const count = parseUsageField(rawUsage[wire], channelId);
    if (count !== undefined) {
      Object.assign(next, { [key]: count });
    }
  }
  return { ...currentUsage, ...next };
}

export async function readChatStream(
  response: Response,
  options: {
    signal?: AbortSignal;
    onTextDelta: (delta: string) => void | Promise<void>;
    channelId: string;
  },
): Promise<InlineTextResult> {
  const { signal, channelId } = options;
  const failure = (normalized?: NormalizedError) =>
    createStreamFailure(channelId, normalized);

  if (!isEventStreamResponse(response)) {
    await response.body?.cancel().catch(() => undefined);
    signal?.throwIfAborted();
    throw failure();
  }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const encoder = new TextEncoder();
  const state: TextProtocolState = {
    text: "",
    complete: false,
    endTurn: false,
  };
  let usage: InlineTextResult["usage"];
  let buffer = "",
    eventType = "";
  let data: string[] = [];
  let wireBytes = 0,
    eventBytes = 0;
  let done = false;
  const abortReader = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", abortReader, { once: true });

  async function dispatch(): Promise<void> {
    const type = eventType;
    eventType = "";
    eventBytes = 0;
    if (!data.length) {
      if (type === "error") throw failure();
      return;
    }
    const value = data.join("\n");
    data = [];
    if (value === "[DONE]") {
      if (type === "error" || !state.complete || !state.text.trim()) {
        throw failure();
      }
      done = true;
      return;
    }
    const payload: unknown = JSON.parse(value);
    if (!isPlainObject(payload)) throw failure();
    checkUpstreamEventError(payload, type, channelId);

    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    validateStreamChoices(choices, channelId);
    // A stop frame is not a complete stream: usage and DONE can follow it.
    if (state.complete && choices.length) throw failure();

    const previous = state.text;
    consumeTextEvent(payload, state, "openai-chat");
    if (encoder.encode(state.text).length > 32768) throw failure();
    usage = mergeStreamUsage(payload.usage, usage, channelId);

    if (state.text !== previous) {
      signal?.throwIfAborted();
      await abortableWithSignal(
        signal,
        Promise.resolve(options.onTextDelta(state.text.slice(previous.length))),
      );
      signal?.throwIfAborted();
    }
  }

  async function processLine(line: string): Promise<void> {
    if (!line) await dispatch();
    else if (line.startsWith("data:"))
      data.push(line.slice(5).replace(/^ /, ""));
    else if (line.startsWith("event:")) eventType = line.slice(6).trim();
  }

  async function readNextChunk(): Promise<
    ReadableStreamReadResult<Uint8Array>
  > {
    try {
      return await abortableWithSignal(signal, reader.read());
    } catch {
      signal?.throwIfAborted();
      throw failure({
        errorClass: "TIMEOUT",
        httpStatus: 504,
        retryable: true,
      });
    }
  }

  try {
    signal?.throwIfAborted();
    while (!done) {
      const chunk = await readNextChunk();
      signal?.throwIfAborted();
      if (chunk.done) {
        decoder.decode();
        throw failure();
      }
      wireBytes += chunk.value.byteLength;
      if (wireBytes > 2 * 1024 * 1024) throw failure();
      buffer += decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while (!done && (newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        eventBytes += encoder.encode(line).length + 1;
        if (eventBytes > 65536) throw failure();
        await processLine(line);
      }
      if (!done && eventBytes + encoder.encode(buffer).length > 65536)
        throw failure();
    }
    signal?.throwIfAborted();
    return { kind: "text", text: state.text, ...(usage ? { usage } : {}) };
  } catch (error) {
    if (signal?.aborted) throw signal.reason;
    if (error instanceof ChatStreamError) throw error;
    throw failure();
  } finally {
    signal?.removeEventListener("abort", abortReader);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
