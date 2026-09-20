export default function ConversationModelPicker({
  currentModel,
  options,
  open,
  onToggle,
  onSelect,
  onConfigure,
}: {
  currentModel?: string;
  options: string[];
  open: boolean;
  onToggle: () => void;
  onSelect: (model: string) => void;
  onConfigure: () => void;
}) {
  return (
    <>
      <button
        type="button"
        aria-label="模型"
        className="chat-model-picker"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
      >
        <img
          src="/design/figma/composer-package.svg"
          width="12.5"
          height="13.85"
          alt=""
        />
        <span className="chat-model-name">{currentModel || "模型"}</span>
      </button>
      {open && (
        <div className="chat-model-popover" role="menu">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={currentModel === option}
              onClick={() => onSelect(option)}
            >
              {option}
              {currentModel === option ? "（当前项目）" : ""}
            </button>
          ))}
          {!options.length && currentModel && (
            <button
              type="button"
              role="menuitemradio"
              aria-checked="true"
              onClick={() => onSelect(currentModel)}
            >
              {currentModel}（当前项目）
            </button>
          )}
          <button type="button" onClick={onConfigure}>
            配置供应商…
          </button>
        </div>
      )}
    </>
  );
}
