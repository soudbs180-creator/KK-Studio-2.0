import { useState, type KeyboardEvent, type RefObject } from "react";

function navigateMenu(event: KeyboardEvent<HTMLDivElement>): void {
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
  items[
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length
  ]?.focus();
}

export default function ProjectEntryMenu({
  menuRef,
  canEdit,
  trashed,
  deleteDisabledReason,
  moveTargets,
  onOpen,
  onRename,
  onDelete,
  onRestore,
  onMove,
  onNewGroup,
  onClose,
}: {
  menuRef: RefObject<HTMLDivElement>;
  canEdit: boolean;
  trashed: boolean;
  deleteDisabledReason?: string;
  moveTargets: { id: string; title: string }[];
  onOpen: () => void;
  onRename: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onMove?: (id: string) => void;
  onNewGroup?: () => void;
  onClose: () => void;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const unavailable = !canEdit
    ? "项目存储尚未就绪，请先处理保存或恢复提示"
    : undefined;
  function run(action: (() => void) | undefined): void {
    action?.();
    onClose();
  }
  return (
    <div
      ref={menuRef}
      className="project-menu"
      role="menu"
      aria-label="项目设置"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={navigateMenu}
    >
      {trashed ? (
        <button
          role="menuitem"
          disabled={!canEdit || !onRestore}
          title={unavailable}
          onClick={() => run(onRestore)}
        >
          恢复项目
        </button>
      ) : (
        <>
          <button role="menuitem" onClick={() => run(onOpen)}>
            打开编辑
          </button>
          <button
            role="menuitem"
            disabled={!canEdit}
            title={unavailable}
            onClick={() => run(onRename)}
          >
            改名字
          </button>
          <button
            role="menuitem"
            disabled={!canEdit}
            title={unavailable}
            aria-haspopup="menu"
            aria-expanded={moveOpen}
            onClick={() => setMoveOpen((value) => !value)}
          >
            移动到项目组
          </button>
          <button
            role="menuitem"
            disabled={Boolean(deleteDisabledReason) || !canEdit || !onDelete}
            title={
              deleteDisabledReason ?? unavailable ?? "移到垃圾箱，可随时恢复"
            }
            onClick={() => run(onDelete)}
          >
            删除项目
          </button>
          {moveOpen && (
            <div
              className="project-menu project-menu-sub"
              role="menu"
              aria-label="移动到项目组"
            >
              <button role="menuitem" onClick={() => run(() => onMove?.(""))}>
                未分组
              </button>
              {moveTargets.map((target) => (
                <button
                  key={target.id}
                  role="menuitem"
                  onClick={() => run(() => onMove?.(target.id))}
                >
                  {target.title}
                </button>
              ))}
              <button role="menuitem" onClick={() => run(onNewGroup)}>
                新建项目文件夹
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
