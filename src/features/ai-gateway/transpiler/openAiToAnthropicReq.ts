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

function parseImagePart(part: OpenAIChatContentPart): AnthropicImageBlock | null {
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
    if (typeof msg.content === "string" && msg.content) {
      blocks.push({
        type: "text",
        text: msg.content,
      });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
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
    }
  }

  // 3. Tool calls (assistant)
  if (msg.role === "assistant" && msg.tool_calls) {
    for (const tc of msg.tool_calls) {
      let parsedInput: Record<string, unknown>;
      try {
        parsedInput =
          typeof tc.function.arguments === "string" && tc.function.arguments.trim()
            ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
            : {};
      } catch {
        parsedInput = { raw: tc.function.arguments };
      }
      blocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input: parsedInput,
      });
    }
  }

  // 4. Tool result (tool message)
  if (msg.role === "tool") {
    let contentStr = "";
    if (typeof msg.content === "string") {
      contentStr = msg.content;
    } else if (msg.content != null) {
      contentStr = JSON.stringify(msg.content);
    }
    blocks.push({
      type: "tool_result",
      tool_use_id: msg.tool_call_id || "",
      content: contentStr,
    });
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
  if (typeof choice === "object" && choice.type === "function" && choice.function.name) {
    return {
      type: "tool",
      name: choice.function.name,
    };
  }
  return undefined;
}

/**
 * Transpiles an OpenAI /v1/chat/completions request to an Anthropic /v1/messages request.
 */
export function transpileOpenAiToAnthropicRequest(
  req: OpenAIChatRequest,
): AnthropicMessagesRequest {
  // Extract system messages
  const systemTexts: string[] = [];
  for (const msg of req.messages || []) {
    if (msg.role === "system" || msg.role === "developer") {
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
  }

  const messages = assembleAnthropicMessages(req.messages || []);
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

  if (req.reasoning_effort) {
    let budget = 4096;
    if (req.reasoning_effort === "low") budget = 2048;
    else if (req.reasoning_effort === "medium") budget = 8192;
    else if (req.reasoning_effort === "high") budget = 16384;

    anthropicReq.thinking = {
      type: "enabled",
      budget_tokens: budget,
    };
  }

  if (
    anthropicReq.thinking &&
    anthropicReq.thinking.budget_tokens !== undefined &&
    anthropicReq.thinking.budget_tokens >= (anthropicReq.max_tokens || 4096)
  ) {
    anthropicReq.max_tokens = anthropicReq.thinking.budget_tokens + 4096;
  }

  if (req.stop) {
    anthropicReq.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];
  }

  return anthropicReq;
}
