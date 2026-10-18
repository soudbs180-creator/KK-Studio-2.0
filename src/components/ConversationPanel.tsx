import { ConversationResizeHandle } from "./ResizeHandle";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useConversationOverlay } from "./useConversationOverlay";
import useConversationAttachments from "./useConversationAttachments";
import type { CreationDraft } from "../features/creation/model";
import type { ConversationPanelProps } from "./ConversationPanel.types";
import ConversationMessageFeed from "./ConversationMessageFeed";
import ConversationChannelSelector from "./ConversationChannelSelector";
import ConversationTaskApproval from "./ConversationTaskApproval";
import ConversationHeader from "./ConversationHeader";
import ConversationComposerRegion from "./ConversationComposerRegion";
import GoogleConversationPanel from "./GoogleConversationPanel";
import ChatImageLightbox from "./chat/ChatImageLightbox.tsx";
import useConversationSubmit from "./useConversationSubmit";
import { useAgentDraftState } from "../features/agent/useAgentComposerDraft";
import useConversationSelection from "./useConversationSelection";
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
  onApplySkill,
  agent,
  onSelectChat,
  onCreateChat,
  executionDisabledReason,
  readOnlyMessages,
}: ConversationPanelProps) {
  const panelRef = useConversationOverlay(overlay);
  const agentDraftState = useAgentDraftState();
  const agentConnecting = Boolean(agent?.connecting);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">(
    composerDraft?.approvalMode ?? "auto",
  );
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    prompt?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const draftRevision = useRef(0);
  const agentBusy = Boolean(agent?.sending || agent?.connecting);
  const blocked = Boolean(executionDisabledReason);
  const modelDisabled = blocked || submitting || agentBusy;
  const draftKey = JSON.stringify([
    project?.id ?? "workspace",
    project?.activeChatId ?? null,
  ]);
  useEffect(() => setSubmitting(false), [draftKey]);
  const { channel, agentSelection, agentModel, changeChannel, selectModel } =
    useConversationSelection({
      projectId: draftKey,
      draft: composerDraft,
      locked: modelDisabled,
      patch: updateDraft,
      onApiModel: onModelChange,
      onStatus: setStatus,
    });
  const agentActive = Boolean(agent && channel === "codex" && !blocked);
  useLayoutEffect(() => {
    setInput(composerDraft?.prompt ?? "");
    setApprovalMode(composerDraft?.approvalMode ?? "auto");
    setPendingApproval(null);
    setStatus("");
  }, [draftKey, composerDraft?.prompt, composerDraft?.approvalMode]);
  const visibleMessages =
    readOnlyMessages ??
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
    if (blocked || !onDraftChange || !composerDraft) return;
    draftRevision.current++;
    onDraftChange({ ...composerDraft, ...patch, updatedAt: Date.now() });
  }
  function changeInput(prompt: string): void {
    setInput(prompt);
    updateDraft({ prompt });
  }
  const { fileInput, addFiles, readingFiles, setReference } =
    useConversationAttachments({
      draftKey,
      attachments: composerDraft?.attachments ?? [],
      onChange: (attachments) => updateDraft({ attachments }),
      onStatus: setStatus,
    });
  const handleSetReference =
    onDraftChange && composerDraft && !executionDisabledReason
      ? setReference
      : undefined;
  const title =
    project?.name && project.name !== "未命名项目" ? project.name : "KK Studio";
  const directState = getGenerationUiState({
    prompt: input,
    inputValid: !readingFiles,
    modelConfigured,
    quotaAvailable: true,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    serviceConfigured: modelConfigured,
  });
  const directDisabledReason = getDisabledReason(directState);
  const submitMessage = useConversationSubmit({
    draftKey,
    input,
    getDraftRevision: () => draftRevision.current,
    submitting,
    setSubmitting,
    agentActive,
    approvalMode,
    pendingApproval,
    setPendingApproval,
    setStatus,
    onSend: executionDisabledReason ? () => executionDisabledReason : onSend,
    onDraftChange,
    composerDraft,
    setInput,
    setMessages,
  });
  if (channel === "google" && project && !executionDisabledReason)
    return (
      <GoogleConversationPanel
        project={project}
        draftState={agentDraftState}
        onClose={onClose}
        onOpen={onOpen}
        onChannelChange={changeChannel}
        overlay={overlay}
        codexBusy={agentBusy}
        onDraftChange={updateDraft}
        onSelectChat={onSelectChat}
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
      <ConversationHeader
        title={title}
        messageCount={
          agentActive ? (agent?.messages.length ?? 0) : visibleMessages.length
        }
        onStatus={setStatus}
        onClose={onClose}
        chats={project?.chats}
        activeChatId={project?.activeChatId}
        onSelectChat={onSelectChat}
        onCreateChat={onCreateChat}
      />
      {agent && (
        <ConversationChannelSelector
          value={channel}
          disabled={blocked || agentBusy}
          onChange={changeChannel}
        />
      )}
      <ConversationMessageFeed
        agent={agent}
        agentActive={agentActive}
        messages={visibleMessages}
        onDelete={deleteMessage}
        onStatus={setStatus}
        onConfigure={() => onOpen("settings/providers")}
        onConfigureDirect={
          directState === "service-unconfigured"
            ? () => onOpen("settings/providers")
            : undefined
        }
        onPreviewImage={(src, prompt) => setPreviewImage({ src, prompt })}
        onSetReference={handleSetReference}
        status={
          executionDisabledReason ||
          status ||
          (!agentActive && input.trim() ? (directDisabledReason ?? "") : "")
        }
      />
      <ConversationComposerRegion
        agent={agent}
        draftKey={draftKey}
        draftState={agentDraftState}
        agentActive={agentActive}
        agentConnecting={agentConnecting}
        agentModel={agentModel}
        input={input}
        onInputChange={changeInput}
        onDraftChange={updateDraft}
        onSubmitMessage={submitMessage}
        disabled={blocked || submitting || (agentActive && agentBusy)}
        modelDisabled={modelDisabled}
        submitDisabled={
          blocked ||
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
            ? agentSelection
            : {
                source: "api",
                model: currentModel ?? "",
                connectionId: project?.composerDraft.providerConnectionId,
              }
        }
        onSelectModel={selectModel}
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
        voiceEnabled={voiceEnabled && !submitting && !executionDisabledReason}
        onVoiceChange={changeInput}
        onVoiceStatus={setStatus}
        voiceSessionKey={draftKey}
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
      {previewImage && (
        <ChatImageLightbox
          src={previewImage.src}
          prompt={previewImage.prompt}
          onClose={() => setPreviewImage(null)}
          onSetReference={handleSetReference}
        />
      )}
      <footer>请确保不侵权，合法使用</footer>
    </aside>
  );
}
