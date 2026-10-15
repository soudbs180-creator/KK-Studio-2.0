import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useDismissible } from "./useDismissible";
import { useHiddenControlFocus } from "./useHiddenControlFocus";

type ComposerMenu = "add" | "model" | "skill" | "plugin" | "mode";

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
        'button[aria-haspopup][aria-expanded="true"]',
      ) ?? null;
    anchor.current = trigger.current?.parentElement ?? null;
    const popover = anchor.current?.querySelector<HTMLElement>(
      '[role="menu"], [role="dialog"]',
    );
    if (!popover) return;
    const home = boundary.current?.closest<HTMLElement>(".start-composer");
    const viewport = window.visualViewport;
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
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportRight =
        viewportLeft + (viewport?.width ?? window.innerWidth);
      const viewportBottom =
        viewportTop + (viewport?.height ?? window.innerHeight);
      const left = Math.max(
        viewportLeft + 8,
        (bounds?.left ?? viewportLeft) + 8,
      );
      const right = Math.min(
        viewportRight - 8,
        (bounds?.right ?? viewportRight) - 8,
      );
      const top = Math.max(viewportTop + 8, (bounds?.top ?? viewportTop) + 8);
      const bottom = Math.min(
        viewportBottom - 8,
        (bounds?.bottom ?? viewportBottom) - 8,
      );
      const controls = trigger.current?.getBoundingClientRect();
      if (!controls) return;
      const above = Math.max(0, controls.top - top - 8);
      const below = Math.max(0, bottom - controls.bottom - 8);
      const scrollTop = popover.scrollTop;
      popover.style.maxWidth = `${Math.max(0, right - left)}px`;
      popover.style.translate = "none";
      popover.style.maxHeight = "";
      const naturalHeight = popover.getBoundingClientRect().height;
      const down = below >= naturalHeight || below > above;
      popover.style.maxHeight = `${down ? below : above}px`;
      popover.style.top = down ? "calc(100% + 8px)" : "auto";
      popover.style.bottom = down ? "auto" : "calc(100% + 8px)";
      popover.style.overflowY = "auto";
      const rect = popover.getBoundingClientRect();
      const x = Math.max(left - rect.left, Math.min(0, right - rect.right));
      popover.style.translate = `${x}px 0px`;
      popover.scrollTop = scrollTop;
      // Discovery stays in flow when a home menu opens below the action row.
      if (home) home.style.marginBottom = down ? `${rect.height + 8}px` : "";
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
    if (trigger.current) observer.observe(trigger.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      home?.style.removeProperty("margin-bottom");
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
      viewport?.removeEventListener("resize", place);
      viewport?.removeEventListener("scroll", place);
    };
  }, [boundary, menu, restoreHiddenFocus]);

  useDismissible(menu !== null, anchor, () => setMenu(null), trigger);
  const closeMenus = useCallback(() => setMenu(null), []);

  return {
    addMenuOpen: menu === "add",
    modelMenuOpen: menu === "model",
    skillMenuOpen: menu === "skill",
    pluginMenuOpen: menu === "plugin",
    modeMenuOpen: menu === "mode",
    toggleMenu: (requested: ComposerMenu) =>
      setMenu((current) => (current === requested ? null : requested)),
    openMenu: (requested: ComposerMenu) => setMenu(requested),
    closeMenus,
  };
}
