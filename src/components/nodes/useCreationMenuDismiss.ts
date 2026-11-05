import { useEffect, type RefObject } from "react";

export function useMenuDismiss(
  ref: RefObject<HTMLDivElement | null>,
  menu: string,
  setMenu: (next: string) => void,
) {
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event: PointerEvent): void => {
      // Let a button click finish before a compact menu moves its target.
      if (!(event.target instanceof Element)) return;
      if (ref.current?.contains(event.target) && event.target.closest("button"))
        return;
      if (
        !ref.current
          ?.querySelector(`[data-control='${menu}']`)
          ?.contains(event.target)
      )
        setMenu("");
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [menu, ref, setMenu]);
}
