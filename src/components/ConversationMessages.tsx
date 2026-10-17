import BrandLogo from "./BrandLogo";
import UiIcon from "./UiIcon";
import ChatImageCard from "./chat/ChatImageCard.tsx";

export interface ConversationMessageView {
  id: string;
  content: string;
}

export default function ConversationMessages({
  messages,
  onDelete,
  onStatus,
  onConfigure,
  onPreviewImage,
  onSetReference,
}: {
  messages: ConversationMessageView[];
  onDelete?: (messageId: string) => void;
  onStatus: (status: string) => void;
  onConfigure?: () => void;
  onPreviewImage?: (src: string, prompt?: string) => void;
  onSetReference?: (src: string) => void;
}) {
  if (!messages.length)
    return (
      <div className="conversation-empty">
        <span className="logo">
          <BrandLogo variant="message" />
        </span>
        <h3>从一个想法开始</h3>
        <p>描述你的创意，将灵感连接到画布。</p>
        {onConfigure && (
          <div className="chat-agent-controls">
            <button type="button" onClick={onConfigure}>
              前往模型设置
            </button>
          </div>
        )}
      </div>
    );
  return messages.map((message) => {
    const imgMatch = message.content.match(/!\[(.*?)\]\((.*?)\)/);
    const cleanContent = imgMatch
      ? message.content.replace(imgMatch[0], "").trim()
      : message.content;
    const imageUrl = imgMatch?.[2];

    return (
      <div key={message.id}>
        {cleanContent ? <p className="message-bubble">{cleanContent}</p> : null}
        {imageUrl ? (
          <ChatImageCard
            src={imageUrl}
            alt={imgMatch?.[1] || "生成图片"}
            prompt={cleanContent}
            onPreview={(src) =>
              onPreviewImage
                ? onPreviewImage(src, cleanContent)
                : window.open(src, "_blank")
            }
            onSetReference={onSetReference}
          />
        ) : null}
        <div className="message-actions">
          <button
            aria-label="复制消息"
            onClick={() => {
              void navigator.clipboard
                .writeText(cleanContent || message.content)
                .then(
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
    );
  });
}
