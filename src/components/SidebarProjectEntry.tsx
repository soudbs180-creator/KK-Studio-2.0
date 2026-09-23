import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDismissible } from "./useDismissible";

export default function SidebarProjectEntry({
  grouped,
  visible,
  selected,
  onNavigate,
}: {
  grouped: boolean;
  visible: boolean;
  selected: boolean;
  onNavigate: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [title, setTitle] = useState(grouped ? "KK项目" : "KK工作流");
  const [editing, setEditing] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [moved, setMoved] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useDismissible(
    menuOpen && visible,
    menuRef,
    () => setMenuOpen(false),
    menuTrigger,
  );
  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
      setEditing(false);
    }
  }, [visible]);
  useLayoutEffect(() => {
    if (menuOpen && visible)
      root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
  }, [menuOpen, visible]);
  if (deleted)
    return (
      <button className="project-undo" onClick={() => setDeleted(false)}>
        恢复未分组项目
      </button>
    );
  const menuLabel = grouped ? "项目组设置" : "项目设置";
  const menuButtonLabel = grouped ? "项目组设置" : "更多项目设置";
  return (
    <div
      ref={root}
      className={`project-entry ${pinned ? "is-pinned" : ""}`}
      onContextMenu={
        grouped
          ? (event) => {
              event.preventDefault();
              setMenuOpen(true);
            }
          : undefined
      }
    >
      {editing ? (
        <input
          className="project-title-input"
          value={title}
          aria-label="项目名称"
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "Escape")
              setEditing(false);
          }}
        />
      ) : (
        <button
          ref={grouped ? menuTrigger : undefined}
          className={`project-link ${selected ? "is-selected" : ""}`}
          aria-current={selected ? "page" : undefined}
          onClick={() => {
            setMenuOpen(false);
            onNavigate("workspace");
          }}
          title={
            grouped ? "打开项目工作台；右键或 Shift+F10 管理项目" : undefined
          }
          aria-keyshortcuts={grouped ? "Shift+F10" : undefined}
          onKeyDown={
            grouped
              ? (event) => {
                  if (event.shiftKey && event.key === "F10") {
                    event.preventDefault();
                    setMenuOpen(true);
                  }
                }
              : undefined
          }
        >
          <span className={grouped ? "project-folder" : "project-yellow"}>
            {grouped && (
              <img
                src="/design/figma/project-folder-glyph.svg"
                width="13"
                height="11"
                alt=""
              />
            )}
          </span>
          <span>{title}</span>
        </button>
      )}
      <button
        className="project-pin"
        aria-label={
          grouped
            ? `打开 ${title} 工作台`
            : pinned
              ? "取消置顶项目"
              : "置顶项目"
        }
        aria-pressed={grouped ? undefined : pinned}
        title={grouped ? "打开项目工作台" : pinned ? "取消置顶" : "置顶"}
        onClick={() =>
          grouped ? onNavigate("workspace") : setPinned((value) => !value)
        }
      >
        <img
          className="project-action-container"
          src={
            grouped
              ? "/design/figma/project-open-container.svg"
              : "/design/figma/project-pin-container.svg"
          }
          alt=""
        />
      </button>
      <button
        ref={grouped ? undefined : menuTrigger}
        className="project-more"
        aria-label={grouped ? "添加创作页面" : menuButtonLabel}
        aria-expanded={grouped ? undefined : menuOpen}
        disabled={grouped}
        title={grouped ? "多创作页尚未接入（Prototype）" : "更多项目设置"}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <img
          className="project-action-container"
          src={
            grouped
              ? "/design/figma/project-add-container.svg"
              : "/design/figma/project-more-container.svg"
          }
          alt=""
        />
      </button>
      {menuOpen && (
        <div
          ref={menuRef}
          className="project-menu"
          role="menu"
          aria-label={menuLabel}
          onKeyDown={(event) => {
            if (
              event.nativeEvent.isComposing ||
              !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
            )
              return;
            event.preventDefault();
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="menuitem"]:not(:disabled)',
              ),
            ];
            const current = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          {grouped && (
            <button
              role="menuitem"
              onClick={() => {
                setPinned((value) => !value);
                setMenuOpen(false);
                menuTrigger.current?.focus();
              }}
            >
              {pinned ? "取消置顶项目" : "置顶项目"}
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              setEditing(true);
              setMenuOpen(false);
            }}
          >
            改名字
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setMoved(true);
              setMenuOpen(false);
            }}
          >
            {grouped ? "从项目组移出" : "移动到项目组"}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setDeleted(true);
              setMenuOpen(false);
            }}
          >
            {grouped ? "关闭项目" : "删除项目"}
          </button>
        </div>
      )}
      {moved && (
        <small className="project-moved-status">
          {grouped ? "已标记为移出项目组" : "已标记为待移动"}
        </small>
      )}
    </div>
  );
}
