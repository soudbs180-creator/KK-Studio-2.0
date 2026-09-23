export default function ConversationHeader({
  title,
  messageCount,
  onStatus,
  onClose,
}: {
  title: string;
  messageCount: number;
  onStatus: (message: string) => void;
  onClose: () => void;
}) {
  return (
    <header data-node-id="407:29267">
      <strong>{title}</strong>
      <button
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
      <button aria-label="收起对话" onClick={onClose}>
        <img src="/design/figma/chat-open.svg" width="18" height="18" alt="" />
      </button>
    </header>
  );
}
