import { useRef, useState } from "react";
import { confirmAction } from "../../runtime/confirmAction";
import { agentConnection } from "../agent/agentConnection";
import { googleAgentConnection } from "../agent/googleAgentConnection";
import { projectHasUnsettledTasks } from "../creation/model";
import type { useCreationStorage } from "../creation/useCreationStorage";
import {
  applyProjectLifecycle,
  type ProjectLibraryActions,
  type ProjectLifecycleAction,
} from "./projectLifecycle";
import { createSidebarId } from "./sidebarProjectModel";

/** Both entry points share the storage queue, live task guards and save receipts. */
export function useProjectLibrary(
  persistence: ReturnType<typeof useCreationStorage>,
  onActiveProjectTrashed: () => void,
) {
  const [actionMessage, report] = useState("");
  const current = useRef({ persistence, onActiveProjectTrashed, report });
  current.current = { persistence, onActiveProjectTrashed, report };
  function canWrite(): boolean {
    const state = current.current.persistence.state;
    return state === "saved" || state === "saving";
  }
  async function change(action: ProjectLifecycleAction): Promise<void> {
    const { persistence, report } = current.current;
    if (!canWrite()) {
      report("项目存储尚未就绪，请先处理保存或恢复提示。");
      return;
    }
    try {
      persistence.commitCreation(
        applyProjectLifecycle(persistence.creationRef.current, action),
      );
      report("");
      await persistence.flush();
    } catch (error) {
      report(
        error instanceof Error
          ? error.message
          : "项目修改未能保存，请重试或下载草稿。",
      );
    }
  }
  function trashDisabledReason(id: string): string | undefined {
    if (!canWrite()) return "项目存储尚未就绪，请先处理保存或恢复提示";
    const snapshot = current.current.persistence.creationRef.current;
    const project = snapshot.projects.find((project) => project.id === id);
    if (!project) return "项目已不可用，请重新读取";
    if (projectHasUnsettledTasks(project))
      return "项目仍有未完成或状态不明的任务，请先处理任务";
    const agent = agentConnection.getState();
    const google = googleAgentConnection.getState();
    if (
      (project.id === snapshot.activeProjectId ||
        (project.agentThreadId &&
          project.agentThreadId === agent.conversation?.threadId)) &&
      (agent.sending ||
        agent.preparing ||
        agent.pendingApproval ||
        agent.conversation?.status === "running" ||
        agent.conversation?.status === "preparing")
    )
      return "Agent 仍在执行或等待确认，请先处理任务";
    if (
      project.id === snapshot.activeProjectId &&
      (google.sending || google.pendingApproval || google.uncertain)
    )
      return "Google 请求仍未完成或状态不明，请先处理任务";
    return undefined;
  }
  async function trash(id: string): Promise<void> {
    const project =
      current.current.persistence.creationRef.current.projects.find(
        (project) => project.id === id,
      );
    if (!project) return;
    const reason = trashDisabledReason(id);
    if (reason) {
      current.current.report(reason);
      return;
    }
    if (
      !(await confirmAction(
        `将项目「${project.name}」移到垃圾箱？项目、聊天、画布和素材引用会保留，可随时恢复。`,
      ))
    )
      return;
    const snapshot = current.current.persistence.creationRef.current;
    const currentReason = trashDisabledReason(id);
    if (currentReason) {
      current.current.report(currentReason);
      return;
    }
    const saving = change({ type: "trash-project", id });
    if (
      snapshot.activeProjectId === id &&
      current.current.persistence.creationRef.current.activeProjectId === null
    )
      current.current.onActiveProjectTrashed();
    await saving;
  }
  const actions: ProjectLibraryActions = {
    groups: persistence.creation.projectGroups ?? [],
    sidebarPreferences: persistence.creation.sidebarPreferences ?? {
      sortMode: "manual",
      pinnedProjectIds: [],
      pinnedGroupIds: [],
    },
    canEdit: canWrite(),
    onSetSidebarSortMode: (sortMode) => {
      void change({ type: "set-sidebar-sort", sortMode });
    },
    onToggleProjectPin: (id) => {
      void change({ type: "toggle-project-pin", id });
    },
    onToggleGroupPin: (id) => {
      void change({ type: "toggle-group-pin", id });
    },
    onRename: (id, name) => {
      void change({ type: "rename-project", id, name });
    },
    onTrash: trash,
    onRestore: (id) => {
      void change({ type: "restore-project", id });
    },
    onMove: (id, groupId) => {
      void change({ type: "move-project", id, groupId });
    },
    onCreateGroup: (name, projectId) => {
      const count =
        current.current.persistence.creationRef.current.projectGroups?.length ??
        0;
      void change({
        type: "create-group",
        id: createSidebarId(),
        name: name ?? (count === 0 ? "新建文件夹" : `新建文件夹 ${count + 1}`),
        projectId,
      });
    },
    onRenameGroup: (id, name) => {
      void change({ type: "rename-group", id, name });
    },
    onDeleteGroup: (id) => {
      void change({ type: "delete-group", id });
    },
    onRestoreGroup: (id) => {
      void change({ type: "restore-group", id });
    },
    trashDisabledReason,
  };
  const projects = persistence.creation.projects.filter(
    (project) => project.trashedAt === undefined,
  );
  return {
    actions,
    projects,
    report,
    activeProject: projects.find(
      (project) => project.id === persistence.creation.activeProjectId,
    ),
    message: persistence.message || actionMessage,
  };
}
