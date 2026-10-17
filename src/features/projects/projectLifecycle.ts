import {
  projectHasUnsettledTasks,
  type CreationProjectGroup,
  type CreationSnapshot,
} from "../creation/model.ts";

export type ProjectLifecycleAction =
  | { type: "rename-project"; id: string; name: string }
  | { type: "trash-project" | "restore-project"; id: string }
  | { type: "move-project"; id: string; groupId?: string }
  | { type: "create-group"; id: string; name: string; projectId?: string }
  | { type: "rename-group"; id: string; name: string }
  | { type: "delete-group" | "restore-group"; id: string };

export interface ProjectLibraryActions {
  groups: CreationProjectGroup[];
  canEdit: boolean;
  onRename: (id: string, name: string) => void;
  onTrash: (id: string) => void;
  onRestore: (id: string) => void;
  onMove: (id: string, groupId?: string) => void;
  onCreateGroup: (name?: string, projectId?: string) => void;
  onRenameGroup: (id: string, name: string) => void;
  onDeleteGroup: (id: string) => void;
  onRestoreGroup: (id: string) => void;
  trashDisabledReason: (id: string) => string | undefined;
}

function name(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 120)
    throw new Error("名称不能为空且不能超过 120 个字符。");
  return trimmed;
}

function changeGroup(
  snapshot: CreationSnapshot,
  action: ProjectLifecycleAction,
  now: number,
): CreationSnapshot {
  const groups = snapshot.projectGroups ?? [];
  const group = groups.find((group) => group.id === action.id);
  if (!group) throw new Error("项目分组已不可用，请重新读取。");
  return {
    ...snapshot,
    projectGroups: groups.map((group) =>
      group.id !== action.id
        ? group
        : action.type === "rename-group"
          ? { ...group, name: name(action.name) }
          : {
              ...group,
              deletedAt: action.type === "delete-group" ? now : undefined,
            },
    ),
    projects:
      action.type === "delete-group"
        ? snapshot.projects.map((project) =>
            project.groupId === action.id
              ? { ...project, groupId: undefined }
              : project,
          )
        : snapshot.projects,
  };
}

/** Shared snapshot mutation: caller owns CAS persistence and reports save failures. */
export function applyProjectLifecycle(
  snapshot: CreationSnapshot,
  action: ProjectLifecycleAction,
  now = Date.now(),
): CreationSnapshot {
  const groups = snapshot.projectGroups ?? [];
  if (action.type === "create-group") {
    if (
      !action.id.trim() ||
      action.id.length > 160 ||
      groups.some((group) => group.id === action.id)
    )
      throw new Error("项目组身份无效或已存在。");
    if (
      action.projectId &&
      !snapshot.projects.some(
        (project) =>
          project.id === action.projectId && project.trashedAt === undefined,
      )
    )
      throw new Error("项目已不可用，请重新读取。");
    return {
      ...snapshot,
      projectGroups: [...groups, { id: action.id, name: name(action.name) }],
      projects: snapshot.projects.map((project) =>
        project.id === action.projectId
          ? { ...project, groupId: action.id, updatedAt: now }
          : project,
      ),
    };
  }
  if (["rename-group", "delete-group", "restore-group"].includes(action.type)) {
    return changeGroup(snapshot, action, now);
  }
  const project = snapshot.projects.find((project) => project.id === action.id);
  if (!project) throw new Error("项目已不可用，请重新读取。");
  if (action.type === "trash-project" && projectHasUnsettledTasks(project))
    throw new Error("项目仍有未完成或状态不明的任务，请先处理任务。");
  if (
    action.type === "move-project" &&
    action.groupId &&
    !groups.some(
      (group) => group.id === action.groupId && group.deletedAt === undefined,
    )
  )
    throw new Error("项目分组已不可用，请重新读取。");
  const updated =
    action.type === "rename-project"
      ? { ...project, name: name(action.name), nameSource: "manual" as const }
      : action.type === "move-project"
        ? { ...project, groupId: action.groupId }
        : {
            ...project,
            trashedAt: action.type === "trash-project" ? now : undefined,
          };
  return {
    ...snapshot,
    activeProjectId:
      action.type === "trash-project" && snapshot.activeProjectId === project.id
        ? null
        : snapshot.activeProjectId,
    projects: snapshot.projects.map((project) =>
      project.id === action.id ? { ...updated, updatedAt: now } : project,
    ),
  };
}
