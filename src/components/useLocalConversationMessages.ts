import { useState } from "react";
import type { ConversationPanelProps } from "./ConversationPanel.types";

export function useLocalConversationMessages({
  project,
  readOnlyMessages,
  onDeleteMessage,
}: Pick<
  ConversationPanelProps,
  "project" | "readOnlyMessages" | "onDeleteMessage"
>) {
  const [messages, setMessages] = useState<string[]>([]);
  const visibleMessages =
    readOnlyMessages ??
    project?.messages ??
    messages.map((content, index) => ({ id: `local-${index}`, content }));
  const deleteMessage =
    onDeleteMessage ??
    ((messageId: string) => {
      const index = Number(messageId.replace("local-", ""));
      setMessages((current) =>
        current.filter((_, itemIndex) => itemIndex !== index),
      );
    });
  return { visibleMessages, deleteMessage, setMessages };
}
