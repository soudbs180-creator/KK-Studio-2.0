import type { AgentChatItem } from "../agent/agentTypes.ts";

/** Only accept a completed reply from the new Codex turn in the same thread. */
export function completedAssistantReply(
  messages: AgentChatItem[],
  beforeIds: ReadonlySet<string>,
  threadId: string,
  sending: boolean,
  conversationStatus: string = "ready",
): string | null {
  if (sending || !["ready", "warning"].includes(conversationStatus)) {
    return null;
  }
  const newItems = messages.filter(
    (item) => !beforeIds.has(item.id) && item.threadId === threadId,
  );
  const user = [...newItems]
    .reverse()
    .find((item) => item.role === "user" && Boolean(item.turnId));
  if (!user?.turnId) return null;
  const reply = [...newItems].reverse().find((item) => {
    const detail = item.detail as { phase?: string } | undefined;
    return (
      item.role === "assistant" &&
      item.turnId === user.turnId &&
      detail?.phase === "completed" &&
      Boolean(item.text?.trim())
    );
  });
  return reply?.text ?? null;
}
