import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import SidebarProjectEntry from "./SidebarProjectEntry";
import SidebarFolderMenu from "./SidebarFolderMenu";
import { useDismissible } from "./useDismissible";
import {
  SIDEBAR_PROJECT_DRAG_TYPE,
  SIDEBAR_PROJECT_TITLE_TYPE,
  type SidebarFolderItem,
} from "../features/projects/sidebarProjectModel";

/**
 * 侧栏"项目"区内的项目文件夹行（第一层级容器）。
 *
 * - 点击文件夹行任意处（右侧两个按钮除外）切换展开/收起自身二级项目；
 * - 行右侧两个按钮：打开工作台、设置（置顶/改名字/删除项目组）；
 * - 未分组项目拖到文件夹行释放：收纳为该文件夹二级项目并展开；
 * - 文件夹二级为空时显示 Prototype 提示；有项目时渲染二级项目行，
 *   二级项目行自带三点菜单（改名字/移动到项目组/删除）。
 */
export default function SidebarFolderGroup({
  folder,
  visible,
  moveTargets,
  onToggle,
  onRename,
  onDelete,
  onRestore,
  onRenameProject,
  onDeleteProject,
  deleteDisabledReason,
  activeProjectId,
  canEditProjects,
  pinned,
  onTogglePinned,
  isProjectPinned,
  onToggleProjectPin,
  onDropProject,
  onOpenProject,
  onOpenFolder,
  onMoveProjectToFolder,
  onCreateFolderForProject,
}: {
  folder: SidebarFolderItem;
  visible: boolean;
  moveTargets: { id: string; title: string }[];
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onRenameProject: (id: string, title: string) => void;
  onDeleteProject: (id: string) => void;
  deleteDisabledReason: (id: string) => string | undefined;
  activeProjectId: string | null;
  canEditProjects: boolean;
  pinned: boolean;
  onTogglePinned: (id: string) => void;
  isProjectPinned: (id: string) => boolean;
  onToggleProjectPin: (id: string) => void;
  onDropProject: (folderId: string, projectId: string, title: string) => void;
  onOpenProject: (id: string) => void;
  onOpenFolder: (id: string) => void;
  onMoveProjectToFolder: (projectId: string, folderId: string) => void;
  onCreateFolderForProject: (projectId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(folder.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const editCancelled = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useDismissible(
    menuOpen && visible,
    menuRef,
    () => setMenuOpen(false),
    menuTrigger,
  );
  useLayoutEffect(() => {
    if (menuOpen && visible)
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
        ?.focus();
  }, [menuOpen, visible]);
  useEffect(() => {
    if (!visible) {
      setMenuOpen(false);
      setEditing(false);
    }
  }, [visible]);
  function acceptProject(event: DragEvent<HTMLElement>): boolean {
    return event.dataTransfer.types.includes(SIDEBAR_PROJECT_DRAG_TYPE);
  }
  function startEdit(): void {
    editCancelled.current = false;
    setEditTitle(folder.title);
    setEditing(true);
    setMenuOpen(false);
  }
  function commitEdit(): void {
    if (editing && !editCancelled.current) {
      const next = editTitle.trim();
      if (next) onRename(folder.id, next);
      setEditing(false);
    }
  }
  function cancelEdit(): void {
    editCancelled.current = true;
    setEditTitle(folder.title);
    setEditing(false);
  }
  if (folder.deleted)
    return (
      <button
        className="project-undo"
        hidden={!visible}
        onClick={() => onRestore(folder.id)}
      >
        恢复项目文件夹
      </button>
    );
  return (
    <div
      className={`project-folder-group ${pinned ? "is-pinned" : ""}`}
      hidden={!visible}
    >
      <div
        className={`folder-heading-row ${dragOver ? "is-drag-target" : ""}`}
        onDragOver={(event) => {
          if (!acceptProject(event)) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          if (!acceptProject(event)) return;
          event.preventDefault();
          event.stopPropagation();
          setDragOver(false);
          const projectId = event.dataTransfer.getData(
            SIDEBAR_PROJECT_DRAG_TYPE,
          );
          const title = event.dataTransfer.getData(SIDEBAR_PROJECT_TITLE_TYPE);
          if (projectId) onDropProject(folder.id, projectId, title);
        }}
      >
        {editing ? (
          <div className="folder-heading-toggle is-editing">
            <span className="project-folder">
              <img
                src="/design/figma/project-folder-glyph.svg"
                width="13"
                height="11"
                alt=""
              />
            </span>
            <input
              className="project-title-input"
              value={editTitle}
              aria-label="项目文件夹名称"
              autoFocus
              onChange={(event) => setEditTitle(event.target.value)}
              onBlur={commitEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitEdit();
                if (event.key === "Escape") cancelEdit();
              }}
            />
            <img
              className="sidebar-heading-chevron"
              src="/design/figma/project-chevron.svg"
              alt=""
            />
          </div>
        ) : (
          <button
            type="button"
            className="folder-heading-toggle"
            aria-expanded={folder.expanded}
            title="点击收起/展开文件夹；可把未分组项目拖到这里收纳（会话内 Prototype）"
            onClick={() => onToggle(folder.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenuOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.shiftKey && event.key === "F10") {
                event.preventDefault();
                setMenuOpen(true);
              }
            }}
          >
            <span className="project-folder">
              <img
                src="/design/figma/project-folder-glyph.svg"
                width="13"
                height="11"
                alt=""
              />
            </span>
            <span className="folder-heading-title">{folder.title}</span>
            <img
              className="sidebar-heading-chevron"
              src="/design/figma/project-chevron.svg"
              alt=""
            />
          </button>
        )}
        <button
          type="button"
          className="project-pin"
          aria-label={`打开 ${folder.title} 工作台`}
          title={
            folder.children.length ? "打开文件夹中的首个项目" : "文件夹尚无项目"
          }
          disabled={folder.children.length === 0}
          onClick={() => onOpenFolder(folder.id)}
        >
          <img
            className="project-action-container"
            src="/design/figma/project-open-container.svg"
            alt=""
          />
        </button>
        <button
          type="button"
          ref={menuTrigger}
          className="project-more"
          aria-label={`${folder.title} 设置`}
          aria-expanded={menuOpen}
          title="项目文件夹设置"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <img
            className="project-action-container"
            src="/design/figma/project-more-container.svg"
            alt=""
          />
        </button>
        {menuOpen && (
          <SidebarFolderMenu
            menuRef={menuRef}
            pinned={pinned}
            onTogglePinned={() => {
              onTogglePinned(folder.id);
              setMenuOpen(false);
              menuTrigger.current?.focus();
            }}
            onRename={startEdit}
            onDelete={() => {
              onDelete(folder.id);
              setMenuOpen(false);
            }}
          />
        )}
      </div>
      {folder.expanded && (
        <div className="project-nested-entry">
          {folder.children.length === 0 ? (
            <small className="project-folder-empty">
              临时文件夹（会话内 Prototype）：把未分组项目拖进来即可收纳。
            </small>
          ) : (
            folder.children.map((child) => (
              <SidebarProjectEntry
                key={child.id}
                visible
                defaultTitle={child.title}
                selected={activeProjectId === child.id}
                visual={child.visual}
                moveTargets={moveTargets}
                onMoveToFolder={(folderId) =>
                  onMoveProjectToFolder(child.id, folderId)
                }
                onMoveNewFolder={() => onCreateFolderForProject(child.id)}
                onRename={(title) => onRenameProject(child.id, title)}
                onDelete={() => onDeleteProject(child.id)}
                deleteDisabledReason={deleteDisabledReason(child.id)}
                canEditProject={canEditProjects}
                pinned={isProjectPinned(child.id)}
                onTogglePin={() => onToggleProjectPin(child.id)}
                onNavigate={() => onOpenProject(child.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
