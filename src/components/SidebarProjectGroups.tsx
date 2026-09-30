import { useMemo, useState } from "react";
import type { RefObject } from "react";
import type { CreationProject } from "../features/creation/model";
import { projectHasUnsettledTasks } from "../features/creation/model";
import {
  createSidebarId,
  restoreSidebarFolder,
  sidebarProjectItem,
  sortSidebarProjects,
  type SidebarFolderItem,
  type SidebarProjectItem,
} from "../features/projects/sidebarProjectModel";
import SidebarProjectSections from "./SidebarProjectSections";
import SidebarProjectHeader from "./SidebarProjectHeader";

/** 真实项目列表 + 会话内文件夹收纳；不创建演示项目。 */
export default function SidebarProjectGroups({
  collapsed,
  projectMenuOpen,
  menuRef,
  filterTriggerRef,
  projects,
  activeProjectId,
  canEditProjects,
  onToggleProjectMenu,
  onCloseMenu,
  onNavigate,
  onCreateProject,
  onOpenProject,
  onRenameProject,
  onDeleteProject,
}: {
  collapsed: boolean;
  projectMenuOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  filterTriggerRef: RefObject<HTMLButtonElement>;
  projects: CreationProject[];
  activeProjectId: string | null;
  canEditProjects: boolean;
  onToggleProjectMenu: () => void;
  onCloseMenu: () => void;
  onNavigate: (id: string) => void;
  onCreateProject: () => string;
  onOpenProject: (id: string) => void;
  onRenameProject: (id: string, title: string) => void;
  onDeleteProject: (id: string) => void;
}) {
  const [groups, setGroups] = useState([true, true]);
  const [projectFilter, setProjectFilter] = useState<"all" | "ungrouped">(
    "all",
  );
  const [sortMode, setSortMode] = useState<"manual" | "recent" | "priority">(
    "manual",
  );
  const [folders, setFolders] = useState<SidebarFolderItem[]>([]);
  const [pinnedProjectIds, setPinnedProjectIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const items = useMemo(() => projects.map(sidebarProjectItem), [projects]);
  const itemById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const groupedIds = new Set(
    folders.flatMap((folder) =>
      folder.deleted ? [] : folder.children.map((child) => child.id),
    ),
  );
  const ungroupedProjects = items.filter((item) => !groupedIds.has(item.id));
  const sortedUngroupedProjects = sortSidebarProjects(
    ungroupedProjects,
    projects,
    pinnedProjectIds,
    sortMode,
  );
  const visibleFolders = folders
    .map((folder) => ({
      ...folder,
      children: sortSidebarProjects(
        folder.children.flatMap((child) => {
          const item = itemById.get(child.id);
          return item ? [item] : [];
        }),
        projects,
        pinnedProjectIds,
        sortMode,
      ),
    }))
    .sort(
      (a, b) =>
        Number(pinnedFolderIds.has(b.id)) - Number(pinnedFolderIds.has(a.id)),
    );

  function toggleProjectPin(id: string): void {
    setPinnedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleFolderPin(id: string): void {
    setPinnedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collapseFolders(): void {
    setFolders((current) =>
      current.map((folder) => ({ ...folder, expanded: false })),
    );
  }
  function openProject(id: string): void {
    if (!itemById.has(id)) return;
    collapseFolders();
    onOpenProject(id);
  }
  function openFolder(id: string): void {
    const child = visibleFolders.find((folder) => folder.id === id)
      ?.children[0];
    if (child) onOpenProject(child.id);
    else onNavigate("projects");
  }
  function createFolder(): void {
    setProjectFilter("all");
    setFolders((current) => [
      ...current,
      {
        id: createSidebarId(),
        title:
          current.length === 0
            ? "新建文件夹"
            : "新建文件夹 " + (current.length + 1),
        expanded: true,
        children: [],
      },
    ]);
  }
  function createUngroupedProject(): void {
    if (!canEditProjects) return;
    setNewProjectId(onCreateProject());
  }
  function toggleFolder(id: string): void {
    setFolders((current) =>
      current.map((folder) =>
        folder.id === id ? { ...folder, expanded: !folder.expanded } : folder,
      ),
    );
  }
  function renameFolder(id: string, title: string): void {
    const next = title.trim();
    if (!next) return;
    setFolders((current) =>
      current.map((folder) =>
        folder.id === id ? { ...folder, title: next } : folder,
      ),
    );
  }
  function deleteFolder(id: string): void {
    setFolders((current) =>
      current.map((folder) =>
        folder.id === id ? { ...folder, deleted: true } : folder,
      ),
    );
  }
  function restoreFolder(id: string): void {
    setFolders((current) => restoreSidebarFolder(current, id));
  }
  function renameProject(id: string, title: string): void {
    if (canEditProjects) onRenameProject(id, title);
    setNewProjectId(null);
  }
  function fromId(id: string): SidebarProjectItem | undefined {
    return itemById.get(id);
  }
  function dropToSection(projectId: string): void {
    const item = fromId(projectId);
    if (!item || groupedIds.has(projectId)) return;
    setFolders((current) => [
      ...current,
      {
        id: createSidebarId(),
        title: item.title,
        expanded: true,
        children: [item],
      },
    ]);
  }
  function dropProject(folderId: string, projectId: string): void {
    moveProjectToFolder(projectId, folderId);
  }
  function moveProjectToFolder(projectId: string, folderId: string): void {
    const item = fromId(projectId);
    if (!item) return;
    setFolders((current) =>
      current.map((folder) => ({
        ...folder,
        expanded: folder.id === folderId ? true : folder.expanded,
        children:
          folder.id === folderId
            ? [
                ...folder.children.filter((child) => child.id !== projectId),
                item,
              ]
            : folder.children.filter((child) => child.id !== projectId),
      })),
    );
  }
  function createFolderForProject(projectId: string): void {
    const item = fromId(projectId);
    if (!item) return;
    setFolders((current) => [
      ...current.map((folder) => ({
        ...folder,
        children: folder.children.filter((child) => child.id !== projectId),
      })),
      {
        id: createSidebarId(),
        title: item.title,
        expanded: true,
        children: [item],
      },
    ]);
  }
  function deleteDisabledReason(id: string): string | undefined {
    if (!canEditProjects) return "项目存储尚未就绪";
    const project = projects.find((item) => item.id === id);
    if (project && projectHasUnsettledTasks(project))
      return "项目仍有未完成或状态不明的任务，请先处理任务";
    return undefined;
  }
  return (
    <div className="project-groups">
      <SidebarProjectHeader
        expanded={groups[0]}
        projectFilter={projectFilter}
        sortMode={sortMode}
        projectMenuOpen={projectMenuOpen}
        menuRef={menuRef}
        filterTriggerRef={filterTriggerRef}
        onToggleTitle={() =>
          setGroups(
            groups.map((value, index) => (index === 0 ? !value : value)),
          )
        }
        onToggleMenu={onToggleProjectMenu}
        onCloseMenu={onCloseMenu}
        onCreateFolder={createFolder}
        onFilterChange={setProjectFilter}
        onSortChange={setSortMode}
      />
      <SidebarProjectSections
        collapsed={collapsed}
        groups={groups}
        projectFilter={projectFilter}
        setGroups={setGroups}
        ungroupedProjects={sortedUngroupedProjects}
        folders={visibleFolders}
        activeProjectId={activeProjectId}
        newProjectId={newProjectId}
        canEditProjects={canEditProjects}
        isProjectPinned={(id) => pinnedProjectIds.has(id)}
        onToggleProjectPin={toggleProjectPin}
        isFolderPinned={(id) => pinnedFolderIds.has(id)}
        onToggleFolderPin={toggleFolderPin}
        openProject={openProject}
        openFolder={openFolder}
        createUngroupedProject={createUngroupedProject}
        toggleFolder={toggleFolder}
        renameFolder={renameFolder}
        deleteFolder={deleteFolder}
        restoreFolder={restoreFolder}
        renameProject={renameProject}
        deleteProject={onDeleteProject}
        deleteDisabledReason={deleteDisabledReason}
        dropProject={dropProject}
        dropToSection={dropToSection}
        moveProjectToFolder={moveProjectToFolder}
        createFolderForProject={createFolderForProject}
        onNavigate={onNavigate}
      />
    </div>
  );
}
