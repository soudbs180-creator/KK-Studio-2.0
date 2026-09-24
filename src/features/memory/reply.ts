import type { AgentChatItem } from "../agent/agentTypes.ts";

/** Only accept a completed reply from the new Codex turn in the same thread. */
export function completedAssistantReply(
  messages: AgentChatItem[],
  clientMessageId: string,
  threadId: string,
  sending: boolean,
  conversationStatus: string = "ready",
): string | null {
  if (sending || !["ready", "warning"].includes(conversationStatus)) {
    return null;
  }
  const user = messages.find(
    (item) =>
      item.role === "user" &&
      item.clientMessageId === clientMessageId &&
      item.threadId === threadId &&
      Boolean(item.turnId),
  );
  if (!user?.turnId) return null;
  const reply = [...messages].reverse().find((item) => {
    const detail = item.detail as { phase?: string } | undefined;
    return (
      item.role === "assistant" &&
      item.threadId === threadId &&
      item.turnId === user.turnId &&
      detail?.phase === "completed" &&
      Boolean(item.text?.trim())
    );
  });
  return reply?.text ?? null;
}
