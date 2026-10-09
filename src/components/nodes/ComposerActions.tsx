import UiIcon from "../UiIcon";

interface ComposerActionsProps {
  liked: boolean;
  expanded: boolean;
  onToggleLike: () => void;
  onToggleExpanded: () => void;
}

export default function ComposerActions({
  liked,
  expanded,
  onToggleLike,
  onToggleExpanded,
}: ComposerActionsProps) {
  return (
    <div className="creation-composer-actions" aria-label="卡片操作">
      <button
        className="like-node"
        aria-label={liked ? "取消喜欢当前卡片" : "喜欢当前卡片"}
        aria-pressed={liked}
        onClick={onToggleLike}
      >
        <UiIcon name="favorite" size={16} />
      </button>
      <button
        className="expand-composer"
        aria-label={expanded ? "收起提示词" : "展开提示词"}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        <img
          src={
            expanded ? "/design/figma/collapse.svg" : "/design/figma/expand.svg"
          }
          alt=""
        />
      </button>
    </div>
  );
}
