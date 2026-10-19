/**
 * Common Protocol Types for OpenAI Chat Completions & Anthropic Messages
 */

export interface TranspileOptions {
  readonly sourceProtocol: "openai" | "anthropic";
  readonly targetProtocol: "openai" | "anthropic";
  readonly stream?: boolean;
  readonly defaultModel?: string;
}

// ---------------------------------------------------------------------------
// OpenAI Chat Completions Wire Types
// ---------------------------------------------------------------------------

export interface OpenAIChatContentPartText {
  readonly type: "text";
  readonly text: string;
}

export interface OpenAIChatContentPartImage {
  readonly type: "image_url";
  readonly image_url: {
    readonly url: string;
    readonly detail?: "auto" | "low" | "high";
  };
}

export type OpenAIChatContentPart =
  | OpenAIChatContentPartText
  | OpenAIChatContentPartImage;

export interface OpenAIFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIToolCall {
  id: string;
  type: "function";
  function: OpenAIFunctionCall;
}

export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant" | "tool" | "developer";
  content?: string | OpenAIChatContentPart[] | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: OpenAIToolCall[];
  reasoning_content?: string;
}

export interface OpenAIFunctionDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  strict?: boolean;
}

export interface OpenAITool {
  type: "function";
  function: OpenAIFunctionDefinition;
}

export type OpenAIToolChoice =
  | "none"
  | "auto"
  | "required"
  | {
      type: "function";
      function: { name: string };
    };

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  tools?: OpenAITool[];
  tool_choice?: OpenAIToolChoice;
  reasoning_effort?: "low" | "medium" | "high";
  stop?: string | string[];
}

export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
  };
}

export interface OpenAIChoice {
  index: number;
  message: OpenAIChatMessage;
  finish_reason: "stop" | "tool_calls" | "length" | "content_filter" | null;
}

export interface OpenAIChatResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: OpenAIUsage;
}

export interface OpenAIChunkToolCall {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface OpenAIChunkDelta {
  role?: string;
  content?: string | null;
  reasoning_content?: string | null;
  tool_calls?: OpenAIChunkToolCall[];
}

export interface OpenAIChunkChoice {
  index: number;
  delta: OpenAIChunkDelta;
  finish_reason: string | null;
}

export interface OpenAIChatChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: OpenAIChunkChoice[];
  usage?: OpenAIUsage;
}

// ---------------------------------------------------------------------------
// Anthropic Messages Wire Types
// ---------------------------------------------------------------------------

export interface AnthropicTextBlock {
  type: "text";
  text: string;
}

export interface AnthropicImageBlock {
  type: "image";
  source: {
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
}

export interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content?: string | (AnthropicTextBlock | AnthropicImageBlock)[];
  is_error?: boolean;
}

export interface AnthropicThinkingBlock {
  type: "thinking";
  thinking: string;
  signature?: string;
}

export interface AnthropicRedactedThinkingBlock {
  type: "redacted_thinking";
  data: string;
}

export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock
  | AnthropicThinkingBlock
  | AnthropicRedactedThinkingBlock;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export type AnthropicToolChoice =
  | { type: "auto" }
  | { type: "any" }
  | { type: "none" }
  | { type: "tool"; name: string };

export interface AnthropicThinkingConfig {
  type: "enabled" | "disabled";
  budget_tokens?: number;
}

export interface AnthropicMessagesRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string | AnthropicTextBlock[];
  max_tokens: number;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  tools?: AnthropicTool[];
  tool_choice?: AnthropicToolChoice;
  thinking?: AnthropicThinkingConfig;
  stop_sequences?: string[];
}

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface AnthropicMessagesResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: AnthropicContentBlock[];
  model: string;
  stop_reason:
    | "end_turn"
    | "tool_use"
    | "max_tokens"
    | "stop_sequence"
    | null;
  stop_sequence: string | null;
  usage: AnthropicUsage;
}

export interface AnthropicStreamEventMessageStart {
  type: "message_start";
  message: {
    id: string;
    type: "message";
    role: "assistant";
    model: string;
    content: AnthropicContentBlock[];
    stop_reason: null;
    stop_sequence: null;
    usage: AnthropicUsage;
  };
}

export interface AnthropicStreamEventContentBlockStart {
  type: "content_block_start";
  index: number;
  content_block: AnthropicContentBlock;
}

export interface AnthropicTextDelta {
  type: "text_delta";
  text: string;
}

export interface AnthropicThinkingDelta {
  type: "thinking_delta";
  thinking: string;
}

export interface AnthropicInputJsonDelta {
  type: "input_json_delta";
  partial_json: string;
}

export type AnthropicDelta =
  | AnthropicTextDelta
  | AnthropicThinkingDelta
  | AnthropicInputJsonDelta;

export interface AnthropicStreamEventContentBlockDelta {
  type: "content_block_delta";
  index: number;
  delta: AnthropicDelta;
}

export interface AnthropicStreamEventContentBlockStop {
  type: "content_block_stop";
  index: number;
}

export interface AnthropicStreamEventMessageDelta {
  type: "message_delta";
  delta: {
    stop_reason?: string | null;
    stop_sequence?: string | null;
  };
  usage?: {
    output_tokens: number;
  };
}

export interface AnthropicStreamEventMessageStop {
  type: "message_stop";
}

export interface AnthropicStreamEventPing {
  type: "ping";
}

export type AnthropicStreamEvent =
  | AnthropicStreamEventMessageStart
  | AnthropicStreamEventContentBlockStart
  | AnthropicStreamEventContentBlockDelta
  | AnthropicStreamEventContentBlockStop
  | AnthropicStreamEventMessageDelta
  | AnthropicStreamEventMessageStop
  | AnthropicStreamEventPing;
