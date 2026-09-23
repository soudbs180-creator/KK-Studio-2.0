import type { ModelSelection } from "../features/models/modelSelection";
import { useEffect, useState } from "react";
import { useConversationOverlay } from "./useConversationOverlay";
import useConversationAttachments from "./useConversationAttachments";
import type {
  CreationDraft,
  CreationProject,
} from "../features/creation/model";
import ConversationMessages from "./ConversationMessages";
import type { SkillRecord } from "../features/skills/skillRegistry";
import AgentConversationMessages, {
  type AgentConversationProps,
} from "./AgentConversationMessages";
import ConversationChannelSelector from "./ConversationChannelSelector";
import GoogleConversationPanel from "./GoogleConversationPanel";
import AgentComposer from "./AgentComposer";
import ConversationTaskApproval from "./ConversationTaskApproval";
import ConversationHeader from "./ConversationHeader";
import ConversationComposer from "./ConversationComposer";
import useConversationSubmit from "./useConversationSubmit";
import {
  readAgentModel,
  writeAgentModel,
  safeStorage,
} from "../features/agent/agentConnection";

export default function ConversationPanel({
  overlay = false,
  onClose,
  onOpen,
  project,
  currentModel,
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
}: {
  overlay?: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  project?: CreationProject;
  currentModel?: string;
  onModelChange?: (model: string, selection?: ModelSelection) => void;
  modelOptions?: string[];
  onSend?: (
    message: string,
  ) => boolean | string | void | Promise<boolean | string>;
  onDeleteMessage?: (messageId: string) => void;
  composerDraft?: CreationDraft;
  onDraftChange?: (draft: CreationDraft) => void;
  voiceEnabled?: boolean;
  skills?: SkillRecord[];
  onApplySkill?: (record: SkillRecord) => string;
  agent?: AgentConversationProps;
}) {
  const panelRef = useConversationOverlay(overlay, onClose);
  const [channel, setChannel] = useState(() =>
    ["direct", "google"].includes(safeStorage.getItem("kk-chat-channel") ?? "")
      ? safeStorage.getItem("kk-chat-channel")!
      : "codex",
  );
  const [agentModel, setAgentModel] = useState(readAgentModel);
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
        onClose={onClose}
        onOpen={onOpen}
        onChannelChange={setChannel}
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
      <ConversationHeader
        title={project?.name ?? "新建对话"}
        messageCount={
          agentActive ? (agent?.messages.length ?? 0) : visibleMessages.length
        }
        onStatus={setStatus}
        onClose={onClose}
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
      <div className="conversation-messages">
        {agentActive && agent ? (
          <AgentConversationMessages
            agent={agent}
            onConfigure={() => onOpen("settings/network")}
          />
        ) : (
          <ConversationMessages
            messages={visibleMessages}
            onDelete={deleteMessage}
            onStatus={setStatus}
          />
        )}
        {status && (
          <p className="chat-status" role="status">
            {status}
          </p>
        )}
      </div>
      <AgentComposer
        agent={agent}
        draftKey={project?.id ?? "workspace"}
        active={agentActive}
        composer={
          <ConversationComposer
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
            currentModel={
              agentActive ? agentModel || "Codex 账号默认" : currentModel
            }
            modelOptions={
              agentActive
                ? ["Codex 账号默认", ...(agent?.models ?? [])]
                : modelOptions
            }
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
            onSelectModel={(option, selection) => {
              const codex = selection
                ? selection.source !== "api"
                : agentActive;
              setChannel(codex ? "codex" : "direct");
              safeStorage.setItem(
                "kk-chat-channel",
                codex ? "codex" : "direct",
              );
              if (codex) {
                const model =
                  selection?.source === "default" || option === "Codex 账号默认"
                    ? undefined
                    : option;
                setAgentModel(model);
                writeAgentModel(model);
              } else onModelChange?.(option, selection);
            }}
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
        }
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
      <footer>请确保授权，合法使用</footer>
    </aside>
  );
}
