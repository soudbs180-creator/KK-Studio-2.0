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
