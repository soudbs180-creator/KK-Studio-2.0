import type { InlineTextResult } from "./adapter.ts";
import { normalizeHttpFailure, type NormalizedError } from "../errors.ts";
import {
  consumeTextEvent,
  type TextProtocolState,
} from "../../creation/textProtocolEvent.ts";

class ChatStreamError extends Error {
  readonly normalized: NormalizedError;
  constructor(normalized: NormalizedError) {
    super(normalized.detail);
    this.normalized = normalized;
  }
}

export async function readChatStream(
  response: Response,
  options: {
    signal?: AbortSignal;
    onTextDelta: (delta: string) => void | Promise<void>;
    channelId: string;
  },
): Promise<InlineTextResult> {
  const { signal } = options;
  const failure = (
    normalized: NormalizedError = {
      errorClass: "UPSTREAM_ERROR",
      httpStatus: 502,
      retryable: false,
    },
  ) =>
    new ChatStreamError({
      ...normalized,
      channelId: options.channelId,
      detail:
        normalized.errorClass === "CONTENT_BLOCKED"
          ? "Upstream rejected the chat request."
          : "Upstream chat stream failed or was incomplete.",
    });
  if (
    !response.body ||
    response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase() !== "text/event-stream"
  ) {
    await response.body?.cancel().catch(() => undefined);
    signal?.throwIfAborted();
    throw failure();
  }
  const reader = response.body.getReader();
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

  async function abortable<T>(work: Promise<T>): Promise<T> {
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
    if (type === "error" && value === "[DONE]") throw failure();
    if (value === "[DONE]") {
      if (!state.complete || !state.text.trim()) throw failure();
      done = true;
      return;
    }
    const payload: unknown = JSON.parse(value);
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      throw failure();
    const event = payload as Record<string, unknown>;
    if (event.error != null || type === "error") {
      const error = event.error ?? event;
      const status =
        error && typeof error === "object"
          ? (error as Record<string, unknown>).status
          : undefined;
      throw failure(
        normalizeHttpFailure({
          status:
            typeof status === "number" && status >= 400 && status <= 599
              ? status
              : 502,
          body: error,
        }),
      );
    }
    const choices = Array.isArray(event.choices) ? event.choices : [];
    if (
      choices.some(
        (choice) =>
          !choice ||
          typeof choice !== "object" ||
          Array.isArray(choice) ||
          !choice.delta ||
          typeof choice.delta !== "object" ||
          Array.isArray(choice.delta) ||
          (choice.message !== undefined &&
            (!choice.message ||
              typeof choice.message !== "object" ||
              Array.isArray(choice.message))),
      )
    )
      throw failure();
    if (
      choices.some(
        (choice) =>
          choice?.finish_reason === "content_filter" ||
          choice?.delta?.refusal != null,
      )
    )
      throw failure({
        errorClass: "CONTENT_BLOCKED",
        httpStatus: 400,
        retryable: false,
      });
    // A stop frame is not a complete stream: usage and DONE can follow it.
    if (state.complete && choices.length) throw failure();
    const previous = state.text;
    consumeTextEvent(payload, state, "openai-chat");
    if (encoder.encode(state.text).length > 32768) throw failure();
    if (event.usage != null) {
      if (typeof event.usage !== "object" || Array.isArray(event.usage))
        throw failure();
      const tokens = event.usage as Record<string, unknown>;
      const next: NonNullable<InlineTextResult["usage"]> = {};
      for (const [wire, key] of [
        ["prompt_tokens", "promptTokens"],
        ["completion_tokens", "completionTokens"],
        ["total_tokens", "totalTokens"],
      ] as const) {
        const count = tokens[wire];
        if (count === undefined) continue;
        if (
          typeof count !== "number" ||
          !Number.isSafeInteger(count) ||
          count < 0
        )
          throw failure();
        Object.assign(next, { [key]: count });
      }
      usage = { ...usage, ...next };
    }
    if (state.text !== previous) {
      signal?.throwIfAborted();
      await abortable(
        Promise.resolve(options.onTextDelta(state.text.slice(previous.length))),
      );
      signal?.throwIfAborted();
    }
  }

  try {
    signal?.throwIfAborted();
    while (!done) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await abortable(reader.read());
      } catch {
        signal?.throwIfAborted();
        throw failure({
          errorClass: "TIMEOUT",
          httpStatus: 504,
          retryable: true,
        });
      }
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
        if (!line) await dispatch();
        else if (line.startsWith("data:"))
          data.push(line.slice(5).replace(/^ /, ""));
        else if (line.startsWith("event:")) eventType = line.slice(6).trim();
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
