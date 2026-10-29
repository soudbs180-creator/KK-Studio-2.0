import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { CreationDraft } from "../features/creation/index.ts";

export type ConversationSend = (
  message: string,
) => boolean | string | void | Promise<boolean | string>;

interface UseConversationSubmitOptions {
  draftKey: string;
  input: string;
  getDraftRevision: () => number;
  submitting: boolean;
  setSubmitting: (value: boolean) => void;
  agentActive: boolean;
  approvalMode: "auto" | "ask";
  pendingApproval: string | null;
  setPendingApproval: (value: string | null) => void;
  setStatus: (value: string) => void;
  onSend?: ConversationSend;
  onDraftChange?: (draft: CreationDraft, expected?: CreationDraft) => void;
  composerDraft?: CreationDraft;
  setInput: (value: string) => void;
  setMessages: Dispatch<SetStateAction<string[]>>;
}

function finishSubmitSuccess(
  options: UseConversationSubmitOptions,
  latest: UseConversationSubmitOptions,
  message: string,
  revision: number,
  sentDraft: CreationDraft | undefined,
  sentSignature: string,
  isCurrent: () => boolean,
): void {
  const clearVisibleDraft =
    isCurrent() &&
    latest.getDraftRevision() === revision &&
    latest.input === options.input &&
    JSON.stringify(latest.composerDraft) === sentSignature;
  if (options.onDraftChange && sentDraft)
    options.onDraftChange(
      { ...sentDraft, prompt: "", updatedAt: Date.now() },
      sentDraft,
    );
  if (!isCurrent()) return;
  if (!options.onSend) options.setMessages((current) => [...current, message]);
  if (clearVisibleDraft) {
    options.setInput("");
    options.setPendingApproval(null);
  }
  options.setStatus(
    options.onSend
      ? "任务已提交，状态会显示在画布顶部。"
      : "内容已记录。连接模型接入后，即可获取 AI 回复。",
  );
}

export default function useConversationSubmit(
  options: UseConversationSubmitOptions,
) {
  const latest = useRef(options);
  latest.current = options;
  const scope = useRef({ key: options.draftKey, pending: false });
  if (scope.current.key !== options.draftKey)
    scope.current = { key: options.draftKey, pending: false };
  const renderedScope = scope.current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = () => mounted.current && scope.current === renderedScope;
  return async function submitMessage(message: string): Promise<void> {
    if (!isCurrent() || options.submitting || renderedScope.pending) return;
    if (
      !options.agentActive &&
      options.approvalMode === "ask" &&
      options.pendingApproval !== message
    ) {
      options.setPendingApproval(message);
      options.setStatus("任务准备就绪，确认后才会提交给模型。");
      return;
    }
    renderedScope.pending = true;
    const revision = options.getDraftRevision();
    const sentDraft = options.composerDraft;
    const sentSignature = JSON.stringify(sentDraft);
    options.setSubmitting(true);
    try {
      const result = options.onSend ? await options.onSend(message) : true;
      if (result === false || typeof result === "string") {
        if (!isCurrent()) return;
        options.setStatus(
          typeof result === "string"
            ? result
            : "当前任务仍在执行，或尚未配置模型连接。",
        );
        return;
      }
      finishSubmitSuccess(
        options,
        latest.current,
        message,
        revision,
        sentDraft,
        sentSignature,
        isCurrent,
      );
    } catch {
      if (isCurrent()) options.setStatus("提交失败，请检查模型连接后重试。");
    } finally {
      renderedScope.pending = false;
      if (isCurrent()) options.setSubmitting(false);
    }
  };
}
