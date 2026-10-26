import type {
  AnthropicContentBlock,
  AnthropicImageBlock,
  AnthropicMessage,
  AnthropicMessagesRequest,
  AnthropicTool,
  AnthropicToolChoice,
  OpenAIChatContentPart,
  OpenAIChatMessage,
  OpenAIChatRequest,
  OpenAITool,
  OpenAIToolChoice,
} from "./types.ts";

function parseImagePart(
  part: OpenAIChatContentPart,
): AnthropicImageBlock | null {
  if (part.type !== "image_url" || !part.image_url?.url) return null;
  const url = part.image_url.url;
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url);
  if (match && match[1] && match[2]) {
    return {
      type: "image",
      source: {
        type: "base64",
        media_type: match[1],
        data: match[2],
      },
    };
  }
  // URL source
  return {
    type: "image",
    source: {
      type: "url",
      url,
    },
  };
}

function appendContentPartBlock(
  part: OpenAIChatContentPart,
  blocks: AnthropicContentBlock[],
): void {
  if (part.type === "text") {
    if (part.text) {
      blocks.push({
        type: "text",
        text: part.text,
      });
    }
  } else if (part.type === "image_url") {
    const imgBlock = parseImagePart(part);
    if (imgBlock) blocks.push(imgBlock);
  }
}

function appendMainContentBlocks(
  content: OpenAIChatMessage["content"],
  blocks: AnthropicContentBlock[],
): void {
  if (typeof content === "string" && content) {
    blocks.push({
      type: "text",
      text: content,
    });
  } else if (Array.isArray(content)) {
    for (const part of content) {
      appendContentPartBlock(part, blocks);
    }
  }
}

function parseToolCallInput(rawArguments: unknown): Record<string, unknown> {
  try {
    return typeof rawArguments === "string" && rawArguments.trim()
      ? (JSON.parse(rawArguments) as Record<string, unknown>)
      : {};
  } catch {
    return { raw: rawArguments };
  }
}

function appendToolCallBlocks(
  toolCalls: NonNullable<OpenAIChatMessage["tool_calls"]>,
  blocks: AnthropicContentBlock[],
): void {
  for (const tc of toolCalls) {
    blocks.push({
      type: "tool_use",
      id: tc.id,
      name: tc.function.name,
      input: parseToolCallInput(tc.function.arguments),
    });
  }
}

function createToolResultBlock(msg: OpenAIChatMessage): AnthropicContentBlock {
  let contentStr = "";
  if (typeof msg.content === "string") {
    contentStr = msg.content;
  } else if (msg.content != null) {
    contentStr = JSON.stringify(msg.content);
  }
  return {
    type: "tool_result",
    tool_use_id: msg.tool_call_id || "",
    content: contentStr,
  };
}

function convertOpenAiMessageToAnthropicBlocks(
  msg: OpenAIChatMessage,
): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];

  // 1. Thinking / reasoning_content
  if (msg.role === "assistant" && msg.reasoning_content) {
    blocks.push({
      type: "thinking",
      thinking: msg.reasoning_content,
    });
  }

  // 2. Main content (only for non-tool messages; tool message content belongs to tool_result)
  if (msg.role !== "tool") {
    appendMainContentBlocks(msg.content, blocks);
  }

  // 3. Tool calls (assistant)
  if (msg.role === "assistant" && msg.tool_calls) {
    appendToolCallBlocks(msg.tool_calls, blocks);
  }

  // 4. Tool result (tool message)
  if (msg.role === "tool") {
    blocks.push(createToolResultBlock(msg));
  }

  return blocks;
}

