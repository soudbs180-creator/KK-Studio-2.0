import { ConversationResizeHandle } from "./ResizeHandle";
import { useEffect, useState } from "react";
import { useConversationOverlay } from "./useConversationOverlay";
import useConversationAttachments from "./useConversationAttachments";
import type { CreationDraft } from "../features/creation/model";
import type { ConversationPanelProps } from "./ConversationPanel.types";
import ConversationMessageFeed from "./ConversationMessageFeed";
import ConversationChannelSelector from "./ConversationChannelSelector";
import ConversationTaskApproval from "./ConversationTaskApproval";
import ConversationSharingHeader from "./ConversationSharingHeader";
import ConversationComposerRegion from "./ConversationComposerRegion";
import AssistantPicker from "./AssistantPicker";
import ConversationAlternateChannel from "./ConversationAlternateChannel";
import useConversationAssistant from "./useConversationAssistant";
import useConversationSubmit from "./useConversationSubmit";
import useConversationChannel from "./useConversationChannel";
import { isStrictLoopbackProviderUrl } from "../domain/modelProvider";
import { readProviderConnections } from "../features/creation/providerRegistry";
import {
  canSubmitGeneration,
  getDisabledReason,
  getGenerationUiState,
} from "../domain/uiGovernance";
export default function ConversationPanel({
  overlay = false,
  onClose,
  onOpen,
  project,
  currentModel,
  modelConfigured = false,
  onModelChange,
  composerDraft,
  onDraftChange,
  voiceEnabled = true,
  modelOptions = [],
  onSend,
  onDeleteMessage,
  skills = [],
  assistantRegistry,
  onProviderConversation,
  onCancelTask,
  onApplySkill,
  agent,
}: ConversationPanelProps) {
  const panelRef = useConversationOverlay(overlay);
  const { channel, setChannel, agentModel, onSelectModel } =
    useConversationChannel(Boolean(agent), onModelChange);
  const agentActive = Boolean(agent && channel === "codex");
  const agentConnecting = Boolean(agent?.connecting);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">(
    composerDraft?.approvalMode ?? "auto",
  );
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selectedAssistant = composerDraft?.assistantId;
  const { compose, assistantAgent } = useConversationAssistant(
    assistantRegistry,
    selectedAssistant,
    agent,
  );
  useEffect(() => {
    setInput(project?.composerDraft.prompt ?? "");
    setApprovalMode(project?.composerDraft.approvalMode ?? "auto");
    setPendingApproval(null);
    setStatus("");
  }, [
    project?.id,
    project?.composerDraft.prompt,
    project?.composerDraft.approvalMode,
  ]);
  const visibleMessages =
    project?.messages ??
    messages.map((content, index) => ({ id: `local-${index}`, content }));
  const deleteMessage =
    onDeleteMessage ??
    ((messageId: string) => {
      const index = Number(messageId.replace("local-", ""));
      setMessages((current) =>
        current.filter((_, itemIndex) => itemIndex !== index),
      );
    });
  function updateDraft(patch: Partial<CreationDraft>): void {
    if (!onDraftChange || !composerDraft) return;
    onDraftChange({ ...composerDraft, ...patch, updatedAt: Date.now() });
  }
  const { fileInput, addFiles, readingFiles } = useConversationAttachments({
    draftKey: project?.id,
    attachments: composerDraft?.attachments ?? [],
    onChange: (attachments) => updateDraft({ attachments }),
    onStatus: setStatus,
  });
  const directState = getGenerationUiState({
    prompt: input,
    inputValid: !readingFiles,
    modelConfigured,
    quotaAvailable: true,
    online:
      typeof navigator === "undefined" ||
      navigator.onLine ||
      isStrictLoopbackProviderUrl(
        readProviderConnections().find(
          (connection) => connection.id === composerDraft?.providerConnectionId,
        )?.baseUrl ??
          project?.providerBaseUrl ??
          "",
      ),
    serviceConfigured: modelConfigured,
  });
  const directDisabledReason = getDisabledReason(directState);
  const title =
    project?.name && project.name !== "未命名项目" ? project.name : "KK Studio";
  const submitMessage = useConversationSubmit({
    submitting,
    setSubmitting,
    agentActive,
    approvalMode,
    pendingApproval,
    setPendingApproval,
    setStatus,
    onSend: onSend ? (message) => onSend(compose(message)) : undefined,
    onDraftChange,
    composerDraft,
    setInput,
    setMessages,
  });
  if (
    project &&
    (channel === "google" ||
      (channel === "models" && onProviderConversation && onCancelTask))
  )
    return (
      <ConversationAlternateChannel
        key={project.id + channel}
        {...{
          channel,
          project,
          onClose,
          onOpen,
          overlay,
          assistantRegistry,
          onProviderConversation,
          onCancelTask,
          onChannelChange: setChannel,
          onPatch: updateDraft,
          channelBusy: Boolean(agent?.sending || agent?.connecting),
        }}
      />
    );
  return (
    <aside
      ref={panelRef}
      className="conversation-panel"
      data-node-id="407:29265"
      data-overlay={overlay}
    >
      <ConversationResizeHandle />
      <ConversationSharingHeader
        title={title}
        messageCount={
          agentActive ? (agent?.messages.length ?? 0) : visibleMessages.length
        }
        onStatus={setStatus}
        onClose={onClose}
        messages={agentActive ? (agent?.messages ?? []) : visibleMessages}
      />
      {agent && (
        <ConversationChannelSelector
          value={channel}
          disabled={agent.sending || agent.connecting}
          onChange={(value) => {
            setChannel(value);
            setStatus("");
          }}
        />
      )}
      <ConversationMessageFeed
        agent={agent}
        agentActive={agentActive}
        messages={visibleMessages}
        onDelete={deleteMessage}
        onStatus={setStatus}
        onConfigure={() => onOpen("settings/partners")}
        onConfigureDirect={
          directState === "service-unconfigured"
            ? () => onOpen("settings/providers")
            : undefined
        }
        status={
          status ||
          (!agentActive && input.trim() ? (directDisabledReason ?? "") : "")
        }
      />
      {assistantRegistry && (
        <AssistantPicker
          registry={assistantRegistry}
          selectedId={selectedAssistant}
          onSelect={(assistantId) => updateDraft({ assistantId })}
          onStatus={setStatus}
          disabled={submitting || Boolean(agent?.sending)}
        />
      )}
      <ConversationComposerRegion
        agent={assistantAgent}
        draftKey={project?.id ?? "workspace"}
        agentActive={agentActive}
        agentConnecting={agentConnecting}
        agentModel={agentModel}
        input={input}
        onInputChange={(value) => {
          setInput(value);
          updateDraft({ prompt: value });
        }}
        onSubmitMessage={submitMessage}
        disabled={
          submitting ||
          (agentActive && (agentConnecting || Boolean(agent?.sending)))
        }
        submitDisabled={
          submitting ||
          (!agentActive &&
            (!canSubmitGeneration(directState) || readingFiles > 0))
        }
        placeholder={
          agentActive
            ? "描述任务，Agent 会读取画布并执行操作"
            : "描述你想要生成的内容"
        }
        composerDraft={composerDraft}
        onRemoveAttachment={(id) =>
          updateDraft({
            attachments: (composerDraft?.attachments ?? []).filter(
              (item) => item.id !== id,
            ),
          })
        }
        fileInput={fileInput}
        onAddFiles={addFiles}
        readingFiles={readingFiles}
        onStatus={setStatus}
        currentModel={currentModel}
        modelOptions={modelOptions}
        modelSelection={
          agentActive
            ? {
                source: agentModel ? "codex" : "default",
                model: agentModel ?? "",
              }
            : {
                source: "api",
                model: currentModel ?? "",
                connectionId: project?.composerDraft.providerConnectionId,
              }
        }
        onSelectModel={onSelectModel}
        onOpen={onOpen}
        skills={skills}
        onApplySkill={onApplySkill}
        approvalMode={
          agentActive
            ? agent?.permissionMode === "request"
              ? "ask"
              : "auto"
            : approvalMode
        }
        onSelectMode={(value) => {
          if (agentActive) {
            agent?.onPermissionModeChange(
              value === "ask" ? "request" : "automatic",
            );
            setApprovalMode(value);
            return;
          }
          setApprovalMode(value);
          updateDraft({ approvalMode: value });
        }}
        voiceEnabled={voiceEnabled && !submitting}
        onVoiceChange={(value) => {
          setInput(value);
          updateDraft({ prompt: value });
        }}
        onVoiceStatus={setStatus}
        voiceSessionKey={project?.id ?? "workspace-demo"}
      />
      {!agentActive && pendingApproval && (
        <ConversationTaskApproval
          onConfirm={() => void submitMessage(pendingApproval)}
          onCancel={() => {
            setPendingApproval(null);
            setStatus("已取消本次执行，输入仍保留。");
          }}
        />
      )}
      <footer>请确保不侵权，合法使用</footer>
    </aside>
  );
}
