import type { AgentConversationProps } from "./AgentConversationMessages";
import { Select } from "./ui";

export default function AgentReferenceSection({
  canvasImages,
  disabled,
  onSelect,
}: {
  canvasImages?: AgentConversationProps["canvasImages"];
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const hasImages = Boolean(canvasImages?.length);
  return (
    <section className="agent-reference-region" aria-label="Agent 参考图">
      <div className="agent-reference-heading">
        <span>参考图</span>
        <span>可选 · 最多 6 张 · 单张 8 MiB</span>
      </div>
      <div className="agent-reference-picker">
        <Select
          aria-label="引用画布图片"
          value=""
          disabled={disabled || !hasImages}
          onChange={onSelect}
          placeholder={hasImages ? "引用画布图片…" : "画布暂无已归档图片"}
          options={(canvasImages ?? []).map((item) => ({
            value: item.id,
            label: item.title,
          }))}
        />
      </div>
    </section>
  );
}
