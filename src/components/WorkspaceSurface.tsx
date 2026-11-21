import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import DeferredPanelBoundary from "./DeferredPanelBoundary";
import { useHiddenControlFocus } from "./useHiddenControlFocus";

export default function WorkspaceSurface({
  title,
  penNode,
  routeKey,
  origin,
  onClose,
  children,
}: {
  title: string;
  penNode: string;
  routeKey: string;
  origin: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const host = useRef<HTMLElement | null>(null);
  const restoreHiddenFocus = useHiddenControlFocus(host, (previous) => {
    if (previous.closest(".settings-sidebar"))
      return (
        ref.current?.querySelector<HTMLElement>(".settings-content") ?? null
      );
    if (previous.closest(".settings-content"))
      return (
        ref.current?.querySelector<HTMLElement>(
          '.settings-nav [aria-current="page"]',
        ) ?? null
      );
    return ref.current;
  });
  useLayoutEffect(() => {
    host.current = ref.current?.parentElement ?? null;
    const breakpoints = [
      matchMedia("(max-width: 767px)"),
      matchMedia("(max-width: 1200px)"),
    ];
    for (const breakpoint of breakpoints)
      breakpoint.addEventListener("change", restoreHiddenFocus);
    return () => {
      for (const breakpoint of breakpoints)
        breakpoint.removeEventListener("change", restoreHiddenFocus);
    };
  }, [restoreHiddenFocus]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root?.contains(document.activeElement))
      root?.focus({ preventScroll: true });
    return () => {
      if (
        root?.contains(document.activeElement) ||
        document.activeElement === document.body
      ) {
        requestAnimationFrame(() => {
          if (document.activeElement !== document.body) return;
          const canRestore = (element: HTMLElement) =>
            element !== document.body &&
            element.isConnected &&
            element.getClientRects().length > 0 &&
            !element.matches(":disabled") &&
            getComputedStyle(element).visibility !== "hidden";
          const target =
            origin && canRestore(origin)
              ? origin
              : Array.from(
                  document.querySelectorAll<HTMLButtonElement>(
                    'button[aria-label="打开设置"]',
                  ),
                ).find(canRestore);
          target?.focus({ preventScroll: true });
        });
      }
    };
  }, [origin]);
  useLayoutEffect(() => {
    if (document.activeElement === document.body)
      ref.current?.focus({ preventScroll: true });
  }, [routeKey]);
  useEffect(() => {
    const closeAfterFocusLoss = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        event.isComposing ||
        document.activeElement !== document.body ||
        document.querySelector("dialog[open]")
      )
        return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", closeAfterFocusLoss);
    return () => window.removeEventListener("keydown", closeAfterFocusLoss);
  }, [onClose]);

  return (
    <section
      ref={ref}
      className="workspace-surface"
      role="dialog"
      aria-modal="false"
      aria-label={title}
      data-pen-node={penNode}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          event.nativeEvent.isComposing
        )
          return;
        if (
          event.target instanceof Element &&
          event.target.closest("dialog[open]")
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <DeferredPanelBoundary onClose={onClose} focusScope={ref}>
        {children}
      </DeferredPanelBoundary>
    </section>
  );
}
