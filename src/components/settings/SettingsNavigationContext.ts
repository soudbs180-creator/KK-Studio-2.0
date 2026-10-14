import { createContext, useEffect, type RefObject } from "react";

export const SettingsNavigationContext = createContext({
  busy: false,
  setBusy: (_busy: boolean) => {},
});

/** Navigation cannot unmount an in-flight credential/configuration write. */
export function useSettingsNavigationLock(
  panel: RefObject<HTMLDivElement>,
  busy: boolean,
): void {
  useEffect(() => {
    const dialog = panel.current?.closest("dialog");
    if (!dialog || !busy) return;
    const cancel = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const backdrop = (event: MouseEvent) => {
      if (event.target === dialog) cancel(event);
    };
    dialog.addEventListener("cancel", cancel, true);
    dialog.addEventListener("click", backdrop, true);
    return () => {
      dialog.removeEventListener("cancel", cancel, true);
      dialog.removeEventListener("click", backdrop, true);
    };
  }, [panel, busy]);
}
