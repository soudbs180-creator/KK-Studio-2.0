import { useEffect, useLayoutEffect, useRef } from "react";
import { useDismissible } from "./useDismissible";
import { useHiddenControlFocus } from "./useHiddenControlFocus";

/** Compact conversation shares the same topmost dismissal and focus contract. */
export function useConversationOverlay(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const restoreHiddenFocus = useHiddenControlFocus(panel, () =>
    document.querySelector<HTMLButtonElement>(".chat-reopen"),
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 1200px)");
    media.addEventListener("change", restoreHiddenFocus);
    return () => media.removeEventListener("change", restoreHiddenFocus);
  }, [restoreHiddenFocus]);
  useDismissible(open, panel, onClose, trigger);
  useLayoutEffect(() => {
    if (!open) return;
    // The persistent canvas button becomes usable again after onClose commits.
    trigger.current = document.querySelector<HTMLButtonElement>(".chat-reopen");
    if (panel.current?.contains(document.activeElement)) return;
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-label="收起对话"]')
      ?.focus({ preventScroll: true });
  }, [open]);
  return panel;
}
