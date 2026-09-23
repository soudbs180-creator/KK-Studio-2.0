import { useCallback, useEffect, useRef, type RefObject } from "react";

/** CSS can blur a hidden control before a media-query listener runs. */
export function useHiddenControlFocus(
  root: RefObject<HTMLElement>,
  replacement: (previous: HTMLElement) => HTMLElement | null,
): () => void {
  const lastFocus = useRef<HTMLElement | null>(null);
  const resolve = useRef(replacement);
  resolve.current = replacement;
  useEffect(() => {
    const remember = (event: FocusEvent): void => {
      lastFocus.current =
        event.target instanceof HTMLElement &&
        root.current?.contains(event.target)
          ? event.target
          : null;
    };
    const forgetOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target))
        lastFocus.current = null;
    };
    document.addEventListener("focusin", remember);
    document.addEventListener("pointerdown", forgetOutside, true);
    return () => {
      document.removeEventListener("focusin", remember);
      document.removeEventListener("pointerdown", forgetOutside, true);
    };
  }, [root]);
  return useCallback(() => {
    const active = document.activeElement;
    const previous = active === document.body ? lastFocus.current : active;
    if (
      previous instanceof HTMLElement &&
      root.current?.contains(previous) &&
      previous.getClientRects().length === 0
    )
      resolve.current(previous)?.focus({ preventScroll: true });
  }, [root]);
}
