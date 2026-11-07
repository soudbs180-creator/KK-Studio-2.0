import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

/** Reparent only the editor DOM; its node-owned draft and actions stay shared. */
const CanvasComposerShell = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(function CanvasComposerShell({ className, ...props }, forwardedRef) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const [screenHost, setScreenHost] = useState<HTMLElement | null>(null);
  const attach = useCallback(
    (element: HTMLDivElement | null) => {
      localRef.current = element;
      if (typeof forwardedRef === "function") forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    },
    [forwardedRef],
  );
  useLayoutEffect(() => {
    const canvas = localRef.current?.closest<HTMLElement>(".infinite-canvas");
    if (!canvas) return;
    const phone = window.matchMedia("(max-width: 767px)");
    const update = () => setScreenHost(phone.matches ? canvas : null);
    update();
    phone.addEventListener("change", update);
    return () => phone.removeEventListener("change", update);
  }, []);
  useLayoutEffect(() => {
    const editor = localRef.current;
    const hud = screenHost?.querySelector<HTMLElement>(".canvas-hud");
    if (!editor || !screenHost || !hud) return;
    const update = () => {
      const controls = [
        ...hud.querySelectorAll<HTMLElement>(
          ".canvas-hud-left > *, .canvas-top-right > button, .canvas-navigation-tools > button",
        ),
      ].filter((control) => control.getClientRects().length);
      const top = Math.max(
        hud.getBoundingClientRect().bottom,
        ...controls.map((control) => control.getBoundingClientRect().bottom),
      );
      const bottom = innerHeight - parseFloat(getComputedStyle(editor).bottom);
      editor.style.setProperty(
        "--canvas-screen-available-height",
        `${Math.max(0, bottom - top - 8)}px`,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(hud);
    observer.observe(screenHost);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      editor.style.removeProperty("--canvas-screen-available-height");
    };
  }, [screenHost]);
  const shell = (
    <div
      {...props}
      ref={attach}
      className={className + (screenHost ? " canvas-composer-screen" : "")}
    />
  );
  // Staying inside the canvas preserves its covered/inert boundary.
  return screenHost ? createPortal(shell, screenHost) : shell;
});

export default CanvasComposerShell;
