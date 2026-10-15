import ConversationHeader from "./ConversationHeader";
import { downloadConversationMarkdown } from "../features/conversation/conversationShare";
export default function ConversationSharingHeader({
  title,
  messages,
  messageCount = messages.length,
  onStatus,
  onClose,
}: {
  title: string;
  messages: readonly { role?: unknown; content?: string; text?: string }[];
  messageCount?: number;
  onStatus: (message: string) => void;
  onClose: () => void;
}) {
  const visible = messages.map((message) => ({
    role: typeof message.role === "string" ? message.role : "user",
    content: message.content ?? message.text ?? "",
  }));
  return (
    <ConversationHeader
      title={title}
      messageCount={messageCount}
      onStatus={onStatus}
      onClose={onClose}
      exportDisabled={
        !visible.some(
          (message) =>
            ["user", "assistant"].includes(message.role) &&
            message.content.trim(),
        )
      }
      onExport={() => {
        try {
          onStatus(
            `已导出 ${downloadConversationMarkdown({ title, messages: visible })}`,
          );
        } catch (error) {
          onStatus(error instanceof Error ? error.message : "导出失败");
        }
      }}
    />
  );
}
