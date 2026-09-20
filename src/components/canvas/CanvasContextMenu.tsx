import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "../../styles/canvas-context-menu.css";

export interface CanvasContextMenuState {
  client: { x: number; y: number };
  trigger: HTMLElement;
}

type MenuAction = "upload" | "add" | "undo" | "redo" | "paste";

const ITEMS: Array<{
  action: MenuAction;
  label: string;
  shortcut?: string;
  disabled?: boolean;
  reason?: string;
  nodeId: string;
}> = [
  {
    action: "upload",
    label: "上传",
    disabled: true,
    reason: "画布上传尚未接入",
    nodeId: "172:368",
  },
  { action: "add", label: "添加节点", nodeId: "172:370" },
  {
    action: "undo",
    label: "撤销",
    shortcut: "Ctrl + z",
    disabled: true,
    reason: "暂无可撤销的画布操作",
    nodeId: "172:373",
  },
  {
    action: "redo",
    label: "重做",
    shortcut: "Ctrl + Shift + z",
    disabled: true,
    reason: "暂无可重做的画布操作",
    nodeId: "172:376",
  },
  {
    action: "paste",
    label: "粘贴",
    shortcut: "Ctrl + v",
    disabled: true,
    reason: "剪贴板粘贴尚未接入",
    nodeId: "172:380",
  },
];

export default function CanvasContextMenu({
  menu,
  onAddNode,
  onDismiss,
}: {
  menu: CanvasContextMenuState;
  onAddNode: (point: { x: number; y: number }, trigger: HTMLElement) => void;
  onDismiss: (restoreFocus?: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 16, y: 16 });

  useLayoutEffect(() => {
    const place = () => {
      const box = ref.current?.getBoundingClientRect();
      if (!box) return;
      setPosition({
        x: Math.max(16, Math.min(menu.client.x, innerWidth - box.width - 16)),
        y: Math.max(16, Math.min(menu.client.y, innerHeight - box.height - 16)),
      });
    };
    place();
    ref.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus({
        preventScroll: true,
      });
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [menu]);

  useEffect(() => {
    const outside = (event: Event) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        onDismiss(false);
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
    };
  }, [onDismiss]);

  return createPortal(
    <div
      ref={ref}
      className="canvas-context-menu"
      role="menu"
      aria-label="画布菜单"
      style={{ left: position.x, top: position.y }}
      data-node-id="172:367"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          onDismiss();
          return;
        }
        if (event.key === "Tab") {
          onDismiss(false);
          return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const buttons = [
          ...ref.current!.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.focus({ preventScroll: true });
      }}
    >
      {ITEMS.map((item, index) => (
        <div
          key={item.action}
          className={
            index === 2 || index === 4 ? "canvas-context-divider-wrap" : ""
          }
        >
          {index === 2 || index === 4 ? (
            <div className="canvas-context-divider" role="separator" />
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="canvas-context-item"
            data-node-id={item.nodeId}
            disabled={item.disabled}
            aria-label={item.label}
            aria-description={item.reason}
            title={item.reason}
            onClick={() => {
              if (item.action === "add") onAddNode(menu.client, menu.trigger);
            }}
          >
            <span>{item.label}</span>
            {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
