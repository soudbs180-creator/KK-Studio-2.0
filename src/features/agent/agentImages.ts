import type { AgentChatItem } from "./agentTypes.ts";
const sourceLabel = "KK 生成来源";

/** 使用服务端已持久化的消息元数据，重连后仍可按项目和 turn 恢复来源。 */
export function canvasGenerationMetadata(
  projectId: string,
  nodeId: string,
  kind: "image" | "text",
): Pick<AgentChatItem, "canvasReferences"> {
  return {
    canvasReferences: [
      { nodeId, kind, label: sourceLabel, title: nodeId, text: projectId },
    ],
  };
}

export function generatedImageSource(
  history: AgentChatItem[],
  image: AgentChatItem,
  projectId: string,
): string | undefined {
  if (!image.threadId || !image.turnId) return undefined;
  return history
    .find(
      (item) =>
        item.role === "user" &&
        item.threadId === image.threadId &&
        item.turnId === image.turnId,
    )
    ?.canvasReferences?.find(
      (reference) =>
        reference.label === sourceLabel &&
        reference.text === projectId &&
        reference.kind === "image",
    )?.nodeId;
}

export function generatedImageItems(
  messages: AgentChatItem[],
): AgentChatItem[] {
  return messages.filter((message) => {
    const detail = message.detail as
      { kind?: string; status?: string; savedPath?: string } | undefined;
    return (
      detail?.kind === "image" &&
      detail.status === "completed" &&
      typeof detail.savedPath === "string" &&
      Boolean(detail.savedPath)
    );
  });
}
export function generatedImageId(threadId: string, itemId: string): string {
  return `codex-${threadId}-${itemId}`;
}
