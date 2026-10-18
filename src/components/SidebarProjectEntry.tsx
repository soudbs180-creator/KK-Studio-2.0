import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDismissible } from "./useDismissible";
import ProjectEntryMenu from "./ProjectEntryMenu";
import {
  SIDEBAR_PROJECT_DRAG_TYPE,
  SIDEBAR_PROJECT_TITLE_TYPE,
  type SidebarProjectVisual,
} from "../features/projects/sidebarProjectModel";

/**
 * 侧栏项目行（未分组项目、文件夹二级项目通用）。
 *
 * - 行右侧两个按钮：置顶、更多设置（改名字 / 移动到项目组 / 删除）；
 * - "移动到项目组"打开子面板：列出项目文件夹，或新建以项目命名的文件夹；
 * - 未分组项目行可拖拽（拖到文件夹或"项目"区空白处收纳）。
 */
export default function SidebarProjectEntry({
  visible,
  selected,
  onNavigate,
  defaultTitle,
  autoEdit = false,
  draggable = false,
  dragId,
  onDragStart,
  moveTargets = [],
  onMoveToFolder,
  onMoveNewFolder,
  onRename,
  onDelete,
  onRestore,
  trashed = false,
  deleteDisabledReason,
  pinned = false,
  onTogglePin,
  canEditProject = true,
  visual,
}: {
  visible: boolean;
  selected: boolean;
  onNavigate: (id: string) => void;
  defaultTitle?: string;
  autoEdit?: boolean;
  draggable?: boolean;
  dragId?: string;
  onDragStart?: (id: string) => void;
  moveTargets?: { id: string; title: string }[];
  onMoveToFolder?: (folderId: string) => void;
  onMoveNewFolder?: () => void;
  onRename?: (title: string) => void;
  onDelete?: () => void;
  onRestore?: () => void;
  trashed?: boolean;
  deleteDisabledReason?: string;
  pinned?: boolean;
  onTogglePin?: () => void;
  canEditProject?: boolean;
  visual?: SidebarProjectVisual;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const editActive = useRef(autoEdit);
  const [title, setTitle] = useState(defaultTitle ?? "未命名项目");
  const [editing, setEditing] = useState(autoEdit);
  const root = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useDismissible(
    menuOpen && visible,
    menuRef,
    () => {
      setMenuOpen(false);
    },
    menuTrigger,
  );
  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);

      setEditing(false);
    }
  }, [visible]);
  useEffect(() => {
    if (!editing) setTitle(defaultTitle ?? "未命名项目");
  }, [defaultTitle, editing]);
  useLayoutEffect(() => {
    if (menuOpen && visible)
      root.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
  }, [menuOpen, visible]);
  function closeMenus(): void {
    setMenuOpen(false);
  }
  function commitTitle(): void {
    if (!editActive.current) return;
    editActive.current = false;
    const next = title.trim();
    if (next) onRename?.(next);
    setEditing(false);
  }
  return (
    <div
      ref={root}
      className={`project-entry ${pinned ? "is-pinned" : ""}`}
      hidden={!visible}
      draggable={draggable && !editing && !menuOpen}
      onDragStart={
        draggable && dragId
          ? (event) => {
              event.dataTransfer.setData(SIDEBAR_PROJECT_DRAG_TYPE, dragId);
              event.dataTransfer.setData(SIDEBAR_PROJECT_TITLE_TYPE, title);
              event.dataTransfer.effectAllowed = "move";
              onDragStart?.(dragId);
            }
          : undefined
      }
    >
      {editing ? (
        <input
          className="project-title-input"
          value={title}
          aria-label="项目名称"
          maxLength={120}
          autoFocus
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitTitle();
            if (event.key === "Escape") {
              editActive.current = false;
              setTitle(defaultTitle ?? "未命名项目");
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          className={`project-link ${selected ? "is-selected" : ""}`}
          aria-current={selected ? "page" : undefined}
          disabled={trashed}
          onClick={() => {
            closeMenus();
            onNavigate("workspace");
          }}
        >
          {visual ? (
            <span
              className={`project-thumb project-thumb-${visual.kind}`}
              style={
                visual.kind !== "image"
                  ? { background: visual.color }
                  : undefined
              }
            >
              {visual.kind === "image" && (
                <img
                  className="project-thumb-image-src"
                  src={visual.src}
                  alt=""
                />
              )}
              {visual.kind === "chat" && (
                <img
                  className="project-thumb-chat-icon"
                  src="/design/figma/project-chat-glyph.svg"
                  alt=""
                />
              )}
            </span>
          ) : (
            <span className="project-yellow" />
          )}
          <span>{title}</span>
        </button>
      )}
      {onTogglePin && !trashed && (
        <button
          className="project-pin"
          aria-label={pinned ? "取消置顶项目" : "置顶项目"}
          aria-pressed={pinned}
          title={
            canEditProject
              ? pinned
                ? "取消置顶项目"
                : "置顶项目"
              : "项目存储尚未就绪"
          }
          disabled={!canEditProject}
          onClick={onTogglePin}
        >
          <img
            className="project-action-container"
            src="/design/figma/project-pin-container.svg"
            alt=""
          />
        </button>
      )}
      <button
        ref={menuTrigger}
        className="project-more"
        aria-label="更多项目设置"
        aria-expanded={menuOpen}
        title="更多项目设置"
        onClick={() => {
          setMenuOpen((value) => !value);
        }}
      >
        <img
          className="project-action-container"
          src="/design/figma/project-more-container.svg"
          alt=""
        />
      </button>
      {menuOpen && (
        <ProjectEntryMenu
          menuRef={menuRef}
          canEdit={canEditProject}
          trashed={trashed}
          deleteDisabledReason={deleteDisabledReason}
          moveTargets={moveTargets}
          onOpen={() => onNavigate("workspace")}
          onRename={() => {
            editActive.current = true;
            setEditing(true);
          }}
          onDelete={onDelete}
          onRestore={onRestore}
          onMove={onMoveToFolder}
          onNewGroup={onMoveNewFolder}
          onClose={closeMenus}
        />
      )}
    </div>
  );
}
