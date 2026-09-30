import { useState } from "react";
import type { DragEvent } from "react";
import type { Dispatch, SetStateAction } from "react";
import SidebarProjectEntry from "./SidebarProjectEntry";
import SidebarGroupHeading from "./SidebarGroupHeading";
import SidebarFolderGroup from "./SidebarFolderGroup";
import {
  SIDEBAR_PROJECT_DRAG_TYPE,
  SIDEBAR_PROJECT_TITLE_TYPE,
  type SidebarFolderItem,
  type SidebarProjectItem,
} from "../features/projects/sidebarProjectModel";

/**
 * 侧栏"项目 / 未分组"两个分组的条目渲染。
 *
 * - "项目"组第一层：项目文件夹（可展开/收起，含子项目第二层）；
 *   该组空白处也是拖放目标：未分组项目拖入时自动创建以项目命名的文件夹；
 * - "未分组"组：可拖拽的未分组项目行，可拖入文件夹或项目区收纳；
 * - 折叠语义：文件夹点击收起二级；「项目」标题整组折叠；项目条目点击
 *   收起全部文件夹；「未分组」标题折叠全部。
 */
export default function SidebarProjectSections({
  collapsed,
  groups,
  projectFilter,
  setGroups,
  ungroupedProjects,
  folders,
  activeProjectId,
  newProjectId,
  canEditProjects,
  isProjectPinned,
  onToggleProjectPin,
  isFolderPinned,
  onToggleFolderPin,
  openProject,
  openFolder,
  createUngroupedProject,
  toggleFolder,
  renameFolder,
  deleteFolder,
  restoreFolder,
  renameProject,
  deleteProject,
  deleteDisabledReason,
  dropProject,
  dropToSection,
  moveProjectToFolder,
  createFolderForProject,
  onNavigate,
}: {
  collapsed: boolean;
  groups: boolean[];
  projectFilter: "all" | "ungrouped";
  setGroups: Dispatch<SetStateAction<boolean[]>>;
  ungroupedProjects: SidebarProjectItem[];
  folders: SidebarFolderItem[];
  activeProjectId: string | null;
  newProjectId: string | null;
  canEditProjects: boolean;
  isProjectPinned: (id: string) => boolean;
  onToggleProjectPin: (id: string) => void;
  isFolderPinned: (id: string) => boolean;
  onToggleFolderPin: (id: string) => void;
  openProject: (id: string) => void;
  openFolder: (id: string) => void;
  createUngroupedProject: () => void;
  toggleFolder: (id: string) => void;
  renameFolder: (id: string, title: string) => void;
  deleteFolder: (id: string) => void;
  restoreFolder: (id: string) => void;
  renameProject: (id: string, title: string) => void;
  deleteProject: (id: string) => void;
  deleteDisabledReason: (id: string) => string | undefined;
  dropProject: (folderId: string, projectId: string, title: string) => void;
  dropToSection: (projectId: string, title: string) => void;
  moveProjectToFolder: (projectId: string, folderId: string) => void;
  createFolderForProject: (projectId: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [sectionDragOver, setSectionDragOver] = useState(false);
  function acceptProject(event: DragEvent<HTMLElement>): boolean {
    return event.dataTransfer.types.includes(SIDEBAR_PROJECT_DRAG_TYPE);
  }
  return (
    <>
      {(["项目", "未分组"] as const).map((name, i) => {
        const groupedVisible =
          !collapsed && groups[i] && (i === 1 || projectFilter === "all");
        const moveTargets = folders
          .filter((folder) => !folder.deleted)
          .map((folder) => ({
            id: folder.id,
            title: folder.title,
          }));
        return (
          <section
            key={name}
            hidden={i === 0 && projectFilter !== "all"}
            className={sectionDragOver && i === 0 ? "is-drag-target" : ""}
            onDragOver={
              i === 0
                ? (event) => {
                    if (!acceptProject(event)) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setSectionDragOver(true);
                  }
                : undefined
            }
            onDragLeave={i === 0 ? () => setSectionDragOver(false) : undefined}
            onDrop={
              i === 0
                ? (event) => {
                    event.preventDefault();
                    setSectionDragOver(false);
                    const projectId = event.dataTransfer.getData(
                      SIDEBAR_PROJECT_DRAG_TYPE,
                    );
                    const title = event.dataTransfer.getData(
                      SIDEBAR_PROJECT_TITLE_TYPE,
                    );
                    if (projectId) dropToSection(projectId, title);
                  }
                : undefined
            }
          >
            {i === 1 && (
              <SidebarGroupHeading
                expanded={groups[i]}
                onToggle={() =>
                  setGroups(groups.map((v, index) => (i === index ? !v : v)))
                }
                onOpenLibrary={() => onNavigate("projects")}
                onCreateProject={createUngroupedProject}
                canCreateProject={canEditProjects}
              />
            )}
            {i === 0 ? (
              folders.map((folder) => (
                <SidebarFolderGroup
                  key={folder.id}
                  folder={folder}
                  visible={groupedVisible}
                  moveTargets={moveTargets.filter(
                    (target) => target.id !== folder.id,
                  )}
                  onToggle={toggleFolder}
                  onRename={renameFolder}
                  onDelete={deleteFolder}
                  onRestore={restoreFolder}
                  onRenameProject={renameProject}
                  onDeleteProject={deleteProject}
                  deleteDisabledReason={deleteDisabledReason}
                  activeProjectId={activeProjectId}
                  canEditProjects={canEditProjects}
                  pinned={isFolderPinned(folder.id)}
                  onTogglePinned={onToggleFolderPin}
                  isProjectPinned={isProjectPinned}
                  onToggleProjectPin={onToggleProjectPin}
                  onDropProject={dropProject}
                  onOpenProject={openProject}
                  onOpenFolder={openFolder}
                  onMoveProjectToFolder={moveProjectToFolder}
                  onCreateFolderForProject={createFolderForProject}
                />
              ))
            ) : (
              <div className="project-group-content" hidden={!groupedVisible}>
                {ungroupedProjects.map((project) => (
                  <SidebarProjectEntry
                    key={project.id}
                    visible={groupedVisible}
                    defaultTitle={project.title}
                    autoEdit={project.id === newProjectId}
                    draggable
                    dragId={project.id}
                    selected={activeProjectId === project.id}
                    visual={project.visual}
                    moveTargets={moveTargets}
                    onMoveToFolder={(folderId) =>
                      moveProjectToFolder(project.id, folderId)
                    }
                    onMoveNewFolder={() => createFolderForProject(project.id)}
                    onRename={(title) => renameProject(project.id, title)}
                    onDelete={() => deleteProject(project.id)}
                    deleteDisabledReason={deleteDisabledReason(project.id)}
                    canEditProject={canEditProjects}
                    pinned={isProjectPinned(project.id)}
                    onTogglePin={() => onToggleProjectPin(project.id)}
                    onNavigate={() => openProject(project.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
