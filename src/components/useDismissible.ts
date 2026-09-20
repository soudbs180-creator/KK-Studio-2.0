import { useEffect, type RefObject } from "react";

export function useDismissible(
  open: boolean,
  ref: RefObject<HTMLElement>,
  dismiss: () => void,
  trigger?: RefObject<HTMLButtonElement>,
): void {
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent): void => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        dismiss();
    };
    const escape = (event: KeyboardEvent): void => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      (
        trigger?.current ??
        ref.current?.querySelector<HTMLButtonElement>("button[aria-expanded]")
      )?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", escape, true);
    };
  }, [open, ref, dismiss, trigger]);
}
