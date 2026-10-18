import { record, nonempty, ServiceError } from "./httpClient.ts";
import { MAX_MOBILE_TEXT_RESULT_CHARS } from "../core/resultLimits.ts";
export async function readTextStream(
  response: Response,
  onDelta: (delta: string) => void,
  signal: AbortSignal,
  onRequestId?: (providerRequestId: string) => void,
) {
  if (
    response.headers.get("content-type")?.split(";")[0].trim() !==
    "text/event-stream"
  )
    throw new ServiceError("SSE_RESPONSE_REQUIRED");
  if (!response.body?.getReader)
    throw new ServiceError("STREAMING_TRANSPORT_UNAVAILABLE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let buffer = "";
  let text = "";
  let received = 0;
  let finishReason: string | undefined;
  let providerRequestId: string | undefined;
  const abort = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    for (;;) {
      if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
      const chunk = await reader.read();
      if (chunk.done) throw new ServiceError("SSE_COMPLETION_MISSING");
      received += chunk.value.length;
      if (received > 2 * 1024 * 1024)
        throw new ServiceError("STREAM_TOO_LARGE");
      buffer += decoder.decode(chunk.value, { stream: true });
      let match: RegExpExecArray | null;
      while ((match = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
        if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
        const event = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        if (event.length > 65_536)
          throw new ServiceError("SSE_EVENT_TOO_LARGE");
        const data = event
          .split(/\r\n|\n|\r/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");
        if (!data) continue;
        if (data === "[DONE]") {
          if (!finishReason || !text)
            throw new ServiceError("SSE_COMPLETION_MISSING");
          return { text, finishReason, providerRequestId };
        }
        let value: unknown;
        try {
          value = JSON.parse(data) as unknown;
        } catch {
          throw new ServiceError("INVALID_SSE_JSON");
        }
        if (!record(value) || "error" in value)
          throw new ServiceError("PROVIDER_STREAM_ERROR");
        if (value.id !== undefined) {
          if (!nonempty(value.id))
            throw new ServiceError("INVALID_PROVIDER_RECEIPT");
          if (providerRequestId && providerRequestId !== value.id)
            throw new ServiceError("PROVIDER_RECEIPT_CHANGED");
          providerRequestId = value.id;
          onRequestId?.(providerRequestId);
        }
        if (!Array.isArray(value.choices) || value.choices.length > 1)
          throw new ServiceError("INVALID_SSE_CHOICES");
        if (!value.choices.length) continue; // Usage-only final chunk.
        const choice: unknown = value.choices[0];
        if (
          !record(choice) ||
          (choice.index !== undefined && choice.index !== 0) ||
          !record(choice.delta)
        )
          throw new ServiceError("INVALID_SSE_CHOICE");
        const content = choice.delta.content;
        if (content !== undefined && content !== null) {
          if (typeof content !== "string" || finishReason)
            throw new ServiceError("INVALID_SSE_DELTA");
          text += content;
          if (text.length > MAX_MOBILE_TEXT_RESULT_CHARS)
            throw new ServiceError("TEXT_TOO_LARGE");
          if (content) onDelta(content);
          if (signal.aborted) throw new ServiceError("REQUEST_ABORTED");
        }
        if (
          choice.finish_reason !== undefined &&
          choice.finish_reason !== null
        ) {
          if (!nonempty(choice.finish_reason) || finishReason)
            throw new ServiceError("INVALID_FINISH_REASON");
          if (!["stop", "length"].includes(choice.finish_reason))
            throw new ServiceError("TEXT_COMPLETION_UNAVAILABLE");
          finishReason = choice.finish_reason;
        }
      }
      if (buffer.length > 65_536) throw new ServiceError("SSE_EVENT_TOO_LARGE");
    }
  } catch (error) {
    if (error instanceof ServiceError)
      error.providerRequestId = providerRequestId;
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
