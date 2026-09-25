import { ConversationResizeHandle } from "./ResizeHandle";
import type { ModelSelection } from "../features/models/modelSelection";
import { useEffect, useState } from "react";
import { useConversationOverlay } from "./useConversationOverlay";
import useConversationAttachments from "./useConversationAttachments";
import type {
  CreationDraft,
  CreationProject,
} from "../features/creation/model";
import ConversationMessageFeed from "./ConversationMessageFeed";
import type { SkillRecord } from "../features/skills/skillRegistry";
import type { AgentConversationProps } from "./AgentConversationMessages";
import ConversationChannelSelector from "./ConversationChannelSelector";
import AgentComposer from "./AgentComposer";
import ConversationTaskApproval from "./ConversationTaskApproval";
import ConversationHeader from "./ConversationHeader";
import ConversationComposer from "./ConversationComposer";
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
  const panelRef = useConversationOverlay(overlay);
  const [channel, setChannel] = useState(() =>
    safeStorage.getItem("kk-chat-channel") === "direct" ? "direct" : "codex",
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
  async function submitMessage(message: string): Promise<void> {
    if (submitting) return;
    if (!agentActive && approvalMode === "ask" && pendingApproval !== message) {
      setPendingApproval(message);
      setStatus("任务准备就绪，确认后才会提交给模型。");
      return;
    }
    setSubmitting(true);
    try {
      const result = onSend ? await onSend(message) : true;
      if (result === false || typeof result === "string") {
        setStatus(
          typeof result === "string"
            ? result
            : "当前任务仍在执行，或尚未配置模型连接。",
        );
        return;
      }
      if (!onSend) setMessages((current) => [...current, message]);
      setInput("");
      setPendingApproval(null);
      updateDraft({ prompt: "" });
      setStatus(
        onSend
          ? "任务已提交，状态会显示在画布顶部。"
          : "内容已记录。连接模型供应商后，即可获取 AI 回复。",
      );
    } catch {
      setStatus("提交失败，请检查模型连接后重试。");
    } finally {
      setSubmitting(false);
    }
  }
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
          project?.name && project.name !== "未命名项目" ? project.name : "聊天"
        }
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
      <ConversationMessageFeed
        agent={agent}
        agentActive={agentActive}
        messages={visibleMessages}
        onDelete={deleteMessage}
        onStatus={setStatus}
        onConfigure={() => onOpen("settings/partners")}
        status={status}
      />
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
