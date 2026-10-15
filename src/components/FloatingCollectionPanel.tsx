import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import UiIcon from "./UiIcon";
import { BROWSER_STORAGE_KEYS } from "../runtime/storage-contract";
import { createLogger } from "../runtime/logger";

const logger = createLogger("canvas-collections");

export default function FloatingCollectionPanel({
  id,
  title,
  open,
  activation,
  active,
  onActivate,
  onClose,
  children,
}: {
  id: "likes" | "tags";
  title: string;
  open: boolean;
  activation: number;
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const drag = useRef<{
    pointer: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const key = `${BROWSER_STORAGE_KEYS.collectionPositions}:${id}`;
  const [position, setPosition] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "null") as {
        left?: unknown;
        top?: unknown;
      } | null;
      if (
        stored &&
        typeof stored.left === "number" &&
        Number.isFinite(stored.left) &&
        typeof stored.top === "number" &&
        Number.isFinite(stored.top)
      )
        return { left: stored.left, top: stored.top };
    } catch {
      logger.warn("面板位置无效，已使用可达的默认位置。");
    }
    return { left: id === "likes" ? 300 : 680, top: 120 };
  });
  const [feedback, setFeedback] = useState("");
  function clamp(left: number, top: number) {
    const width = panel.current?.offsetWidth ?? 360;
    const height = panel.current?.offsetHeight ?? 480;
    return {
      left: Math.max(8, Math.min(left, innerWidth - width - 8)),
      top: Math.max(8, Math.min(top, innerHeight - height - 8)),
    };
  }
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () =>
      setPosition((current) => clamp(current.left, current.top));
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    handle.current?.focus({ preventScroll: true });
  }, [open, activation]);
  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(key, JSON.stringify(position));
    } catch {
      setFeedback("浏览器无法保存面板位置，本次打开仍可拖动。");
    }
  }, [open, key, position]);
  function close() {
    onClose();
    if (opener.current?.isConnected)
      opener.current.focus({ preventScroll: true });
  }
  if (!open) return null;
  return createPortal(
    <section
      ref={panel}
      className={`floating-collection-panel ${active ? "is-active" : ""}`}
      role="region"
      aria-label={title}
      data-testid={`canvas-${id}-panel`}
      style={position}
      onFocusCapture={onActivate}
      onPointerDownCapture={onActivate}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <header>
        <div
          ref={handle}
          className="collection-drag-handle"
          role="button"
          tabIndex={0}
          aria-label={`移动${title}面板`}
          title="拖动或使用方向键移动"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.focus({ preventScroll: true });
            drag.current = {
              pointer: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              ...position,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const current = drag.current;
            if (current?.pointer === event.pointerId)
              setPosition(
                clamp(
                  current.left + event.clientX - current.x,
                  current.top + event.clientY - current.y,
                ),
              );
          }}
          onPointerUp={(event) => {
            drag.current = null;
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onLostPointerCapture={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 16 : 4;
            const delta: Record<string, [number, number]> = {
              ArrowLeft: [-step, 0],
              ArrowRight: [step, 0],
              ArrowUp: [0, -step],
              ArrowDown: [0, step],
            };
            if (!delta[event.key]) return;
            event.preventDefault();
            event.stopPropagation();
            const [x, y] = delta[event.key];
            setPosition(clamp(position.left + x, position.top + y));
          }}
        >
          <strong>{title}</strong>
          <span aria-hidden="true">⠿</span>
        </div>
        <button
          type="button"
          className="kk-icon-hit"
          aria-label={`关闭${title}面板`}
          onClick={close}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className="collection-panel-body">{children}</div>
      {feedback && <p role="status">{feedback}</p>}
    </section>,
    document.body,
  );
}
