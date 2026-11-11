import type { ChatItem } from "../features/creation/index.ts";
import UiIcon from "./UiIcon";
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
    <header className="conversation-header" data-figma-node="2076:42222">
      <div className="conversation-header-row">
        <strong>{title}</strong>
        <div className="conversation-header-actions">
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
            <UiIcon name="history" size={16} />
          </button>
          <button
            type="button"
            className="conversation-header-close-btn"
            aria-label="收起对话"
            onClick={onClose}
          >
            <UiIcon name="panel-right-close" size={16} />
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
