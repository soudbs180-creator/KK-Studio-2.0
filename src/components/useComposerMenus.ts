import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useDismissible } from "./useDismissible";
import { useHiddenControlFocus } from "./useHiddenControlFocus";

type ComposerMenu = "model" | "skill" | "plugin" | "mode";

/** One open menu per composer; share modal, IME and focus rules with other menus. */
export function useComposerMenus(boundary: RefObject<HTMLElement>) {
  const [menu, setMenu] = useState<ComposerMenu | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const restoreHiddenFocus = useHiddenControlFocus(boundary, () =>
    document.querySelector<HTMLButtonElement>(".chat-reopen"),
  );

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
      if (panel?.matches(".conversation-panel") && bounds?.width === 0) {
        restoreHiddenFocus();
        setMenu(null);
        return;
      }
      const left = Math.max(8, (bounds?.left ?? 0) + 8);
      const right = Math.min(
        window.innerWidth - 8,
        (bounds?.right ?? window.innerWidth) - 8,
      );
      const top = Math.max(8, (bounds?.top ?? 0) + 8);
      const bottom = Math.min(
        window.innerHeight - 8,
        (bounds?.bottom ?? window.innerHeight) - 8,
      );
      const controls = boundary.current?.getBoundingClientRect();
      if (!controls) return;
      // Home generation options are also actions: a popup must clear them.
      const home = boundary.current?.closest(".start-composer");
      const controlBottom = home
        ? home.getBoundingClientRect().bottom
        : controls.bottom;
      const above = Math.max(0, controls.top - top - 8);
      const below = Math.max(0, bottom - controlBottom - 8);
      const scrollTop = popover.scrollTop;
      popover.style.maxWidth = `${Math.max(0, right - left)}px`;
      popover.style.translate = "none";
      popover.style.maxHeight = "none";
      const naturalHeight = popover.getBoundingClientRect().height;
      const down =
        below >= naturalHeight || (above < naturalHeight && below > above);
      popover.style.maxHeight = `${down ? below : above}px`;
      popover.style.overflowY = "auto";
      const rect = popover.getBoundingClientRect();
      const x = Math.max(left - rect.left, Math.min(0, right - rect.right));
      const y =
        (down ? controlBottom + 8 : controls.top - 8 - rect.height) - rect.top;
      popover.style.translate = `${x}px ${y}px`;
      popover.scrollTop = scrollTop;
    };
    const onScroll = (event: Event) => {
      // Scrolling a limited menu changes its content, not its anchor.
      if (event.target instanceof Node && popover.contains(event.target))
        return;
      place();
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(popover);
    if (boundary.current)
      observer.observe(boundary.current.closest("form") ?? boundary.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [boundary, menu, restoreHiddenFocus]);

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
