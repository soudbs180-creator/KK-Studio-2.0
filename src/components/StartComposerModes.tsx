import type { CreationDraft } from "../features/creation/model";

export function StartModePicker({
  draft,
  open,
  onToggle,
  onSelect,
}: {
  draft: CreationDraft;
  open: boolean;
  onToggle: () => void;
  onSelect: (mode: "auto" | "ask") => void;
}) {
  return (
    <div className="start-mode-picker">
      <button
        type="button"
        className="start-mode-button"
        aria-label={`当前模式：${draft.approvalMode === "ask" ? "询问" : "自动"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        {draft.approvalMode === "ask" ? "询问" : "自动"}{" "}
        <img
          src="/design/figma/composer-chevron.svg"
          alt=""
          draggable={false}
        />
      </button>
      {open && (
        <div className="start-mode-popover" role="menu">
          {(["auto", "ask"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={draft.approvalMode === value}
              onClick={() => onSelect(value)}
            >
              {value === "auto" ? "自动" : "询问"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StartApproval({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="start-approval" role="group" aria-label="确认创建项目">
      <span>将使用当前模型创建独立项目并提交任务。</span>
      <button type="button" onClick={onConfirm}>
        确认创建
      </button>
      <button type="button" onClick={onCancel}>
        取消
      </button>
    </div>
  );
}
