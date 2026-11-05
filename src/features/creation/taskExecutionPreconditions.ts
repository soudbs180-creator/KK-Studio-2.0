import type React from "react";
import {
  requiredApprovalGates,
  type ApprovalGate,
} from "../../domain/agentWorkflow.ts";
import { validateCertified } from "../../domain/ontologyCertification.ts";
import type {
  CreationProject,
  CreationTask,
  CreationSnapshot,
} from "./model.ts";
import { readOntology, writeOntology } from "./ontologyStore.ts";

export function validateTaskExecutionPreconditions(options: {
  queryOnly?: boolean;
  project?: CreationProject;
  task?: CreationTask;
  taskId: string;
  projectId: string;
  taskControllers: React.MutableRefObject<Record<string, AbortController>>;
  pendingApprovalRef: React.MutableRefObject<{
    projectId: string;
    taskId: string;
    gates: ApprovalGate[];
  } | null>;
  setPendingApproval: React.Dispatch<
    React.SetStateAction<{
      projectId: string;
      taskId: string;
      gates: ApprovalGate[];
    } | null>
  >;
  updateProject: (
    projectId: string,
    updater: (p: CreationProject) => CreationProject,
  ) => void;
  creationRef: React.MutableRefObject<CreationSnapshot>;
}): boolean {
  const {
    project,
    task,
    taskId,
    projectId,
    taskControllers,
    pendingApprovalRef,
    setPendingApproval,
    updateProject,
    creationRef,
  } = options;
  if (!project || !task || taskControllers.current[taskId]) return false;
  if (task.imageEdit) {
    const live =
      creationRef.current.projects.find((p) => p.id === projectId) ?? project;
    if (
      live.tasks.some(
        (other) =>
          other.id !== taskId &&
          other.imageEdit?.groupId === task.imageEdit?.groupId &&
          taskControllers.current[other.id],
      )
    )
      return false;
    if (
      pendingApprovalRef.current &&
      pendingApprovalRef.current.taskId !== taskId
    )
      return false;
  }
  if (
    !options.queryOnly &&
    (task.status === "unknown" ||
      task.submissionState === "unknown" ||
      task.submissionState === "submitted")
  )
    return false;
  const missingGates = requiredApprovalGates({
    privacyMode: task.privacyMode,
    requestedOutputs: task.requestedOutputs,
    providerBaseUrl: task.providerBaseUrl,
  }).filter((gate) => !task.approvedGates?.includes(gate));
  if (
    certificationBlocks(
      project,
      task,
      projectId,
      taskId,
      updateProject,
      options.queryOnly,
    )
  )
    return false;
  if (missingGates.length) {
    pendingApprovalRef.current = { projectId, taskId, gates: missingGates };
    setPendingApproval({ projectId, taskId, gates: missingGates });
    updateProject(projectId, (current) => ({
      ...current,
      tasks: current.tasks.map((item) =>
        item.id === taskId
          ? {
              ...item,
              status: "queued",
              error: "等待人工审批，尚未提交到供应商。",
            }
          : item,
      ),
    }));
    return false;
  }
  return true;
}

function certificationBlocks(
  project: CreationProject,
  task: CreationTask,
  projectId: string,
  taskId: string,
  updateProject: (
    projectId: string,
    updater: (current: CreationProject) => CreationProject,
  ) => void,
  queryOnly?: boolean,
): boolean {
  if (queryOnly || !task.prompt) return false;
  if (!["image", "video", "text", "audio"].includes(task.kind)) return false;
  const record = readOntology(project.id);
  const report = validateCertified(task.prompt, record.concepts);
  if (report.ok) return false;
  const question = report.questions.map((item) => item.question).join(" ");
  writeOntology(project.id, record.concepts, report.questions);
  updateProject(projectId, (current) => ({
    ...current,
    items: current.items.map((item) =>
      item.id === task.sourceItemId
        ? { ...item, generationStatus: "error" as const }
        : item,
    ),
    tasks: current.tasks.map((item) =>
      item.id === taskId
        ? { ...item, status: "failed" as const, error: question }
        : item,
    ),
  }));
  return true;
}
