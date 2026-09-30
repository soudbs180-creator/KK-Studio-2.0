import { useEffect, useLayoutEffect, useRef } from "react";
import { useHiddenControlFocus } from "./useHiddenControlFocus";

/** Compact conversation stays open until the user activates its close control. */
export function useConversationOverlay(open: boolean) {
  const panel = useRef<HTMLElement>(null);
  const restoreHiddenFocus = useHiddenControlFocus(panel, () =>
    document.querySelector<HTMLButtonElement>(".chat-reopen"),
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 1200px)");
    media.addEventListener("change", restoreHiddenFocus);
    return () => media.removeEventListener("change", restoreHiddenFocus);
  }, [restoreHiddenFocus]);
  useLayoutEffect(() => {
    if (!open) return;
    // The persistent canvas button becomes usable again after onClose commits.
    if (panel.current?.contains(document.activeElement)) return;
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-label="收起对话"]')
      ?.focus({ preventScroll: true });
  }, [open]);
  return panel;
}
