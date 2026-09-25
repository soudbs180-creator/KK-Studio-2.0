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
  status,
}: {
  agent?: AgentConversationProps;
  agentActive: boolean;
  messages: ConversationMessageView[];
  onDelete: (messageId: string) => void;
  onStatus: (status: string) => void;
  onConfigure: () => void;
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
        />
      )}
      {status && (
        <p className="chat-status" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
