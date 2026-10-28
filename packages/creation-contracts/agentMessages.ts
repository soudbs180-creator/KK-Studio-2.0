export type AgentChatRole = "user" | "assistant" | "system" | "tool" | "error";

export interface AgentCanvasReference {
  nodeId: string;
  label: string;
  title: string;
  kind: "image" | "video" | "audio" | "text";
  text?: string;
}

export interface AgentChatItem {
  id: string;
  itemId?: string;
  clientMessageId?: string;
  threadId?: string;
  turnId?: string;
  role: AgentChatRole;
  title?: string;
  text: string;
  detail?: unknown;
  canvasReferences?: AgentCanvasReference[];
  /** 工具/推理活动：key 为活动 id，value 为展示文本。 */
  activityItems?: Record<string, string>;
}

import type { CreationAttachment } from "./creation.ts";
export type AgentDraftAttachment = CreationAttachment & {
  canvasNodeId?: string;
};

export interface MemoryAgentPort {
  getState(): {
    status: string;
    connectionRevision: number;
    sending: boolean;
    conversation: { threadId: string; status: string } | null;
    messages: AgentChatItem[];
  };
  getProjectId(): string | null | undefined;
  getExecutionBlockReason(): string | undefined;
  sendMessage(
    message: string,
    options: { memoryMode: "none"; isTemporary: boolean },
  ): Promise<{ ok: boolean; error?: string; messageId?: string }>;
}
