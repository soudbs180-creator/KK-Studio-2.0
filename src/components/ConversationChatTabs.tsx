import { useCallback, useRef } from "react";
import type { ChatItem } from "../features/creation/model.ts";

export interface ConversationChatTabsProps {
  chats: Record<string, ChatItem>;
  activeChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onCreateChat?: () => void;
  className?: string;
}

export default function ConversationChatTabs({
  chats,
  activeChatId,
  onSelectChat,
  onCreateChat,
  className = "",
}: ConversationChatTabsProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const chatEntries = Object.entries(chats || {});

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (chatEntries.length === 0) return;
      let nextIndex: number;

      if (event.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % chatEntries.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex =
          (currentIndex - 1 + chatEntries.length) % chatEntries.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = chatEntries.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const [nextChatId] = chatEntries[nextIndex];
      onSelectChat?.(nextChatId);

      const targetButton = tablistRef.current?.children[nextIndex] as
        HTMLButtonElement | undefined;
      targetButton?.focus();
    },
    [chatEntries, onSelectChat],
  );

  if (chatEntries.length === 0) return null;

  return (
    <nav
      className={`conversation-chat-tabs-wrapper ${className}`.trim()}
      aria-label="对话切换"
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="项目对话列表"
        className="conversation-chat-tabs"
      >
        {chatEntries.map(([chatId, chat], index) => {
          const isActive = chatId === activeChatId;
          const displayName = chat.name?.trim() || `对话 ${index + 1}`;

          return (
            <button
              key={chatId}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`conversation-chat-tab ${isActive ? "active" : ""}`}
              onClick={() => onSelectChat?.(chatId)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              title={displayName}
            >
              <span className="conversation-chat-tab-label">{displayName}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="新建对话"
        title={
          onCreateChat ? "新建对话" : "多聊天隔离尚未完成，暂不可新建聊天。"
        }
        disabled={!onCreateChat}
        className="conversation-chat-tab-add"
        onClick={() => onCreateChat?.()}
      >
        <span className="conversation-chat-tab-add-icon" aria-hidden="true">
          +
        </span>
      </button>
    </nav>
  );
}
