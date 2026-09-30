import ConversationMessages, {
  type ConversationMessageView,
} from "./ConversationMessages";
import AgentConversationMessages, {
  type AgentConversationProps,
} from "./AgentConversationMessages";

export default function ConversationMessageFeed({
  agent,
  agentActive,
  messages,
  onDelete,
  onStatus,
  onConfigure,
  onConfigureDirect,
  status,
}: {
  agent?: AgentConversationProps;
  agentActive: boolean;
  messages: ConversationMessageView[];
  onDelete: (messageId: string) => void;
  onStatus: (status: string) => void;
  onConfigure: () => void;
  onConfigureDirect?: () => void;
  status: string;
}) {
  return (
    <div className="conversation-messages">
      {agentActive && agent ? (
        <AgentConversationMessages agent={agent} onConfigure={onConfigure} />
      ) : (
        <ConversationMessages
          messages={messages}
          onDelete={onDelete}
          onStatus={onStatus}
          onConfigure={onConfigureDirect}
        />
      )}
      {status && (
        <p className="chat-status" role="status">
          {status}
        </p>
      )}
      {!agentActive && messages.length > 0 && onConfigureDirect && (
        <div className="chat-agent-controls">
          <button type="button" onClick={onConfigureDirect}>
            前往模型设置
          </button>
        </div>
      )}
    </div>
  );
}
