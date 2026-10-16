import { useState, useCallback, useRef } from "react";

export type AutocompleteMode = "none" | "mention" | "slash";

export interface AutocompleteState {
  mode: AutocompleteMode;
  query: string;
  triggerIndex: number;
  selectedIndex: number;
}

export function useComposerAutocomplete(options: {
  itemCount: number;
  onSelect: (index: number) => void;
}) {
  const [state, setState] = useState<AutocompleteState>({
    mode: "none",
    query: "",
    triggerIndex: -1,
    selectedIndex: 0,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const close = useCallback(() => {
    setState({
      mode: "none",
      query: "",
      triggerIndex: -1,
      selectedIndex: 0,
    });
  }, []);

  const handleTextChange = useCallback(
    (text: string, cursorPosition: number) => {
      if (cursorPosition < 0 || cursorPosition > text.length) {
        close();
        return;
      }

      const beforeCursor = text.slice(0, cursorPosition);

      // 1. 检查斜杠命令触发：输入框开头或换行后的 /
      const slashMatch = beforeCursor.match(/(?:^|\n)\/([^\s/]*)$/);
      if (slashMatch) {
        const query = slashMatch[1];
        const triggerIndex = beforeCursor.lastIndexOf("/" + query);
        setState({
          mode: "slash",
          query,
          triggerIndex,
          selectedIndex: 0,
        });
        return;
      }

      // 2. 检查 @ 提及触发：行首、空格后或换行后的 @
      const mentionMatch = beforeCursor.match(/(?:^|[\s\n])@([^\s@]*)$/);
      if (mentionMatch) {
        const query = mentionMatch[1];
        const triggerIndex = beforeCursor.lastIndexOf("@" + query);
        setState({
          mode: "mention",
          query,
          triggerIndex,
          selectedIndex: 0,
        });
        return;
      }

      // 均未命中，重置为 none
      if (stateRef.current.mode !== "none") {
        close();
      }
    },
    [close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      const current = stateRef.current;
      if (current.mode === "none") return false;

      const count = optionsRef.current.itemCount;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        if (count > 0) {
          setState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % count,
          }));
        }
        return true;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        if (count > 0) {
          setState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex - 1 + count) % count,
          }));
        }
        return true;
      }

      if (e.key === "Enter" || e.key === "Tab") {
        if (count > 0 && current.selectedIndex >= 0 && current.selectedIndex < count) {
          e.preventDefault();
          e.stopPropagation();
          optionsRef.current.onSelect(current.selectedIndex);
          close();
          return true;
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return true;
      }

      return false;
    },
    [close],
  );

  return {
    mode: state.mode,
    query: state.query,
    selectedIndex: state.selectedIndex,
    setSelectedIndex: (idx: number) =>
      setState((prev) => ({ ...prev, selectedIndex: idx })),
    handleTextChange,
    handleKeyDown,
    close,
  };
}
