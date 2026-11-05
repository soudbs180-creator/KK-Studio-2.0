import UiIcon from "../UiIcon";

interface ComposerActionsProps {
  expanded: boolean;
  onToggleExpanded: () => void;
}

export default function ComposerActions({
  expanded,
  onToggleExpanded,
}: ComposerActionsProps) {
  return (
    <div className="creation-composer-actions" aria-label="卡片操作">
      <button
        className="expand-composer"
        aria-label={expanded ? "收起提示词" : "展开提示词"}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        <UiIcon name={expanded ? "minimize-2" : "maximize-2"} size={16} />
      </button>
    </div>
  );
}
