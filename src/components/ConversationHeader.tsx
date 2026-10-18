import type { ChatItem } from "../features/creation/model.ts";
import ConversationChatTabs from "./ConversationChatTabs.tsx";

export interface ConversationHeaderProps {
  title: string;
  messageCount: number;
  onStatus: (message: string) => void;
  onClose: () => void;
  chats?: Record<string, ChatItem>;
  activeChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onCreateChat?: () => void;
}

export default function ConversationHeader({
  title,
  messageCount,
  onStatus,
  onClose,
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
}: ConversationHeaderProps) {
  const hasMultipleChats = Boolean(chats && Object.keys(chats).length > 0);

  return (
    <header
      data-node-id="407:29267"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--kk-space-1)",
        height: "auto",
        minHeight: "var(--kk-control-h-md)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          position: "relative",
        }}
      >
        <strong>{title}</strong>
        <div
          className="conversation-header-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--kk-space-2)",
          }}
        >
          <button
            type="button"
            className="conversation-header-history-btn"
            aria-label="对话记录"
            onClick={() =>
              onStatus(
                messageCount
                  ? "本次会话共 " + messageCount + " 条消息。"
                  : "还没有对话，输入内容开始。",
              )
            }
          >
            <img
              src="/design/figma/chat-header-history.svg"
              width="18"
              height="18"
              alt=""
            />
          </button>
          <button
            type="button"
            className="conversation-header-close-btn"
            aria-label="收起对话"
            onClick={onClose}
          >
            <img
              src="/design/figma/chat-open.svg"
              width="18"
              height="18"
              alt=""
            />
          </button>
        </div>
      </div>
      {hasMultipleChats && (
        <ConversationChatTabs
          chats={chats!}
          activeChatId={activeChatId}
          onSelectChat={onSelectChat}
          onCreateChat={onCreateChat}
        />
      )}
    </header>
  );
}
