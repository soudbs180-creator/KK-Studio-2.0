import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDismissible } from "./useDismissible";

type ComposerMenu = "model" | "skill" | "plugin" | "mode";

/** One open menu per composer; share modal, IME and focus rules with other menus. */
export function useComposerMenus(boundary: RefObject<HTMLElement>) {
  const [menu, setMenu] = useState<ComposerMenu | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    trigger.current =
      boundary.current?.querySelector<HTMLButtonElement>(
        'button[aria-haspopup="menu"][aria-expanded="true"]',
      ) ?? null;
    anchor.current = trigger.current?.parentElement ?? null;
    const popover = anchor.current?.querySelector<HTMLElement>('[role="menu"]');
    if (!popover) return;
    const place = () => {
      const panel = boundary.current?.closest(
        ".start-page, .conversation-panel",
      );
      const bounds = panel?.getBoundingClientRect();
      const left = Math.max(8, (bounds?.left ?? 0) + 8);
      const right = Math.min(
        window.innerWidth - 8,
        (bounds?.right ?? window.innerWidth) - 8,
      );
      popover.style.maxWidth = `${Math.max(0, right - left)}px`;
      popover.style.translate = "none";
      const rect = popover.getBoundingClientRect();
      const x = Math.max(left - rect.left, Math.min(0, right - rect.right));
      const y = Math.max(
        8 - rect.top,
        Math.min(0, window.innerHeight - 8 - rect.bottom),
      );
      popover.style.translate = `${x}px ${y}px`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [boundary, menu]);

  useDismissible(menu !== null, anchor, () => setMenu(null), trigger);

  return {
    modelMenuOpen: menu === "model",
    skillMenuOpen: menu === "skill",
    pluginMenuOpen: menu === "plugin",
    modeMenuOpen: menu === "mode",
    toggleMenu: (requested: ComposerMenu) =>
      setMenu((current) => (current === requested ? null : requested)),
    openMenu: (requested: ComposerMenu) => setMenu(requested),
    closeMenus: () => setMenu(null),
  };
}
