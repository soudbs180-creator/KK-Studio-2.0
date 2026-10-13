import BrandLogo from "./BrandLogo";
import MessageMarkdown from "./MessageMarkdown";
import MessageActions from "./MessageActions";

export interface ConversationMessageView {
  id: string;
  content: string;
}

export default function ConversationMessages({
  messages,
  onDelete,
  onStatus,
  onConfigure,
}: {
  messages: ConversationMessageView[];
  onDelete?: (messageId: string) => void;
  onStatus: (status: string) => void;
  onConfigure?: () => void;
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
  return messages.map((message) => (
    <div key={message.id}>
      <MessageMarkdown className="message-bubble" content={message.content} />
      <MessageActions
        content={message.content}
        onStatus={onStatus}
        showDelete
        onDelete={onDelete ? () => onDelete(message.id) : undefined}
      />
    </div>
  ));
}
