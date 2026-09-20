import { useEffect, useRef, useState } from "react";
import ToolbarIcon from "./ToolbarIcon";
import type { CanvasTool } from "./useCanvasPointer";
import { useDismissible } from "../useDismissible";
import "../../styles/canvas-tools.css";

type Popup = "tool" | "help";
export default function CanvasToolbar({
  onOpen,
  onAdd,
  addOpen,
  tool,
  onToolChange,
}: {
  onOpen: (view: string) => void;
  onAdd: (trigger: HTMLButtonElement) => void;
  addOpen: boolean;
  tool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
}) {
  const [popup, setPopup] = useState<Popup | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useDismissible(popup !== null, toolbarRef, () => setPopup(null), triggerRef);
  useEffect(() => {
    if (popup)
      toolbarRef.current
        ?.querySelector<HTMLButtonElement>("[role='menu'] button")
        ?.focus({ preventScroll: true });
  }, [popup]);
  function toggle(value: Popup, button: HTMLButtonElement): void {
    triggerRef.current = button;
    setPopup((current) => (current === value ? null : value));
  }
  function close(): void {
    setPopup(null);
    triggerRef.current?.focus({ preventScroll: true });
  }
  return (
    <div
      ref={toolbarRef}
      className="canvas-toolbar"
      role="toolbar"
      aria-label="画布工具"
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (
          !popup ||
          !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
        )
          return;
        const buttons = Array.from(
          toolbarRef.current?.querySelectorAll<HTMLButtonElement>(
            "[role='menu'] button:not(:disabled)",
          ) ?? [],
        );
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        event.preventDefault();
        event.stopPropagation();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowDown" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.focus();
      }}
    >
      <button
        className="toolbar-add"
        aria-label="添加资源"
        aria-haspopup="menu"
        aria-expanded={addOpen}
        onClick={(event) => {
          setPopup(null);
          onAdd(event.currentTarget);
        }}
      >
        <ToolbarIcon name="add" />
      </button>
      <span className="toolbar-divider toolbar-divider-left" aria-hidden="true">
        <img
          src="/design/figma/toolbar-divider-left.svg"
          alt=""
          draggable={false}
        />
      </span>
      <button
        className="toolbar-current-tool"
        aria-label={tool === "hand" ? "当前工具：抓手" : "当前工具：选择"}
        title={tool === "hand" ? "抓手 H" : "选择 V"}
        aria-haspopup="menu"
        aria-expanded={popup === "tool"}
        onClick={(event) => toggle("tool", event.currentTarget)}
      >
        {tool === "select" ? (
          <ToolbarIcon name="select" />
        ) : (
          <span className="tool-hand-current" aria-hidden="true" />
        )}
      </button>
      <button
        className="toolbar-toggle"
        aria-label="选择画布工具"
        aria-haspopup="menu"
        aria-expanded={popup === "tool"}
        onClick={(event) => toggle("tool", event.currentTarget)}
      >
        <ToolbarIcon name="collapse" />
      </button>
      {popup === "tool" && (
        <div className="canvas-tool-menu" role="menu" aria-label="画布工具选择">
          {(["select", "hand"] as const).map((value) => (
            <button
              key={value}
              role="menuitemradio"
              aria-label={value === "select" ? "选择工具" : "抓手工具"}
              aria-checked={tool === value}
              onClick={() => {
                onToolChange(value);
                close();
              }}
            >
              <img
                className="tool-menu-check"
                src={
                  tool === value
                    ? "/design/figma/tool-check-active.svg"
                    : "/design/figma/tool-check.svg"
                }
                alt=""
                hidden={tool !== value}
              />
              <img
                className="tool-menu-icon"
                src={
                  value === "select"
                    ? "/design/figma/tool-select.svg"
                    : "/design/figma/tool-hand.svg"
                }
                alt=""
              />
              <span>{value === "select" ? "V" : "H"}</span>
            </button>
          ))}
        </div>
      )}
      <button
        className="toolbar-assets"
        aria-label="资产管理"
        onClick={() => {
          setPopup(null);
          onOpen("assets");
        }}
      >
        <ToolbarIcon name="assets" />
      </button>
      <button
        className="toolbar-favorite"
        aria-label="打开喜欢与收藏"
        title="喜欢与收藏"
        onClick={() => {
          setPopup(null);
          onOpen("favorites");
        }}
      >
        <ToolbarIcon name="favorite" />
      </button>
      <span
        className="toolbar-favorite-toggle"
        aria-hidden="true"
        data-testid="toolbar-favorite-toggle"
      >
        <img
          src="/design/figma/toolbar-collapse.svg"
          alt=""
          draggable={false}
        />
      </span>
      <span
        className="toolbar-divider toolbar-divider-right"
        aria-hidden="true"
      >
        <img
          src="/design/figma/toolbar-divider-right.svg"
          alt=""
          draggable={false}
        />
      </span>
      <button
        className="toolbar-help"
        aria-label="帮助与快捷键"
        aria-haspopup="menu"
        aria-expanded={popup === "help"}
        onClick={(event) => toggle("help", event.currentTarget)}
      >
        <ToolbarIcon name="help" />
      </button>
      {popup === "help" && (
        <div className="canvas-help-menu" role="menu" aria-label="帮助与快捷键">
          {[
            { view: "help", label: "帮助教程", icon: "help-tutorial" },
            { view: "shortcuts", label: "快捷按键", icon: "help-shortcuts" },
          ].map((item) => (
            <button
              key={item.view}
              role="menuitem"
              onClick={() => {
                close();
                onOpen(item.view);
              }}
            >
              <img src={"/design/figma/" + item.icon + ".svg"} alt="" />
              <span>{item.label}</span>
              <img
                className="help-menu-next"
                src="/design/figma/help-next.svg"
                alt=""
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
