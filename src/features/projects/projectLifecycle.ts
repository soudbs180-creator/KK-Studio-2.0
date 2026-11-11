import {
  projectHasUnsettledTasks,
  type CreationProjectGroup,
  type CreationSnapshot,
  type SidebarPreferences,
  type SidebarSortMode,
} from "../creation/index.ts";

export type ProjectLifecycleAction =
  | { type: "set-sidebar-sort"; sortMode: SidebarSortMode }
  | { type: "toggle-project-pin" | "toggle-group-pin"; id: string }
  | { type: "rename-project"; id: string; name: string }
  | { type: "trash-project" | "restore-project"; id: string }
  | { type: "move-project"; id: string; groupId?: string }
  | { type: "create-group"; id: string; name: string; projectId?: string }
  | { type: "rename-group"; id: string; name: string }
  | { type: "delete-group" | "restore-group"; id: string };

export interface ProjectLibraryActions {
  groups: CreationProjectGroup[];
  sidebarPreferences: SidebarPreferences;
  onSetSidebarSortMode: (sortMode: SidebarSortMode) => void;
  onToggleProjectPin: (id: string) => void;
  onToggleGroupPin: (id: string) => void;
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
  action: Extract<
    ProjectLifecycleAction,
    { type: "rename-group" | "delete-group" | "restore-group" }
  >,
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

function applySidebarPreferenceAction(
  snapshot: CreationSnapshot,
  action: Extract<
    ProjectLifecycleAction,
    {
      type: "set-sidebar-sort" | "toggle-project-pin" | "toggle-group-pin";
    }
  >,
  groups: CreationProjectGroup[],
): CreationSnapshot {
  const preferences = snapshot.sidebarPreferences ?? {
    sortMode: "manual",
    pinnedProjectIds: [],
    pinnedGroupIds: [],
  };
  if (action.type === "set-sidebar-sort") {
    if (!["manual", "recent", "priority"].includes(action.sortMode))
      throw new Error("项目排序方式无效。");
    return {
      ...snapshot,
      sidebarPreferences: { ...preferences, sortMode: action.sortMode },
    };
  }
  const records =
    action.type === "toggle-project-pin" ? snapshot.projects : groups;
  if (!records.some((record) => record.id === action.id))
    throw new Error("项目或分组已不可用，请重新读取。");
  const key =
    action.type === "toggle-project-pin"
      ? "pinnedProjectIds"
      : "pinnedGroupIds";
  const ids = preferences[key];
  return {
    ...snapshot,
    sidebarPreferences: {
      ...preferences,
      [key]: ids.includes(action.id)
        ? ids.filter((id) => id !== action.id)
        : [...ids, action.id],
    },
  };
}

function applyCreateGroupAction(
  snapshot: CreationSnapshot,
  action: Extract<ProjectLifecycleAction, { type: "create-group" }>,
  groups: CreationProjectGroup[],
  now: number,
): CreationSnapshot {
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

function applyProjectAction(
  snapshot: CreationSnapshot,
  action: Extract<
    ProjectLifecycleAction,
    {
      type:
        "rename-project" | "trash-project" | "restore-project" | "move-project";
    }
  >,
  groups: CreationProjectGroup[],
  now: number,
): CreationSnapshot {
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

/** Shared snapshot mutation: caller owns CAS persistence and reports save failures. */
export function applyProjectLifecycle(
  snapshot: CreationSnapshot,
  action: ProjectLifecycleAction,
  now = Date.now(),
): CreationSnapshot {
  const groups = snapshot.projectGroups ?? [];
  switch (action.type) {
    case "set-sidebar-sort":
    case "toggle-project-pin":
    case "toggle-group-pin":
      return applySidebarPreferenceAction(snapshot, action, groups);
    case "create-group":
      return applyCreateGroupAction(snapshot, action, groups, now);
    case "rename-group":
    case "delete-group":
    case "restore-group":
      return changeGroup(snapshot, action, now);
    default:
      return applyProjectAction(snapshot, action, groups, now);
  }
}
