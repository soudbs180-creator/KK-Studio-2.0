import { useEffect, useRef } from "react";
import type { SlashCommand } from "../../features/commands/index.ts";

export default function ComposerSlashMenu({
  commands,
  selectedIndex,
  onSelect,
  onClose,
}: {
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (cmd: SlashCommand) => void;
  onClose?: () => void;
}) {
  void onClose;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeItem = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement | null;
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (commands.length === 0) {
    return (
      <div
        className="composer-autocomplete-menu slash-menu empty"
        role="listbox"
      >
        <span className="autocomplete-empty-tip">未找到匹配的斜杠操作</span>
      </div>
    );
  }

  return (
    <div
      className="composer-autocomplete-menu slash-menu"
      role="listbox"
      aria-label="快捷操作命令"
      ref={listRef}
    >
      <div className="autocomplete-header">
        <span>快捷操作（输入字母自动补齐）</span>
        <span className="autocomplete-kbd-hint">↑↓ 选择 · ↵ / Tab 确认</span>
      </div>
      <div className="autocomplete-items">
        {commands.map((cmd, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-index={index}
              className={`autocomplete-item ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(cmd)}
            >
              <div className="item-main">
                <span className="slash-badge">{cmd.slash}</span>
                <span className="item-title">{cmd.name}</span>
                {cmd.aliases.length > 0 && (
                  <span className="alias-hint">
                    ({cmd.aliases.slice(0, 2).join(", ")})
                  </span>
                )}
              </div>
              <div className="item-desc">{cmd.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
