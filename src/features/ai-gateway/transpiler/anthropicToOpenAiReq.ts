import type {
  AnthropicContentBlock,
  AnthropicImageBlock,
  AnthropicMessage,
  AnthropicMessagesRequest,
  AnthropicTextBlock,
  AnthropicTool,
  AnthropicToolChoice,
  AnthropicToolResultBlock,
  OpenAIChatContentPart,
  OpenAIChatMessage,
  OpenAIChatRequest,
  OpenAITool,
  OpenAIToolChoice,
} from "./types.ts";

function extractSystemText(
  system: string | AnthropicTextBlock[] | undefined,
): string {
  if (!system) return "";
  if (typeof system === "string") return system.trim();
  if (Array.isArray(system)) {
    return system
      .map((block) => (typeof block === "string" ? block : block.text || ""))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }
  return "";
}

function parseDataUri(source: AnthropicImageBlock["source"]): string {
  if (source.type === "url" && source.url) {
    return source.url;
  }
  if (source.type === "base64" && source.data) {
    const mime = source.media_type || "image/png";
    return `data:${mime};base64,${source.data}`;
  }
  return "";
}

function formatToolResultContent(
  block: AnthropicToolResultBlock,
): { text: string; images: string[] } {
  const images: string[] = [];
  if (typeof block.content === "string") {
    return { text: block.content, images };
  }
  if (Array.isArray(block.content)) {
    const textPieces: string[] = [];
    for (const item of block.content) {
      if (item.type === "text") {
        textPieces.push(item.text);
      } else if (item.type === "image") {
        const uri = parseDataUri(item.source);
        if (uri) images.push(uri);
      }
    }
    return { text: textPieces.join("\n\n"), images };
  }
  return { text: "", images };
}

function convertUserBlocks(
  blocks: AnthropicContentBlock[],
): OpenAIChatMessage[] {
  const results: OpenAIChatMessage[] = [];
  const textParts: string[] = [];
  const contentParts: OpenAIChatContentPart[] = [];
  let hasImage = false;

  for (const block of blocks) {
    if (block.type === "tool_result") {
      const { text, images } = formatToolResultContent(block);
      results.push({
        role: "tool",
        tool_call_id: block.tool_use_id,
        content: text,
      });
      for (const imgUrl of images) {
        hasImage = true;
        contentParts.push({
          type: "image_url",
          image_url: { url: imgUrl },
        });
      }
    } else if (block.type === "text") {
      if (block.text) {
        textParts.push(block.text);
        contentParts.push({ type: "text", text: block.text });
      }
    } else if (block.type === "image") {
      const uri = parseDataUri(block.source);
      if (uri) {
        hasImage = true;
        contentParts.push({
          type: "image_url",
          image_url: { url: uri },
        });
      }
    }
  }

  if (hasImage && contentParts.length > 0) {
    results.push({
      role: "user",
      content: contentParts,
    });
  } else if (textParts.length > 0) {
    results.push({
      role: "user",
      content: textParts.join("\n\n"),
    });
  }

  return results;
}

function convertAssistantBlocks(
  blocks: AnthropicContentBlock[],
): OpenAIChatMessage {
  const textPieces: string[] = [];
  const reasoningPieces: string[] = [];
  const toolCalls: OpenAIChatMessage["tool_calls"] = [];

  for (const block of blocks) {
    if (block.type === "text") {
      if (block.text) textPieces.push(block.text);
    } else if (block.type === "thinking") {
      if (block.thinking) reasoningPieces.push(block.thinking);
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments:
            typeof block.input === "string"
              ? block.input
              : JSON.stringify(block.input ?? {}),
        },
      });
    }
  }

  const message: OpenAIChatMessage = {
    role: "assistant",
    content: textPieces.length > 0 ? textPieces.join("\n\n") : null,
  };

  if (reasoningPieces.length > 0) {
    message.reasoning_content = reasoningPieces.join("\n\n");
  }

  if (toolCalls.length > 0) {
    message.tool_calls = toolCalls;
  }

  return message;
}

function convertAnthropicMessages(
  systemText: string,
  messages: AnthropicMessage[],
): OpenAIChatMessage[] {
  const out: OpenAIChatMessage[] = [];

  if (systemText) {
    out.push({
      role: "system",
      content: systemText,
    });
  }

  for (const msg of messages) {
    if (msg.role === "assistant") {
      if (typeof msg.content === "string") {
        out.push({
          role: "assistant",
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        out.push(convertAssistantBlocks(msg.content));
      }
    } else {
      // user or unknown
      if (typeof msg.content === "string") {
        out.push({
          role: "user",
          content: msg.content,
        });
      } else if (Array.isArray(msg.content)) {
        out.push(...convertUserBlocks(msg.content));
      }
    }
  }

  return out;
}

function convertAnthropicTools(tools?: AnthropicTool[]): OpenAITool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema ?? { type: "object", properties: {} },
    },
  }));
}

function convertAnthropicToolChoice(
  choice?: AnthropicToolChoice,
): OpenAIToolChoice | undefined {
  if (!choice) return undefined;
  if (choice.type === "auto") return "auto";
  if (choice.type === "any") return "required";
  if (choice.type === "none") return "none";
  if (choice.type === "tool" && choice.name) {
    return {
      type: "function",
      function: { name: choice.name },
    };
  }
  return undefined;
}

/**
 * Transpiles an Anthropic /v1/messages request to an OpenAI /v1/chat/completions request.
 */
export function transpileAnthropicToOpenAiRequest(
  req: AnthropicMessagesRequest,
): OpenAIChatRequest {
  const systemText = extractSystemText(req.system);
  const messages = convertAnthropicMessages(systemText, req.messages || []);

  const openAiReq: OpenAIChatRequest = {
    model: req.model,
    messages,
    stream: req.stream ?? false,
  };

  if (req.max_tokens !== undefined) {
    openAiReq.max_tokens = req.max_tokens;
    openAiReq.max_completion_tokens = req.max_tokens;
  }

  if (req.temperature !== undefined) {
    openAiReq.temperature = req.temperature;
  }

  if (req.top_p !== undefined) {
    openAiReq.top_p = req.top_p;
  }

  if (req.tools && req.tools.length > 0) {
    openAiReq.tools = convertAnthropicTools(req.tools);
    if (req.tool_choice) {
      openAiReq.tool_choice = convertAnthropicToolChoice(req.tool_choice);
    }
  }

  if (req.thinking?.type === "enabled") {
    const budget = req.thinking.budget_tokens ?? 4096;
    if (budget <= 2048) {
      openAiReq.reasoning_effort = "low";
    } else if (budget <= 8192) {
      openAiReq.reasoning_effort = "medium";
    } else {
      openAiReq.reasoning_effort = "high";
    }
  }

  if (req.stop_sequences && req.stop_sequences.length > 0) {
    openAiReq.stop = req.stop_sequences;
  }

  return openAiReq;
}
