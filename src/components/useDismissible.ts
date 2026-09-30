import { useLayoutEffect, useRef, type RefObject } from "react";

type DismissibleEntry = {
  ref: RefObject<HTMLElement>;
  dismiss: () => void;
  trigger?: RefObject<HTMLElement>;
};

// Nested popovers stay above their parent, including a parent that becomes an
// overlay after a breakpoint change. Unrelated entries keep opening order.
const openEntries: DismissibleEntry[] = [];

function topmostDialog(): HTMLDialogElement | null {
  const dialogs = document.querySelectorAll<HTMLDialogElement>("dialog[open]");
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

function eventBelongsToEntry(event: Event, entry: DismissibleEntry): boolean {
  const dialog = topmostDialog();
  if (!dialog) return true;
  if (!(event.target instanceof Node) || !dialog.contains(event.target))
    return false;
  // Ignore events from a modal backdrop or from a background popover. A
  // popover nested in the active dialog remains eligible to dismiss itself.
  return !!entry.ref.current && dialog.contains(entry.ref.current);
}

function focusTrigger(entry: DismissibleEntry): void {
  const trigger =
    entry.trigger?.current ??
    entry.ref.current?.querySelector<HTMLButtonElement>(
      'button[aria-expanded="true"], button[aria-haspopup]',
    );
  if (trigger?.isConnected && !trigger.matches(":disabled")) {
    trigger.focus({ preventScroll: true });
  }
}

export function useDismissible(
  open: boolean,
  ref: RefObject<HTMLElement>,
  dismiss: () => void,
  trigger?: RefObject<HTMLElement>,
): void {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  // Registration follows the same commit as visibility, including media-query
  // transitions; rapid Escape must not see a stale child or a missing parent.
  useLayoutEffect(() => {
    if (!open) return;
    const entry: DismissibleEntry = {
      ref,
      dismiss: () => dismissRef.current(),
      trigger,
    };
    const descendant = openEntries.findIndex((other) =>
      [other.ref.current, other.trigger?.current].some(
        (node) => node && ref.current?.contains(node),
      ),
    );
    if (descendant < 0) openEntries.push(entry);
    else openEntries.splice(descendant, 0, entry);
    const pointer = (event: PointerEvent): void => {
      if (
        openEntries[openEntries.length - 1] !== entry ||
        !eventBelongsToEntry(event, entry)
      )
        return;
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        !trigger?.current?.contains(event.target)
      ) {
        // 仅关闭，不在此处夺回焦点：pointerdown 期间调用 focus() 会吞掉
        // 点击目标自身的 click 事件（例如点击文件夹行收起菜单时无法折叠）。
        // Escape 路径仍会把焦点还给触发器。
        dismissRef.current();
      }
    };
    const escape = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        event.keyCode === 229 ||
        openEntries[openEntries.length - 1] !== entry ||
        !eventBelongsToEntry(event, entry)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismissRef.current();
      focusTrigger(entry);
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      const index = openEntries.indexOf(entry);
      if (index >= 0) openEntries.splice(index, 1);
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open, ref, trigger]);
}
