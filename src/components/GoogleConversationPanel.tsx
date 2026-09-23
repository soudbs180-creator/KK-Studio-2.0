import { useRef, useState, useSyncExternalStore } from "react";
import type { CreationProject } from "../features/creation/model";
import { googleAgentConnection } from "../features/agent/googleAgentConnection";
import AgentConversationMessages, {
  type AgentConversationProps,
} from "./AgentConversationMessages";
import AgentComposer from "./AgentComposer";
import ConversationComposer from "./ConversationComposer";
import ConversationHeader from "./ConversationHeader";
import ConversationChannelSelector from "./ConversationChannelSelector";
import GoogleAgentControls from "./GoogleAgentControls";
import { useConversationOverlay } from "./useConversationOverlay";

export default function GoogleConversationPanel({
  project,
  onClose,
  onOpen,
  onChannelChange,
  overlay,
  codexBusy,
}: {
  project: CreationProject;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChannelChange: (channel: string) => void;
  overlay?: boolean;
  codexBusy: boolean;
}) {
  const state = useSyncExternalStore(
    googleAgentConnection.subscribe,
    googleAgentConnection.getState,
  );
  const panelRef = useConversationOverlay(overlay ?? false, onClose);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const agent: AgentConversationProps = {
    displayName: "Google Gemini",
    intro: "使用已配置的 Google API Key 对话、理解参考图片或生成图片。",
    hideUsage: true,
    connectionRevision: state.connectionRevision,
    conversation: null,
    preparing: false,
    connected: state.status === "connected",
    connecting: state.status === "connecting",
    sending: state.sending,
    error: state.error,
    models: state.models,
    usage: [],
    onRefreshUsage: () => {},
    onConnect: (fresh) => {
      void googleAgentConnection.connect(fresh);
    },
    activity: state.activity,
    messages: state.messages,
    pendingApproval: state.pendingApproval,
    permissionMode: state.permissionMode,
    onPermissionModeChange: googleAgentConnection.setPermissionMode,
    canvasImages: project.items.filter(
      (item) => item.kind === "image" && item.assetId,
    ),
    onSend: googleAgentConnection.sendMessage,
    onInterrupt: googleAgentConnection.interrupt,
    onDecision: googleAgentConnection.resolveApproval,
  };
  return (
    <aside
      ref={panelRef}
      className="conversation-panel"
      data-node-id="407:29265"
      data-overlay={overlay}
    >
      <ConversationHeader
        title={project.name}
        messageCount={state.messages.length}
        onStatus={setStatus}
        onClose={onClose}
      />
      <ConversationChannelSelector
        value="google"
        disabled={codexBusy || state.sending || state.status === "connecting"}
        onChange={onChannelChange}
      />
      <GoogleAgentControls state={state} />
      <div className="conversation-messages">
        <AgentConversationMessages
          agent={agent}
          onConfigure={() => onOpen("settings/providers")}
        />
        {status && (
          <p className="chat-status" role="status">
            {status}
          </p>
        )}
      </div>
      <AgentComposer
        agent={agent}
        draftKey={`google-${project.id}`}
        active
        composer={
          <ConversationComposer
            input=""
            onInputChange={() => {}}
            onSubmitMessage={async () => {}}
            disabled={state.sending}
            placeholder="和 Google 聊天，或切换到图片模式生成图片"
            fileInput={fileRef}
            onAddFiles={() => {}}
            onRemoveAttachment={() => {}}
            readingFiles={0}
            onStatus={setStatus}
            modelControl={
              <span className="chat-model-name">Google Gemini</span>
            }
            onSelectModel={() => {}}
            onOpen={onOpen}
            approvalMode={state.permissionMode === "request" ? "ask" : "auto"}
            onSelectMode={(value) =>
              googleAgentConnection.setPermissionMode(
                value === "ask" ? "request" : "automatic",
              )
            }
            voiceEnabled={!state.sending}
            onVoiceChange={() => {}}
            onVoiceStatus={setStatus}
            voiceSessionKey={`google-${project.id}`}
          />
        }
      />
    </aside>
  );
}
