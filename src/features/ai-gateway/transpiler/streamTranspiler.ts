import {
  AnthropicToOpenAiStreamState,
  transpileAnthropicEventToOpenAiChunks,
} from "./anthropicToOpenAiStream.ts";
import {
  OpenAiToAnthropicStreamState,
  transpileOpenAiChunkToAnthropicEvents,
} from "./openAiToAnthropicStream.ts";
import type {
  AnthropicStreamEvent,
  OpenAIChatChunk,
  TranspileOptions,
} from "./types.ts";

export interface StreamTranspiler {
  processLine(line: string): string[];
  flush(): string[];
}

export function formatAnthropicSse(event: AnthropicStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function formatOpenAiSse(chunk: OpenAIChatChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Creates a stateful stream transpiler that processes SSE data lines
 * and yields target protocol SSE event strings.
 */
export function createStreamTranspiler(
  options: TranspileOptions,
): StreamTranspiler {
  if (
    options.sourceProtocol === "openai" &&
    options.targetProtocol === "anthropic"
  ) {
    const state = new OpenAiToAnthropicStreamState(options.defaultModel);
    let sseDataBuffer: string[] = [];

    return {
      processLine(line: string): string[] {
        const trimmed = line.trim();
        if (!trimmed) {
          if (sseDataBuffer.length === 0) return [];
          const raw = sseDataBuffer.join("\n");
          sseDataBuffer = [];

          if (raw === "[DONE]") {
            return [];
          }

          try {
            const chunk = JSON.parse(raw) as OpenAIChatChunk;
            const events = transpileOpenAiChunkToAnthropicEvents(chunk, state);
            return events.map(formatAnthropicSse);
          } catch {
            return [];
          }
        }

        if (trimmed.startsWith("data:")) {
          sseDataBuffer.push(trimmed.slice(5).trimStart());
        }
        return [];
      },

      flush(): string[] {
        if (sseDataBuffer.length > 0) {
          const raw = sseDataBuffer.join("\n");
          sseDataBuffer = [];
          if (raw !== "[DONE]") {
            try {
              const chunk = JSON.parse(raw) as OpenAIChatChunk;
              const events = transpileOpenAiChunkToAnthropicEvents(chunk, state);
              return events.map(formatAnthropicSse);
            } catch {
              return [];
            }
          }
        }
        return [];
      },
    };
  }

  if (
    options.sourceProtocol === "anthropic" &&
    options.targetProtocol === "openai"
  ) {
    const state = new AnthropicToOpenAiStreamState(options.defaultModel);
    let sseDataBuffer: string[] = [];

    return {
      processLine(line: string): string[] {
        const trimmed = line.trim();
        if (!trimmed) {
          if (sseDataBuffer.length === 0) return [];
          const raw = sseDataBuffer.join("\n");
          sseDataBuffer = [];

          try {
            const event = JSON.parse(raw) as AnthropicStreamEvent;
            const chunks = transpileAnthropicEventToOpenAiChunks(event, state);
            const outputs = chunks.map(formatOpenAiSse);
            if (event.type === "message_stop") {
              outputs.push("data: [DONE]\n\n");
            }
            return outputs;
          } catch {
            return [];
          }
        }

        if (trimmed.startsWith("data:")) {
          sseDataBuffer.push(trimmed.slice(5).trimStart());
        }
        return [];
      },

      flush(): string[] {
        if (sseDataBuffer.length > 0) {
          const raw = sseDataBuffer.join("\n");
          sseDataBuffer = [];
          try {
            const event = JSON.parse(raw) as AnthropicStreamEvent;
            const chunks = transpileAnthropicEventToOpenAiChunks(event, state);
            const outputs = chunks.map(formatOpenAiSse);
            if (event.type === "message_stop") {
              outputs.push("data: [DONE]\n\n");
            }
            return outputs;
          } catch {
            return [];
          }
        }
        return [];
      },
    };
  }

  // Passthrough
  return {
    processLine(line: string): string[] {
      return [line ? `${line}\n` : "\n"];
    },
    flush(): string[] {
      return [];
    },
  };
}
