import type { CreationSnapshot, CreationProject } from "../creation/model";
import type { SkillRegistry } from "../skills/skillRegistry";
import { composeAssistantPrompt } from "../assistants/assistantProfiles";
import { readProviderConnections } from "../creation/providerRegistry";
import { catalogForConnection } from "../models/modelCatalog";
import { isStrictLoopbackProviderUrl } from "../../domain/modelProvider";
import { requiredApprovalGates } from "../../domain/agentWorkflow";
import { prepareProviderConversationRound } from "./providerConversationRound";
export interface ProviderConversationInput {
  projectId: string;
  prompt: string;
  routes: Array<{ connectionId: string; modelId: string }>;
  assistantId?: string;
  remoteApproved: boolean;
}
export interface ProviderConversationSubmissionContext {
  creationRef: { current: CreationSnapshot };
  activeProjectIdRef: { current: string | null };
  skillRegistry: SkillRegistry;
  updateProject: (
    id: string,
    update: (project: CreationProject) => CreationProject,
  ) => void;
  flush: () => Promise<void>;
  executeTask: (
    projectId: string,
    taskId: string,
    project: CreationProject,
  ) => Promise<void>;
}
export async function submitProviderConversation(
  input: ProviderConversationInput,
  context: ProviderConversationSubmissionContext,
): Promise<string | { notice: string } | undefined> {
  const {
    creationRef,
    activeProjectIdRef,
    updateProject,
    flush,
    executeTask,
    skillRegistry,
  } = context;
  const project = creationRef.current.projects.find(
    (item) => item.id === input.projectId,
  );
  if (!project || activeProjectIdRef.current !== project.id)
    return "项目已切换，请在当前项目重新提交。";
  if (
    project.tasks.some(
      (task) =>
        task.conversationRoundId &&
        (["queued", "running", "unknown"].includes(task.status) ||
          task.submissionState === "unknown"),
    )
  )
    return "上一轮尚未结束或需核对，请先处理任务状态。";
  try {
    const assistant = input.assistantId
      ? skillRegistry.getRecord(input.assistantId)
      : undefined;
    if (input.assistantId && !assistant) return "所选助手不存在，请重新选择。";
    composeAssistantPrompt(input.prompt, assistant);
    const connections = readProviderConnections();
    if (
      !navigator.onLine &&
      input.routes.some(
        (route) =>
          !isStrictLoopbackProviderUrl(
            connections.find(
              (connection) => connection.id === route.connectionId,
            )?.baseUrl ?? "",
          ),
      )
    )
      return "当前离线，远程连接未发送；草稿已保留。";
    const now = Date.now(),
      roundId = `conversation-${crypto.randomUUID()}`,
      userMessageId = `message-${crypto.randomUUID()}`;
    const round = prepareProviderConversationRound({
      roundId,
      projectId: project.id,
      userMessageId,
      prompt: input.prompt,
      history: project.messages,
      historyTasks: project.tasks,
      assistantInstructions: assistant?.instructions,
      routes: input.routes,
      connections,
      catalogs: Object.fromEntries(
        connections.map((connection) => [
          connection.id,
          catalogForConnection(connection),
        ]),
      ),
      createdAt: now,
    });
    const tasks = round.tasks.map((task) => ({
      ...task,
      approvedGates: requiredApprovalGates({
        privacyMode: task.privacyMode,
        requestedOutputs: 1,
        providerBaseUrl: task.providerBaseUrl,
      }),
    }));
    if (
      tasks.some((task) => task.approvedGates.includes("remote_transfer")) &&
      !input.remoteApproved
    )
      return "请确认允许发送至所选远程连接。";
    updateProject(project.id, (current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: userMessageId,
          roundId,
          role: "user",
          content: input.prompt,
          createdAt: now,
        },
      ],
      tasks: [...current.tasks, ...tasks],
      updatedAt: now,
    }));
    await flush();
    const live = creationRef.current.projects.find(
      (item) => item.id === project.id,
    );
    if (!live) return "项目已不可用，未发送请求。";
    tasks
      .filter(
        (task) =>
          live.tasks.find((item) => item.id === task.id)?.status === "queued",
      )
      .forEach((task) => void executeTask(project.id, task.id, live));
    return round.truncatedRouteIds.length
      ? { notice: "已提交；较长历史已按完整轮次裁剪，各模型历史保持独立。" }
      : undefined;
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "无法创建对话任务，未自动重试。";
  }
}
