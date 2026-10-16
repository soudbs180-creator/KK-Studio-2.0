import { useEffect, useMemo, useState } from "react";
import type { RefObject } from "react";
import type { CreationProject } from "../features/creation/model";
import type { ProjectLibraryActions } from "../features/projects/projectLifecycle";
import {
  resolveSidebarFolders,
  sidebarProjectItem,
  sortSidebarProjects,
} from "../features/projects/sidebarProjectModel";
import SidebarProjectSections from "./SidebarProjectSections";
import SidebarProjectHeader from "./SidebarProjectHeader";
import SidebarProjectEntry from "./SidebarProjectEntry";

/** Project data and membership come from the durable creation snapshot. */
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
  projectActions,
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
  projectActions: ProjectLibraryActions;
}) {
  const [groups, setGroups] = useState([true, true]);
  const [showTrash, setShowTrash] = useState(false);
  const [projectFilter, setProjectFilter] = useState<"all" | "ungrouped">(
    "all",
  );
  const [sortMode, setSortMode] = useState<"manual" | "recent" | "priority">(
    "manual",
  );
  const [collapsedFolders, setCollapsedFolders] = useState(new Set<string>());
  const [pinnedProjectIds, setPinnedProjectIds] = useState(new Set<string>());
  const [pinnedFolderIds, setPinnedFolderIds] = useState(new Set<string>());
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  const normalProjects = useMemo(
    () => projects.filter((project) => project.trashedAt === undefined),
    [projects],
  );
  const trash = projects.filter((project) => project.trashedAt !== undefined);
  const items = useMemo(
    () => normalProjects.map(sidebarProjectItem),
    [normalProjects],
  );
  useEffect(() => {
    if (newProjectId && items.some((item) => item.id === newProjectId))
      setNewProjectId(null);
  }, [items, newProjectId]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const folders = projectActions.groups.map((group) => ({
    id: group.id,
    title: group.name,
    deleted: group.deletedAt !== undefined,
    expanded: !collapsedFolders.has(group.id),
    children: normalProjects
      .filter((project) => project.groupId === group.id)
      .map(sidebarProjectItem),
  }));
  const sortedUngroupedProjects = sortSidebarProjects(
    items.filter(
      (item) =>
        !normalProjects.find((project) => project.id === item.id)?.groupId,
    ),
    normalProjects,
    pinnedProjectIds,
    sortMode,
  );
  const visibleFolders = resolveSidebarFolders(
    folders,
    itemById,
    normalProjects,
    pinnedProjectIds,
    pinnedFolderIds,
    sortMode,
  );
  function togglePin(set: typeof setPinnedProjectIds, id: string): void {
    set((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function openProject(id: string): void {
    if (!itemById.has(id)) return;
    setCollapsedFolders(new Set(folders.map((folder) => folder.id)));
    onOpenProject(id);
  }
  function revealFolders(): void {
    setShowTrash(false);
    setProjectFilter("all");
    setGroups((current) => [true, current[1]]);
  }
  function moveProjectToFolder(projectId: string, folderId: string): void {
    revealFolders();
    setCollapsedFolders((current) => {
      const next = new Set(current);
      next.delete(folderId);
      return next;
    });
    projectActions.onMove(projectId, folderId || undefined);
  }
  function createFolderForProject(projectId: string): void {
    const item = itemById.get(projectId);
    if (!item) return;
    revealFolders();
    projectActions.onCreateGroup(item.title, projectId);
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
        canEditProjects={canEditProjects}
        onToggleTitle={() => setGroups((current) => [!current[0], current[1]])}
        onToggleMenu={onToggleProjectMenu}
        onCloseMenu={onCloseMenu}
        onCreateFolder={() => {
          revealFolders();
          projectActions.onCreateGroup();
        }}
        onFilterChange={setProjectFilter}
        onSortChange={setSortMode}
        showTrash={showTrash}
        trashCount={trash.length}
        onToggleTrash={() => setShowTrash((value) => !value)}
      />
      {showTrash ? (
        <div
          className="project-trash-list"
          hidden={collapsed}
          aria-label="侧栏项目垃圾箱"
        >
          {trash.map((project) => (
            <SidebarProjectEntry
              key={project.id}
              visible={!collapsed}
              selected={false}
              defaultTitle={project.name}
              trashed
              canEditProject={canEditProjects}
              onRestore={() => projectActions.onRestore(project.id)}
              onNavigate={() => undefined}
            />
          ))}
          {!trash.length && (
            <small className="project-folder-empty">垃圾箱为空</small>
          )}
        </div>
      ) : (
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
          onToggleProjectPin={(id) => togglePin(setPinnedProjectIds, id)}
          isFolderPinned={(id) => pinnedFolderIds.has(id)}
          onToggleFolderPin={(id) => togglePin(setPinnedFolderIds, id)}
          openProject={openProject}
          openFolder={(id) => {
            const child = visibleFolders.find((folder) => folder.id === id)
              ?.children[0];
            if (child) onOpenProject(child.id);
            else onNavigate("projects");
          }}
          createUngroupedProject={() => {
            if (!canEditProjects) return;
            setGroups((current) => [current[0], true]);
            setNewProjectId(onCreateProject());
          }}
          toggleFolder={(id) => togglePin(setCollapsedFolders, id)}
          renameFolder={projectActions.onRenameGroup}
          deleteFolder={(id) => {
            setGroups((current) => [current[0], true]);
            projectActions.onDeleteGroup(id);
          }}
          restoreFolder={projectActions.onRestoreGroup}
          renameProject={(id, title) => {
            projectActions.onRename(id, title);
            setNewProjectId(null);
          }}
          deleteProject={projectActions.onTrash}
          deleteDisabledReason={projectActions.trashDisabledReason}
          dropProject={(folderId, projectId) =>
            moveProjectToFolder(projectId, folderId)
          }
          dropToSection={(projectId) => {
            if (
              !normalProjects.find((project) => project.id === projectId)
                ?.groupId
            )
              createFolderForProject(projectId);
          }}
          moveProjectToFolder={moveProjectToFolder}
          createFolderForProject={createFolderForProject}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
