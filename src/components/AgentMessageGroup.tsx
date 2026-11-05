import type { AgentChatItem } from "../features/agent/index.ts";
import AgentExecutionProcess from "./AgentExecutionProcess";
import ChatImageCard from "./chat/ChatImageCard.tsx";
import RewindMessageAction from "./RewindMessageAction.tsx";

export default function AgentMessageGroup({
  onRewind,
  disabled,
  items,
  onPreviewImage,
  onSetReference,
}: {
  items: AgentChatItem[];
  onRewind?: (messageId: string) => Promise<void>;
  disabled?: boolean;
  onPreviewImage?: (src: string, prompt?: string) => void;
  onSetReference?: (src: string) => void;
}) {
  const item = items[0];
  if (item.role === "tool") {
    return <AgentExecutionProcess items={items} />;
  }
  const detail = item.detail as
    | { kind?: string; status?: string; savedPath?: string; url?: string }
    | undefined;
  const mdImageMatch = item.text.match(/!\[(.*?)\]\((.*?)\)/);
  const imageUrl =
    detail?.url ||
    (detail?.kind === "image" && detail?.savedPath?.startsWith("http")
      ? detail.savedPath
      : undefined) ||
    mdImageMatch?.[2];
  const displayText = mdImageMatch
    ? item.text.replace(mdImageMatch[0], "").trim()
    : item.text;
  const cardStatus =
    detail?.status === "failed"
      ? "failed"
      : detail?.status === "started"
        ? "pending"
        : "completed";
  return (
    <div className={`chat-agent-item is-${item.role}`}>
      {onRewind && item.turnId && (
        <RewindMessageAction
          messageId={item.id}
          onRewind={onRewind}
          disabled={disabled}
        />
      )}
      {displayText ? <span>{displayText}</span> : null}
      {imageUrl ? (
        <ChatImageCard
          src={imageUrl}
          alt={mdImageMatch?.[1] || "生成的图像"}
          prompt={displayText}
          status={cardStatus}
          onPreview={(src) =>
            onPreviewImage
              ? onPreviewImage(src, displayText)
              : window.open(src, "_blank")
          }
          onSetReference={onSetReference}
        />
      ) : null}
    </div>
  );
}
