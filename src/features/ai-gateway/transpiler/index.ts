import { transpileAnthropicToOpenAiRequest } from "./anthropicToOpenAiReq.ts";
import { transpileOpenAiToAnthropicRequest } from "./openAiToAnthropicReq.ts";
import {
  transpileAnthropicToOpenAiResponse,
  transpileOpenAiToAnthropicResponse,
} from "./responseBridge.ts";
import type {
  AnthropicMessagesRequest,
  AnthropicMessagesResponse,
  OpenAIChatRequest,
  OpenAIChatResponse,
  TranspileOptions,
} from "./protocolTypes.ts";

export * from "./protocolTypes.ts";
export {
  transpileAnthropicToOpenAiRequest,
  transpileAnthropicToOpenAiRequest as transpileAnthropicToOpenAiReq,
} from "./anthropicToOpenAiReq.ts";
export {
  transpileOpenAiToAnthropicRequest,
  transpileOpenAiToAnthropicRequest as transpileOpenAiToAnthropicReq,
} from "./openAiToAnthropicReq.ts";
export {
  transpileAnthropicToOpenAiResponse,
  transpileOpenAiToAnthropicResponse,
} from "./responseBridge.ts";
export {
  AnthropicToOpenAiStreamState,
  transpileAnthropicEventToOpenAiChunks,
} from "./anthropicToOpenAiStream.ts";
export {
  OpenAiToAnthropicStreamState,
  transpileOpenAiChunkToAnthropicEvents,
} from "./openAiToAnthropicStream.ts";
export {
  createStreamTranspiler,
  formatAnthropicSse,
  formatOpenAiSse,
  type StreamTranspiler,
} from "./streamTranspiler.ts";

/**
 * Universal request transpilation facade.
 */
export function transpileRequest(
  body: unknown,
  options: TranspileOptions,
): unknown {
  if (
    options.sourceProtocol === "anthropic" &&
    options.targetProtocol === "openai"
  ) {
    return transpileAnthropicToOpenAiRequest(body as AnthropicMessagesRequest);
  }
  if (
    options.sourceProtocol === "openai" &&
    options.targetProtocol === "anthropic"
  ) {
    return transpileOpenAiToAnthropicRequest(body as OpenAIChatRequest);
  }
  return body;
}

/**
 * Universal response transpilation facade.
 */
export function transpileResponse(
  body: unknown,
  options: TranspileOptions,
): unknown {
  if (
    options.sourceProtocol === "anthropic" &&
    options.targetProtocol === "openai"
  ) {
    return transpileAnthropicToOpenAiResponse(
      body as AnthropicMessagesResponse,
      options.defaultModel,
    );
  }
  if (
    options.sourceProtocol === "openai" &&
    options.targetProtocol === "anthropic"
  ) {
    return transpileOpenAiToAnthropicResponse(body as OpenAIChatResponse);
  }
  return body;
}
