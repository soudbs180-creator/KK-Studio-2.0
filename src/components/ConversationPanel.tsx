import { ConversationResizeHandle } from "./ResizeHandle";
import { useEffect, useState } from "react";
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
  overlay = false, onClose, onOpen, project, currentModel, modelConfigured = false,
  onModelChange, composerDraft, onDraftChange, voiceEnabled = true, modelOptions = [],
  onSend, onDeleteMessage, skills = [], onApplySkill, agent, onSelectChat, onCreateChat,
}: ConversationPanelProps) {
  const panelRef = useConversationOverlay(overlay);
  const agentDraftState = useAgentDraftState();
  const agentConnecting = Boolean(agent?.connecting);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">(composerDraft?.approvalMode ?? "auto");
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; prompt?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const modelDisabled = submitting || Boolean(agent?.sending || agent?.connecting);
  const { channel, agentSelection, agentModel, changeChannel, selectModel } =
    useConversationSelection({
      projectId: project?.id, draft: composerDraft, locked: modelDisabled,
      patch: updateDraft, onApiModel: onModelChange, onStatus: setStatus,
    });
  const agentActive = Boolean(agent && channel === "codex");
  useEffect(() => {
    setInput(project?.composerDraft.prompt ?? "");
    setApprovalMode(project?.composerDraft.approvalMode ?? "auto");
    setPendingApproval(null);
    setStatus("");
  }, [project?.id, project?.composerDraft.prompt, project?.composerDraft.approvalMode]);
  const activeChat =
    project?.chats && project?.activeChatId
      ? project.chats[project.activeChatId]
      : undefined;
  const visibleMessages =
    activeChat?.messages ??
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
  function handleSetReference(src: string): void {
    if (!onDraftChange || !composerDraft) return;
    const existing = composerDraft.attachments || [];
    if (existing.some((att) => att.dataUrl === src)) {
      setStatus("该图片已在参考列表中");
      return;
    }
    updateDraft({
      attachments: [
        ...existing.slice(-3),
        {
          id: `chat-ref-${Date.now()}`,
          name: "生成参考图",
          mime: "image/png",
          size: 0,
          role: "主体",
          dataUrl: src,
        },
      ],
    });
    setStatus("已设为主体参考图");
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
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    serviceConfigured: modelConfigured,
  });
  const directDisabledReason = getDisabledReason(directState);
  const submitMessage = useConversationSubmit({
    submitting,
    setSubmitting,
    agentActive,
    approvalMode,
    pendingApproval,
    setPendingApproval,
    setStatus,
    onSend,
    onDraftChange,
    composerDraft,
    setInput,
    setMessages,
  });
  if (channel === "google" && project)
    return (
      <GoogleConversationPanel
        project={project}
        draftState={agentDraftState}
        onClose={onClose}
        onOpen={onOpen}
        onChannelChange={changeChannel}
        overlay={overlay}
        codexBusy={Boolean(agent?.sending || agent?.connecting)}
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
        title={
          project?.name && project.name !== "未命名项目"
            ? project.name
            : "KK Studio"
        }
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
          disabled={agent.sending || agent.connecting}
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
        onConfigureDirect={directState === "service-unconfigured" ? () => onOpen("settings/providers") : undefined}
        onPreviewImage={(src, prompt) => setPreviewImage({ src, prompt })}
        onSetReference={handleSetReference}
        status={status || (!agentActive && input.trim() ? (directDisabledReason ?? "") : "")}
      />
      <ConversationComposerRegion
        agent={agent}
        draftKey={project?.id ?? "workspace"}
        draftState={agentDraftState}
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
        modelDisabled={modelDisabled}
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