function assembleAnthropicMessages(
  messages: OpenAIChatMessage[],
): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];

  for (const msg of messages) {
    if (msg.role === "system" || msg.role === "developer") {
      // Handled at top level
      continue;
    }

    const blocks = convertOpenAiMessageToAnthropicBlocks(msg);
    if (blocks.length === 0) continue;

    const targetRole = msg.role === "assistant" ? "assistant" : "user";
    const last = result[result.length - 1];

    if (last && last.role === targetRole) {
      // Merge with previous turn of same role to satisfy strict alternating roles
      if (typeof last.content === "string") {
        last.content = [{ type: "text", text: last.content }, ...blocks];
      } else {
        last.content.push(...blocks);
      }
    } else {
      result.push({
        role: targetRole,
        content: blocks,
      });
    }
  }

  // Anthropic messages must not be empty. If empty, add a dummy user prompt.
  if (result.length === 0) {
    result.push({
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });
  }

  return result;
}

function convertOpenAiTools(tools?: OpenAITool[]): AnthropicTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters ?? {
      type: "object",
      properties: {},
    },
  }));
}

function convertOpenAiToolChoice(
  choice?: OpenAIToolChoice,
): AnthropicToolChoice | undefined {
  if (!choice) return undefined;
  if (choice === "auto") return { type: "auto" };
  if (choice === "required") return { type: "any" };
  if (choice === "none") return { type: "none" };
  if (
    typeof choice === "object" &&
    choice.type === "function" &&
    choice.function.name
  ) {
    return {
      type: "tool",
      name: choice.function.name,
    };
  }
  return undefined;
}

function extractSystemTexts(messages: OpenAIChatMessage[]): string[] {
  const systemTexts: string[] = [];
  for (const msg of messages) {
    if (msg.role !== "system" && msg.role !== "developer") continue;
    if (typeof msg.content === "string" && msg.content) {
      systemTexts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          systemTexts.push(part.text);
        }
      }
    }
  }
  return systemTexts;
}

function resolveThinkingBudget(
  effort: NonNullable<OpenAIChatRequest["reasoning_effort"]>,
): number {
  if (effort === "low") return 2048;
  if (effort === "medium") return 8192;
  if (effort === "high") return 16384;
  return 4096;
}

function applyThinkingOptions(
  req: OpenAIChatRequest,
  anthropicReq: AnthropicMessagesRequest,
): void {
  if (req.reasoning_effort) {
    anthropicReq.thinking = {
      type: "enabled",
      budget_tokens: resolveThinkingBudget(req.reasoning_effort),
    };
  }

  if (
    anthropicReq.thinking &&
    anthropicReq.thinking.budget_tokens !== undefined &&
    anthropicReq.thinking.budget_tokens >= (anthropicReq.max_tokens || 4096)
  ) {
    anthropicReq.max_tokens = anthropicReq.thinking.budget_tokens + 4096;
  }
}

/**
 * Transpiles an OpenAI /v1/chat/completions request to an Anthropic /v1/messages request.
 */
export function transpileOpenAiToAnthropicRequest(
  req: OpenAIChatRequest,
): AnthropicMessagesRequest {
  const rawMessages = req.messages || [];
  // Extract system messages
  const systemTexts = extractSystemTexts(rawMessages);
  const messages = assembleAnthropicMessages(rawMessages);
  const maxTokens = req.max_completion_tokens ?? req.max_tokens ?? 4096;

  const anthropicReq: AnthropicMessagesRequest = {
    model: req.model,
    messages,
    max_tokens: maxTokens,
    stream: req.stream ?? false,
  };

  if (systemTexts.length > 0) {
    anthropicReq.system = systemTexts.join("\n\n");
  }

  if (req.temperature !== undefined) {
    anthropicReq.temperature = req.temperature;
  }

  if (req.top_p !== undefined) {
    anthropicReq.top_p = req.top_p;
  }

  if (req.tools && req.tools.length > 0) {
    anthropicReq.tools = convertOpenAiTools(req.tools);
    if (req.tool_choice) {
      anthropicReq.tool_choice = convertOpenAiToolChoice(req.tool_choice);
    }
  }

  applyThinkingOptions(req, anthropicReq);

  if (req.stop) {
    anthropicReq.stop_sequences = Array.isArray(req.stop)
      ? req.stop
      : [req.stop];
  }

  return anthropicReq;
}
