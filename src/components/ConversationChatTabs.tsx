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
      className={`conversation-chat-tabs-wrapper ${className}`}
      aria-label="对话切换"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--kk-space-1)",
        width: "100%",
        minWidth: 0,
        marginTop: "var(--kk-space-1)",
      }}
    >
      <div
        ref={tablistRef}
        role="tablist"
        aria-label="项目对话列表"
        className="conversation-chat-tabs"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--kk-space-1)",
          overflowX: "auto",
          scrollbarWidth: "none",
          flex: "1 1 auto",
          minWidth: 0,
        }}
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
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "var(--kk-control-h-sm)",
                padding: "0 var(--kk-space-2)",
                borderRadius: "var(--kk-radius-sm)",
                background: isActive
                  ? "var(--kk-neutral-selected)"
                  : "transparent",
                border: "1px solid",
                borderColor: isActive
                  ? "var(--kk-border-subtle)"
                  : "transparent",
                borderBottom: isActive
                  ? "2px solid var(--kk-accent)"
                  : "1px solid transparent",
                color: isActive
                  ? "var(--kk-text-primary)"
                  : "var(--kk-text-secondary)",
                fontSize: "var(--kk-font-caption)",
                lineHeight: "var(--kk-line-caption)",
                fontWeight: isActive
                  ? "var(--kk-weight-medium)"
                  : "var(--kk-weight-regular)",
                whiteSpace: "nowrap",
                cursor: "pointer",
                flex: "0 0 auto",
                maxWidth: "140px",
              }}
            >
              <span
                className="conversation-chat-tab-label"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </span>
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
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "var(--kk-control-h-sm)",
          height: "var(--kk-control-h-sm)",
          minWidth: "var(--kk-control-h-sm)",
          borderRadius: "var(--kk-radius-xs)",
          border: "1px dashed var(--kk-border-default)",
          background: "transparent",
          color: "var(--kk-text-secondary)",
          cursor: "pointer",
          padding: 0,
          flex: "0 0 auto",
          fontSize: "var(--kk-font-subtitle)",
          lineHeight: 1,
        }}
      >
        <span className="conversation-chat-tab-add-icon" aria-hidden="true">
          +
        </span>
      </button>
    </nav>
  );
}
