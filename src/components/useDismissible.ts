import { useEffect, useRef, type RefObject } from "react";

type DismissibleEntry = {
  ref: RefObject<HTMLElement>;
  dismiss: () => void;
  trigger?: RefObject<HTMLButtonElement>;
};

// The last mounted open entry is the topmost popover. A shared stack avoids
// closing every open menu when several hooks listen on document simultaneously.
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
  if (trigger?.isConnected && !trigger.disabled) {
    trigger.focus({ preventScroll: true });
  }
}

export function useDismissible(
  open: boolean,
  ref: RefObject<HTMLElement>,
  dismiss: () => void,
  trigger?: RefObject<HTMLButtonElement>,
): void {
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    if (!open) return;
    const entry: DismissibleEntry = {
      ref,
      dismiss: () => dismissRef.current(),
      trigger,
    };
    openEntries.push(entry);
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
        dismissRef.current();
        focusTrigger(entry);
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
