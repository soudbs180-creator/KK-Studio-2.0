import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CreationProject } from "../features/creation/model";
import { googleAgentConnection } from "../features/agent/googleAgentConnection";
import { readGoogleCliPreference } from "../features/agent/googleAgentConfig";
import type { AgentDraftState } from "../features/agent/useAgentComposerDraft";
import AgentConversationMessages, {
  type AgentConversationProps,
} from "./AgentConversationMessages";
import AgentComposer from "./AgentComposer";
import ConversationComposer from "./ConversationComposer";
import ConversationHeader from "./ConversationHeader";
import ConversationChannelSelector from "./ConversationChannelSelector";
import GoogleAgentControls from "./GoogleAgentControls";
import GoogleModelPicker from "./GoogleModelPicker";
import { useConversationOverlay } from "./useConversationOverlay";

export default function GoogleConversationPanel({
  project,
  draftState,
  onClose,
  onOpen,
  onChannelChange,
  overlay,
  codexBusy,
  onDraftChange,
  onSelectChat,
}: {
  project: CreationProject;
  draftState: AgentDraftState;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChannelChange: (channel: string) => void;
  overlay?: boolean;
  codexBusy: boolean;
  onDraftChange: (
    patch: Partial<import("../features/creation/model").CreationDraft>,
  ) => void;
  onSelectChat?: (chatId: string) => void;
}) {
  const state = useSyncExternalStore(
    googleAgentConnection.subscribe,
    googleAgentConnection.getState,
  );
  useEffect(() => {
    const preference = readGoogleCliPreference();
    googleAgentConnection.configure(preference);
  }, []);
  const cli = state.settings.loginMode === "cli";
  const panelRef = useConversationOverlay(overlay ?? false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const agent: AgentConversationProps = {
    displayName: "Google Gemini",
    intro: cli
      ? "通过本机 Gemini CLI（Google 账号登录）免 API Key 对话。"
      : "使用已配置的 Google API Key 对话、理解参考图片或生成图片。",
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
    freshDisabledReason: project.chats
      ? "当前聊天的会话不能被替换；请继续当前聊天。"
      : undefined,
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
        chats={project.chats}
        activeChatId={project.activeChatId}
        onSelectChat={onSelectChat}
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
        draftKey={JSON.stringify([project.id, project.activeChatId ?? null])}
        onDraftChange={onDraftChange}
        draftState={draftState}
        active
        composer={
          <ConversationComposer
            input=""
            composerDraft={project.composerDraft}
            onInputChange={() => {}}
            onSubmitMessage={async () => {}}
            disabled={state.sending}
            modelDisabled={state.sending || state.status === "connecting"}
            placeholder={
              cli
                ? "和 Google 聊天（Gemini CLI 通道，仅文字）"
                : "和 Google 聊天，或切换到图片模式生成图片"
            }
            fileInput={fileRef}
            onAddFiles={() => {}}
            onRemoveAttachment={() => {}}
            readingFiles={0}
            onStatus={setStatus}
            renderModelControl={(open, onToggle, onClose) => (
              <GoogleModelPicker
                state={state}
                open={open}
                onToggle={onToggle}
                onClose={onClose}
              />
            )}
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
            voiceSessionKey={JSON.stringify([
              project.id,
              project.activeChatId ?? null,
            ])}
          />
        }
      />
    </aside>
  );
}
