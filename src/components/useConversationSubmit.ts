import type { Dispatch, SetStateAction } from "react";
import type { CreationDraft } from "../features/creation/model";

export default function useConversationSubmit(options: {
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  agentActive: boolean;
  approvalMode: "auto" | "ask";
  pendingApproval: string | null;
  setPendingApproval: (value: string | null) => void;
  setStatus: (value: string) => void;
  onSend?: (
    message: string,
  ) => boolean | string | void | Promise<boolean | string>;
  onDraftChange?: (draft: CreationDraft) => void;
  composerDraft?: CreationDraft;
  setInput: (value: string) => void;
  setMessages: Dispatch<SetStateAction<string[]>>;
}) {
  return async function submitMessage(message: string): Promise<void> {
    if (options.submitting) return;
    if (
      !options.agentActive &&
      options.approvalMode === "ask" &&
      options.pendingApproval !== message
    ) {
      options.setPendingApproval(message);
      options.setStatus("任务准备就绪，确认后才会提交给模型。");
      return;
    }
    options.setSubmitting(true);
    try {
      const result = options.onSend ? await options.onSend(message) : true;
      if (result === false || typeof result === "string") {
        options.setStatus(
          typeof result === "string"
            ? result
            : "当前任务仍在执行，或尚未配置模型连接。",
        );
        return;
      }
      if (!options.onSend)
        options.setMessages((current) => [...current, message]);
      options.setInput("");
      options.setPendingApproval(null);
      if (options.onDraftChange && options.composerDraft)
        options.onDraftChange({
          ...options.composerDraft,
          prompt: "",
          updatedAt: Date.now(),
        });
      options.setStatus(
        options.onSend
          ? "任务已提交，状态会显示在画布顶部。"
          : "内容已记录。连接模型供应商后，即可获取 AI 回复。",
      );
    } catch {
      options.setStatus("提交失败，请检查模型连接后重试。");
    } finally {
      options.setSubmitting(false);
    }
  };
}
