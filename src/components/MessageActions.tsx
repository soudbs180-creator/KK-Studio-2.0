import { useEffect, useState } from "react";
import UiIcon from "./UiIcon";
import { copyMessageText } from "../features/conversation/conversationShare.ts";

export default function MessageActions({
  content,
  onStatus,
  onDelete,
  showDelete = false,
}: {
  content: string;
  onStatus?: (message: string) => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  useEffect(() => setFeedback(null), [content]);
  async function copy(): Promise<void> {
    if (copying) return;
    setCopying(true);
    try {
      const result = await copyMessageText(content);
      setFeedback(result);
      onStatus?.(result.message);
    } finally {
      setCopying(false);
    }
  }
  return (
    <div className="message-actions">
      <button
        type="button"
        aria-label="复制消息"
        title="复制消息原文"
        disabled={copying}
        aria-busy={copying}
        onClick={() => void copy()}
      >
        <UiIcon name="copy" size={16} />
      </button>
      {showDelete && (
        <button
          type="button"
          aria-label="删除消息"
          onClick={onDelete}
          disabled={!onDelete}
          title={onDelete ? undefined : "本地对话消息由当前面板管理"}
        >
          <UiIcon name="delete" size={16} />
        </button>
      )}
      {!onStatus && feedback && (
        <span
          className="message-action-feedback"
          role={feedback.ok ? "status" : "alert"}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
}
