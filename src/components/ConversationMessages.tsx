import BrandLogo from "./BrandLogo";
import UiIcon from "./UiIcon";

export interface ConversationMessageView {
  id: string;
  content: string;
}

export default function ConversationMessages({
  messages,
  onDelete,
  onStatus,
}: {
  messages: ConversationMessageView[];
  onDelete?: (messageId: string) => void;
  onStatus: (status: string) => void;
}) {
  if (!messages.length)
    return (
      <div className="conversation-empty">
        <span className="logo">
          <BrandLogo variant="message" />
        </span>
        <h3>从一个想法开始</h3>
        <p>描述你的创意，将灵感连接到画布。</p>
      </div>
    );
  return messages.map((message) => (
    <div key={message.id}>
      <p className="message-bubble">{message.content}</p>
      <div className="message-actions">
        <button
          aria-label="复制消息"
          onClick={() => {
            void navigator.clipboard.writeText(message.content).then(
              () => onStatus("已复制消息"),
              () => onStatus("复制失败，请手动选择文本复制。"),
            );
          }}
        >
          <UiIcon name="copy" size={14} />
        </button>
        <button
          aria-label="删除消息"
          onClick={() => onDelete?.(message.id)}
          disabled={!onDelete}
          title={onDelete ? undefined : "本地对话消息由当前面板管理"}
        >
          <UiIcon name="delete" size={14} />
        </button>
      </div>
    </div>
  ));
}
