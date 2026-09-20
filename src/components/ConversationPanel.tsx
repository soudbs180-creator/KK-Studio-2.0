import { useEffect, useRef, useState } from "react";
import StartAttachmentList from "./StartAttachmentList";
import useConversationAttachments from "./useConversationAttachments";
import type {
  CreationDraft,
  CreationProject,
} from "../features/creation/model";
import ConversationMessages from "./ConversationMessages";
import ConversationActions from "./ConversationActions";
export default function ConversationPanel({
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
}: {
  onClose: () => void;
  onOpen: (id: string) => void;
  project?: CreationProject;
  currentModel?: string;
  onModelChange?: (model: string) => void;
  modelOptions?: string[];
  onSend?: (
    message: string,
  ) => boolean | string | void | Promise<boolean | string>;
  onDeleteMessage?: (messageId: string) => void;
  composerDraft?: CreationDraft;
  onDraftChange?: (draft: CreationDraft) => void;
  voiceEnabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [approvalMode, setApprovalMode] = useState<"auto" | "ask">(
    composerDraft?.approvalMode ?? "auto",
  );
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [pluginMenuOpen, setPluginMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const modeMenuRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (!modeMenuOpen && !modelMenuOpen && !skillMenuOpen && !pluginMenuOpen)
      return;
    const onPointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setModeMenuOpen(false);
        setModelMenuOpen(false);
        setSkillMenuOpen(false);
        setPluginMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModeMenuOpen(false);
        setModelMenuOpen(false);
        setSkillMenuOpen(false);
        setPluginMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [modeMenuOpen, modelMenuOpen, skillMenuOpen, pluginMenuOpen]);
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
    <aside className="conversation-panel" data-node-id="407:29265">
      <header data-node-id="407:29267">
        <strong>{project?.name ?? "新建对话"}</strong>
        <button
          aria-label="对话记录"
          onClick={() =>
            setStatus(
              visibleMessages.length
                ? "本次会话共 " + visibleMessages.length + " 条消息。"
                : "还没有对话，输入内容开始。",
            )
          }
        >
          <img
            src="/design/figma/chat-header-history.svg"
            width="18"
            height="18"
            alt=""
          />
        </button>
        <button aria-label="收起对话" onClick={onClose}>
          <img
            src="/design/figma/chat-open.svg"
            width="18"
            height="18"
            alt=""
          />
        </button>
      </header>
      <div className="conversation-messages">
        <ConversationMessages
          messages={visibleMessages}
          onDelete={deleteMessage}
          onStatus={setStatus}
        />
        {status && (
          <p className="chat-status" role="status">
            {status}
          </p>
        )}
      </div>
      <form
        className="chat-composer"
        data-node-id="407:29310"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!input.trim()) return;
          if (readingFiles) {
            setStatus("正在读取参考素材，请稍候再提交。");
            return;
          }
          const message = input.trim();
          if (submitting) return;
          if (approvalMode === "ask" && pendingApproval !== message) {
            setPendingApproval(message);
            setStatus("任务准备就绪，确认后才会提交给模型。");
            return;
          }
          await submitMessage(message);
        }}
      >
        <textarea
          aria-label="对话内容"
          maxLength={7500}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            updateDraft({ prompt: e.target.value });
          }}
          disabled={submitting}
          placeholder="描述你想要生成的内容"
        />
        <span className="chat-attachment-list">
          <StartAttachmentList
            attachments={composerDraft?.attachments ?? []}
            onRemove={(id) =>
              updateDraft({
                attachments: (composerDraft?.attachments ?? []).filter(
                  (item) => item.id !== id,
                ),
              })
            }
          />
        </span>
        <ConversationActions
          actionsRef={actionsRef}
          fileInput={fileInput}
          onAddFiles={addFiles}
          composerDraft={composerDraft}
          submitting={submitting}
          currentModel={currentModel}
          modelOptions={modelOptions}
          modelMenuOpen={modelMenuOpen}
          onToggleModel={() => setModelMenuOpen((open) => !open)}
          onSelectModel={(option) => {
            onModelChange?.(option);
            setModelMenuOpen(false);
          }}
          onConfigureModel={() => {
            setModelMenuOpen(false);
            onOpen("settings/providers");
          }}
          onOpen={onOpen}
          skillMenuOpen={skillMenuOpen}
          onToggleSkill={() => setSkillMenuOpen((open) => !open)}
          pluginMenuOpen={pluginMenuOpen}
          onTogglePlugin={() => setPluginMenuOpen((open) => !open)}
          modeMenuRef={modeMenuRef}
          modeMenuOpen={modeMenuOpen}
          approvalMode={approvalMode}
          onToggleMode={() => setModeMenuOpen((open) => !open)}
          onSelectMode={(value) => {
            setApprovalMode(value);
            updateDraft({ approvalMode: value });
            setModeMenuOpen(false);
            setStatus(
              value === "auto"
                ? "已切换为自动模式，AI 可连续执行。"
                : "已切换为询问模式，每次执行前由你确认。",
            );
          }}
          input={input}
          onVoiceChange={(value) => {
            setInput(value);
            updateDraft({ prompt: value });
          }}
          onVoiceStatus={setStatus}
          voiceEnabled={voiceEnabled && !submitting}
          voiceSessionKey={project?.id ?? "workspace-demo"}
        />
      </form>
      {pendingApproval && (
        <div className="chat-approval" role="group" aria-label="确认执行任务">
          <span>将使用当前项目模型执行这条任务。</span>
          <button
            type="button"
            onClick={() => void submitMessage(pendingApproval)}
          >
            确认执行
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingApproval(null);
              setStatus("已取消本次执行，输入仍保留。\n");
            }}
          >
            取消
          </button>
        </div>
      )}
      <footer>请确保授权，合法使用</footer>
    </aside>
  );
}
