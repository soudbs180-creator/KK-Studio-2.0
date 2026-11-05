import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ToolbarIcon from "./ToolbarIcon";
import type { CanvasTool } from "./useCanvasPointer";
import { useDismissible } from "../useDismissible";
import { ExtensionSlot } from "../../features/extensions/index.ts";
import "../../styles/canvas-tools.css";
import { Button } from "../ui";
import UiIcon from "../UiIcon";

type Popup = "tool" | "help" | "save";
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
  useLayoutEffect(() => {
    if (!popup) return;
    const menu =
      toolbarRef.current?.querySelector<HTMLElement>("[role='menu']");
    const trigger = triggerRef.current;
    const toolbar = toolbarRef.current;
    if (!menu || !trigger || !toolbar) return;
    const position = () => {
      const anchor = trigger.getBoundingClientRect();
      const root = toolbar.getBoundingClientRect();
      menu.style.left = `${Math.max(8 - root.left, Math.min(anchor.left - root.left, window.innerWidth - 8 - menu.offsetWidth - root.left)) - toolbar.clientLeft}px`;
      menu.style.bottom = `${root.bottom - toolbar.clientTop - anchor.top + 8}px`;
      menu.style.maxHeight = `${Math.max(44, anchor.top - 16)}px`;
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [popup]);
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
      <Button
        heightTier="44px"
        variant="ghost"
        isPill
        prefixIcon={<ToolbarIcon name="add" />}
        className="toolbar-add"
        aria-label="添加资源"
        aria-haspopup="menu"
        aria-expanded={addOpen}
        title="添加资源"
        onClick={(event) => {
          setPopup(null);
          onAdd(event.currentTarget);
        }}
      />
      <span className="toolbar-divider toolbar-divider-left" aria-hidden="true" />
      <button
        className="toolbar-current-tool"
        aria-label="选择画布工具"
        title={tool === "hand" ? "小手工具（按住空格拖拽）" : "移动工具"}
        aria-pressed="true"
        onClick={() => {
          setPopup(null);
          onToolChange(tool);
        }}
      >
        {tool === "select" ? (
          <ToolbarIcon name="select" />
        ) : (
          <UiIcon name="hand" size={20} />
        )}
      </button>
      <button
        className="toolbar-toggle"
        aria-label="展开画布工具"
        title="选择移动或小手工具"
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
              aria-label={value === "select" ? "移动工具" : "小手工具"}
              title={
                value === "select" ? "移动（V）" : "小手工具（H，按住空格拖拽）"
              }
              aria-checked={tool === value}
              onClick={() => {
                onToolChange(value);
                close();
              }}
            >
              {tool === value && <UiIcon name="check" size={16} />}
              <UiIcon
                name={value === "select" ? "mouse-pointer-2" : "hand"}
                size={16}
              />
              <span className="tool-menu-label">
                {value === "select" ? "移动" : "小手工具"}
              </span>
              <span className="tool-menu-kbd">
                {value === "select" ? "V" : "H"}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        className="toolbar-assets"
        aria-label="资源管理"
        title="资源管理（资产项目）"
        onClick={() => {
          setPopup(null);
          onOpen("assets");
        }}
      >
        <ToolbarIcon name="assets" />
      </button>
      <button
        className="toolbar-save"
        aria-label="喜欢与标签"
        title="喜欢与标签"
        aria-haspopup="menu"
        aria-expanded={popup === "save"}
        onClick={(event) => toggle("save", event.currentTarget)}
      >
        <ToolbarIcon name="favorite" />
      </button>
      {popup === "save" && (
        <div className="canvas-save-menu" role="menu" aria-label="喜欢与标签">
          <button
            role="menuitem"
            onClick={() => {
              close();
              onOpen("likes");
            }}
          >
            <span className="canvas-save-like-dot" aria-hidden="true" />
            <span>我喜欢的</span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              close();
              onOpen("tags");
            }}
          >
            <span className="canvas-save-star-dot" aria-hidden="true" />
            <span>画布标签</span>
          </button>
        </div>
      )}
      <span
        className="toolbar-divider toolbar-divider-right"
        aria-hidden="true"
      />
      <button
        className="toolbar-help"
        aria-label="帮助与快捷键"
        title="帮助与快捷键"
        aria-haspopup="menu"
        aria-expanded={popup === "help"}
        onClick={(event) => toggle("help", event.currentTarget)}
      >
        <ToolbarIcon name="help" />
      </button>
      {popup === "help" && (
        <div className="canvas-help-menu" role="menu" aria-label="帮助与快捷键">
          {[
            { view: "help", label: "帮助教程", icon: "book-open" as const },
            { view: "shortcuts", label: "快捷按键", icon: "keyboard" as const },
          ].map((item) => (
            <button
              key={item.view}
              role="menuitem"
              onClick={() => {
                close();
                onOpen(item.view);
              }}
            >
              <UiIcon name={item.icon} size={16} />
              <span>{item.label}</span>
              <UiIcon name="chevron-right" size={16} />
            </button>
          ))}
        </div>
      )}
      <ExtensionSlot id="canvas.toolbar" />
    </div>
  );
}
