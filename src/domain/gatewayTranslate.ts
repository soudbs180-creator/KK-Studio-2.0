/** Canonical turn used to translate among the four public LLM wires. */

export type GatewayProtocol =
  "openai-chat" | "openai-responses" | "anthropic" | "gemini";

export interface CanonicalToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface CanonicalTurn {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  reasoning?: string;
  toolCalls?: CanonicalToolCall[];
}

export interface CanonicalRequest {
  model: string;
  turns: CanonicalTurn[];
  stream?: boolean;
  maxTokens?: number;
}

export interface CanonicalDelta {
  text?: string;
  reasoning?: string;
  toolCall?: CanonicalToolCall;
}

export function toWireBody(
  protocol: GatewayProtocol,
  request: CanonicalRequest,
): Record<string, unknown> {
  const userTurns = request.turns.filter((turn) => turn.role !== "system");
  const system = request.turns
    .filter((turn) => turn.role === "system")
    .map((turn) => turn.content)
    .join("\n\n");
  if (protocol === "openai-responses") {
    return {
      model: request.model,
      input: userTurns.map((turn) => ({
        role: turn.role === "tool" ? "user" : turn.role,
        content: turn.content,
      })),
      stream: request.stream ?? true,
      store: false,
    };
  }
  if (protocol === "anthropic") {
    return {
      model: request.model,
      ...(system ? { system } : {}),
      max_tokens: request.maxTokens ?? 4096,
      stream: true,
      messages: userTurns.map((turn) => ({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content,
      })),
    };
  }
  if (protocol === "gemini") {
    return {
      contents: userTurns.map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [
          ...(turn.reasoning ? [{ text: turn.reasoning }] : []),
          { text: turn.content },
        ],
      })),
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    };
  }
  return {
    model: request.model,
    messages: request.turns.map((turn) => ({
      role: turn.role === "tool" ? "user" : turn.role,
      content: turn.reasoning
        ? `<think>${turn.reasoning}</think>\n${turn.content}`
        : turn.content,
      ...(turn.toolCalls?.length
        ? {
            tool_calls: turn.toolCalls.map((call) => ({
              id: call.id,
              type: "function",
              function: { name: call.name, arguments: call.arguments },
            })),
          }
        : {}),
    })),
    stream: request.stream ?? true,
    stream_options: { include_usage: true },
  };
}

function textOf(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function recordOf(payload: unknown): Record<string, unknown> | undefined {
  return payload && typeof payload === "object"
    ? (payload as Record<string, unknown>)
    : undefined;
}

function fromChat(record: Record<string, unknown>): CanonicalDelta {
  const choice = (
    record.choices as Array<Record<string, unknown>> | undefined
  )?.[0];
  const delta = choice?.delta as Record<string, unknown> | undefined;
  const call = (
    delta?.tool_calls as Array<Record<string, unknown>> | undefined
  )?.[0];
  const fn = call?.function as Record<string, unknown> | undefined;
  return {
    text: textOf(delta?.content),
    reasoning: textOf(delta?.reasoning_content),
    ...(fn?.name || fn?.arguments
      ? {
          toolCall: {
            id: textOf(call?.id) ?? "call",
            name: textOf(fn?.name) ?? "",
            arguments: textOf(fn?.arguments) ?? "",
          },
        }
      : {}),
  };
}

function fromResponses(
  record: Record<string, unknown>,
): CanonicalDelta | undefined {
  if (record.type === "response.reasoning_summary_text.delta")
    return { reasoning: textOf(record.delta) };
  if (record.type === "response.output_text.delta")
    return { text: textOf(record.delta) };
  return undefined;
}

function fromAnthropic(
  record: Record<string, unknown>,
): CanonicalDelta | undefined {
  const delta = record.delta as Record<string, unknown> | undefined;
  if (record.type !== "content_block_delta" || !delta) return undefined;
  if (delta.type === "thinking_delta")
    return { reasoning: textOf(delta.thinking) };
  if (delta.type === "text_delta") return { text: textOf(delta.text) };
  if (delta.type === "input_json_delta")
    return {
      toolCall: {
        id: "tool",
        name: "",
        arguments: textOf(delta.partial_json) ?? "",
      },
    };
  return undefined;
}

function fromGemini(
  record: Record<string, unknown>,
): CanonicalDelta | undefined {
  const candidates = record.candidates as
    Array<Record<string, unknown>> | undefined;
  const content = candidates?.[0]?.content as
    Record<string, unknown> | undefined;
  const parts =
    (content?.parts as Array<Record<string, unknown>> | undefined) ?? [];
  const text = parts.map((part) => textOf(part.text) ?? "").join("");
  return text ? { text } : undefined;
}

/** One SSE JSON object into a canonical delta. Unknown frames yield nothing. */
export function fromWireEvent(
  protocol: GatewayProtocol,
  payload: unknown,
): CanonicalDelta | undefined {
  const record = recordOf(payload);
  if (!record) return undefined;
  if (protocol === "openai-chat") return fromChat(record);
  if (protocol === "openai-responses") return fromResponses(record);
  if (protocol === "anthropic") return fromAnthropic(record);
  return fromGemini(record);
}
