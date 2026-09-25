import type { KeyboardEvent, RefObject } from "react";

function focusMenuItem(event: KeyboardEvent<HTMLDivElement>): void {
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
  const current = items.indexOf(document.activeElement as HTMLButtonElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
  items[next]?.focus();
}

export default function SidebarFolderMenu({
  menuRef,
  pinned,
  onTogglePinned,
  onRename,
  onDelete,
}: {
  menuRef: RefObject<HTMLDivElement>;
  pinned: boolean;
  onTogglePinned: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={menuRef}
      className="project-menu"
      role="menu"
      aria-label="项目组设置"
      onKeyDown={focusMenuItem}
    >
      <button role="menuitem" onClick={onTogglePinned}>
        {pinned ? "取消置顶文件夹" : "置顶文件夹"}
      </button>
      <button role="menuitem" onClick={onRename}>
        改名字
      </button>
      <button role="menuitem" onClick={onDelete}>
        删除项目组
      </button>
    </div>
  );
}
