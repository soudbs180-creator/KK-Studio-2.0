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
import AssistantPicker from "./AssistantPicker";
import type { SkillRegistry } from "../features/skills/skillRegistry";
import { composeAssistantPrompt } from "../features/assistants/assistantProfiles";
import { downloadConversationMarkdown } from "../features/conversation/conversationShare";

export default function GoogleConversationPanel({
  project,
  draftState,
  onClose,
  onOpen,
  onChannelChange,
  overlay,
  codexBusy,
  assistantRegistry,
  assistantId,
  onAssistantChange,
}: {
  project: CreationProject;
  draftState: AgentDraftState;
  onClose: () => void;
  onOpen: (id: string) => void;
  onChannelChange: (channel: string) => void;
  overlay?: boolean;
  codexBusy: boolean;
  assistantRegistry?: SkillRegistry;
  assistantId?: string;
  onAssistantChange: (id: string | undefined) => void;
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
    activity: state.activity,
    messages: state.messages,
    pendingApproval: state.pendingApproval,
    permissionMode: state.permissionMode,
    onPermissionModeChange: googleAgentConnection.setPermissionMode,
    canvasImages: project.items.filter(
      (item) => item.kind === "image" && item.assetId,
    ),
    onSend: async (message, attachments) => {
      try {
        const record = assistantId
          ? assistantRegistry?.getRecord(assistantId)
          : undefined;
        if (assistantId && !record)
          throw new Error("所选助手不可用，请重新选择。");
        return await googleAgentConnection.sendMessage(
          composeAssistantPrompt(message, record),
          attachments,
        );
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "助手不可用",
        };
      }
    },
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
        exportDisabled={
          !state.messages.some((item) =>
            ["user", "assistant"].includes(item.role),
          )
        }
        onExport={() => {
          try {
            setStatus(
              `已导出 ${downloadConversationMarkdown({ title: project.name, messages: state.messages.map((item) => ({ role: item.role, content: item.text })) })}`,
            );
          } catch (error) {
            setStatus(error instanceof Error ? error.message : "导出失败");
          }
        }}
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
      {assistantRegistry && (
        <AssistantPicker
          registry={assistantRegistry}
          selectedId={assistantId}
          onSelect={onAssistantChange}
          onStatus={setStatus}
          disabled={state.sending || state.status === "connecting"}
        />
      )}
      <AgentComposer
        agent={agent}
        draftKey={`google-${project.id}`}
        draftState={draftState}
        active
        composer={
          <ConversationComposer
            input=""
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
            voiceSessionKey={`google-${project.id}`}
          />
        }
      />
    </aside>
  );
}
