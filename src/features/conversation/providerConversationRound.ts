import {
  isConnectionReady,
  providerConnectionSchema,
  type ProviderConnection,
} from "../../domain/providerConnections.ts";
import {
  resolveProviderProtocol,
  resolveProviderAuthMode,
} from "../../domain/modelProvider.ts";
import type { ProviderTextMessage } from "../../integrations/providerTextProtocol.ts";
import type {
  CreationMessage,
  CreationTask,
  CreationProject,
} from "../creation/model.ts";
import type { CatalogModel } from "../models/modelCatalog.ts";

export interface ProviderConversationRoundInput {
  roundId: string;
  projectId: string;
  userMessageId: string;
  prompt: string;
  createdAt: number;
  history: readonly CreationMessage[];
  historyTasks?: readonly CreationTask[];
  assistantInstructions?: string;
  routes: readonly { connectionId: string; modelId: string }[];
  connections: readonly ProviderConnection[];
  catalogs: Readonly<Record<string, readonly CatalogModel[]>>;
}
export interface ProviderConversationTask extends CreationTask {
  conversationRoundId: string;
  conversationUserMessageId: string;
  conversationMessages: NonNullable<CreationTask["conversationMessages"]>;
}
export interface ProviderConversationRound {
  roundId: string;
  projectId: string;
  userMessageId: string;
  tasks: readonly ProviderConversationTask[];
  truncatedRouteIds: readonly string[];
}

const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const idValid = (value: string) =>
  typeof value === "string" &&
  /^\S{1,120}$/.test(value) &&
  Array.from(value).every(
    (character) =>
      character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
  );
const endpoint = (value?: string) => value?.replace(/\/$/, "");
function sameProvider(
  task: CreationTask,
  connection: ProviderConnection,
  model: string,
): boolean {
  return (
    task.providerConnectionId === connection.id &&
    task.model === model &&
    endpoint(task.providerBaseUrl) === endpoint(connection.baseUrl) &&
    task.providerCredentialRef === connection.credentialRef &&
    resolveProviderProtocol({ protocol: task.providerProtocol }) ===
      resolveProviderProtocol(connection) &&
    resolveProviderAuthMode(task.providerBaseUrl ?? "", {
      protocol: task.providerProtocol,
      authMode: task.providerAuthMode,
    }) === resolveProviderAuthMode(connection.baseUrl!, connection)
  );
}

function successfulText(task: CreationTask): string | undefined {
  const output = task.outputs?.find((item) => item.index === 0);
  return task.kind === "text" &&
    task.status === "succeeded" &&
    task.submissionState !== "unknown" &&
    output?.status === "succeeded" &&
    output.model === task.model &&
    typeof output.text === "string" &&
    output.text.trim() &&
    bytes(output.text) <= 32768
    ? output.text
    : undefined;
}

function routeMessages(
  input: ProviderConversationRoundInput,
  connection: ProviderConnection,
  model: string,
) {
  const groups: ProviderTextMessage[][] = [];
  const seen = new Set<string>();
  for (const message of input.history) {
    if (
      message.role !== "user" ||
      message.id === input.userMessageId ||
      seen.has(message.id) ||
      !message.content.trim()
    )
      continue;
    seen.add(message.id);
    const group: ProviderTextMessage[] = [
      { role: "user", content: message.content },
    ];
    const replies = (input.historyTasks ?? [])
      .filter(
        (task) =>
          task.conversationUserMessageId === message.id &&
          sameProvider(task, connection, model) &&
          successfulText(task),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
    if (replies[0])
      group.push({ role: "assistant", content: successfulText(replies[0])! });
    groups.push(group);
  }
  const fixed: ProviderTextMessage[] = input.assistantInstructions?.trim()
    ? [{ role: "system", content: input.assistantInstructions }]
    : [];
  const current: ProviderTextMessage = { role: "user", content: input.prompt };
  const build = () => [...fixed, ...groups.flat(), current];
  let messages = build(),
    omitted = false;
  while (
    messages.length > 32 ||
    bytes(messages.map((message) => message.content).join("")) > 65536
  ) {
    if (!groups.length)
      throw new Error("当前指令超过对话上下文限制，请减少内容。");
    groups.shift();
    omitted = true;
    messages = build();
  }
  for (const message of messages) Object.freeze(message);
  return { messages: Object.freeze(messages), omitted };
}

/** Creates intents only. The caller persists/flushed them before using the existing task executor. */
export function prepareProviderConversationRound(
  input: ProviderConversationRoundInput,
): ProviderConversationRound {
  if (
    ![input.roundId, input.projectId, input.userMessageId].every(idValid) ||
    !input.prompt.trim() ||
    input.prompt.length > 4000 ||
    !Number.isSafeInteger(input.createdAt) ||
    input.createdAt < 0 ||
    input.routes.length < 2 ||
    input.routes.length > 3
  )
    throw new Error(
      "对话轮次无效；请选择 2 至 3 个文本模型并填写不超过 4000 字的问题。",
    );
  const seen = new Set<string>();
  const truncatedRouteIds: string[] = [];
  if (
    input.historyTasks?.some(
      (task) =>
        task.conversationRoundId === input.roundId ||
        task.batchId === input.roundId,
    )
  )
    throw new Error("此轮对话已登记，请查看原任务；不会再次提交。");
  const allocated = new Map<string, number>();
  const tasks = input.routes.map((route, index): ProviderConversationTask => {
    const routeKey = JSON.stringify([route.connectionId, route.modelId]);
    if (seen.has(routeKey))
      throw new Error("同一连接和模型不能在本轮重复选择。");
    seen.add(routeKey);
    const selected = input.connections.filter(
      (item) => item.id === route.connectionId,
    );
    const connection =
      selected.length === 1
        ? providerConnectionSchema.parse(selected[0])
        : undefined;
    if (
      !connection ||
      connection.kind !== "user_byok" ||
      !connection.baseUrl ||
      !isConnectionReady(connection, input.createdAt) ||
      !input.catalogs[connection.id]?.some(
        (model) => model.id === route.modelId && model.kind === "text",
      )
    )
      throw new Error("所选文本模型或连接已不可用；请重新选择，当前未提交。");
    const count = (allocated.get(connection.id) ?? 0) + 1;
    if (count + (connection.activeJobs ?? 0) > connection.concurrencyLimit)
      throw new Error(
        `${connection.displayName} 的可用并行容量不足，请减少同一连接的模型数或等待任务结束。`,
      );
    allocated.set(connection.id, count);
    const protocol = resolveProviderProtocol(connection),
      authMode = resolveProviderAuthMode(connection.baseUrl, connection);
    if (authMode === "api-key" && !connection.credentialRef)
      throw new Error("所选连接缺少凭据身份，请重新配置。");
    const taskId = `${input.roundId}-route-${index}`;
    const context = routeMessages(input, connection, route.modelId);
    if (context.omitted) truncatedRouteIds.push(taskId);
    const output = Object.freeze({
      index: 0,
      status: "waiting" as const,
      model: route.modelId,
      provider: connection.provider,
      createdAt: input.createdAt,
    });
    const outputs = [output];
    Object.freeze(outputs);
    const attachments: CreationTask["attachments"] = [];
    Object.freeze(attachments);
    return Object.freeze({
      id: taskId,
      prompt: input.prompt,
      model: route.modelId,
      kind: "text",
      status: "queued",
      submissionState: "intent",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      attachments,
      attempt: 1,
      requestedOutputs: 1,
      completedOutputs: 0,
      idempotencyKey: `${input.roundId}-submission-${index}`,
      batchId: input.roundId,
      privacyMode: "byok_local",
      providerConnectionId: connection.id,
      providerCredentialRef: connection.credentialRef,
      providerBaseUrl: connection.baseUrl,
      providerName: connection.provider,
      providerProtocol: protocol,
      providerAuthMode: authMode,
      conversationRoundId: input.roundId,
      conversationUserMessageId: input.userMessageId,
      conversationMessages: context.messages,
      outputs,
    });
  });
  return Object.freeze({
    roundId: input.roundId,
    projectId: input.projectId,
    userMessageId: input.userMessageId,
    tasks: Object.freeze(tasks),
    truncatedRouteIds: Object.freeze(truncatedRouteIds),
  });
}

export function matchesProviderConversationTask(
  round: ProviderConversationRound,
  projectId: string,
  task: CreationTask,
): boolean {
  const expected = round.tasks.find((item) => item.id === task.id);
  return (
    round.projectId === projectId &&
    Boolean(
      expected &&
      task.kind === "text" &&
      !task.sourceItemId &&
      task.requestedOutputs === 1 &&
      !task.attachments.length &&
      task.conversationRoundId === round.roundId &&
      task.conversationUserMessageId === round.userMessageId &&
      task.idempotencyKey === expected.idempotencyKey &&
      task.prompt === expected.prompt &&
      task.model === expected.model &&
      task.batchId === expected.batchId &&
      task.providerConnectionId === expected.providerConnectionId &&
      task.providerBaseUrl === expected.providerBaseUrl &&
      task.providerCredentialRef === expected.providerCredentialRef &&
      task.providerProtocol === expected.providerProtocol &&
      task.providerAuthMode === expected.providerAuthMode &&
      JSON.stringify(task.conversationMessages) ===
        JSON.stringify(expected.conversationMessages),
    )
  );
}

export interface ProviderConversationReply {
  taskId: string;
  connectionId: string;
  modelId: string;
  providerName?: string;
  status: CreationTask["status"];
  text?: string;
  error?: string;
  canCancel: boolean;
  available: boolean;
}

/** Projection of persisted tasks, never a second store or background scheduler. */
export function providerConversationReplies(
  round: ProviderConversationRound,
  projectId: string,
  tasks: readonly CreationTask[],
): ProviderConversationReply[] {
  if (projectId !== round.projectId) return [];
  return round.tasks.map((expected) => {
    const matching = tasks.filter((task) => task.id === expected.id);
    const current = matching.length === 1 ? matching[0] : undefined;
    const task =
      current && matchesProviderConversationTask(round, projectId, current)
        ? current
        : undefined;
    const output = task?.outputs?.find(
      (item) => item.index === 0 && item.model === expected.model,
    );
    const status = !task
      ? "interrupted"
      : task.status === "succeeded" && !successfulText(task)
        ? "unknown"
        : task.status;
    return {
      taskId: expected.id,
      connectionId: expected.providerConnectionId!,
      modelId: expected.model,
      providerName: expected.providerName,
      status,
      text:
        typeof output?.text === "string" && bytes(output.text) <= 32768
          ? output.text
          : undefined,
      error:
        task?.error ??
        (!task ? "原任务已移除或绑定已变化，当前未继续执行。" : undefined),
      canCancel: Boolean(task && ["queued", "running"].includes(status)),
      available: Boolean(task),
    };
  });
}

export function providerConversationCancellationIds(
  round: ProviderConversationRound,
  projectId: string,
  tasks: readonly CreationTask[],
): string[] {
  return providerConversationReplies(round, projectId, tasks)
    .filter((reply) => reply.canCancel)
    .map((reply) => reply.taskId);
}

export function assertLiveProviderConversationTask(
  project: CreationProject | undefined,
  expected: CreationTask,
  expectedProjectId: string,
): void {
  const current = project?.tasks.find((task) => task.id === expected.id);
  const user = project?.messages.find(
    (message) => message.id === expected.conversationUserMessageId,
  );
  const context = expected.conversationMessages;
  const validContext =
    context &&
    context.length > 0 &&
    context.length <= 32 &&
    context.every(
      (message, index) =>
        typeof message.content === "string" &&
        message.content.length > 0 &&
        (["user", "assistant"].includes(message.role) ||
          (index === 0 && message.role === "system")),
    ) &&
    context.at(-1)?.role === "user" &&
    context.at(-1)?.content === expected.prompt &&
    bytes(context.map((message) => message.content).join("")) <= 65536;
  if (
    !project ||
    project.id !== expectedProjectId ||
    !current ||
    !["queued", "running"].includes(current.status) ||
    !expected.conversationRoundId ||
    !expected.conversationUserMessageId ||
    !validContext ||
    !user ||
    user.role !== "user" ||
    user.content !== expected.prompt ||
    user.roundId !== expected.conversationRoundId ||
    !matchesProviderConversationTask(
      {
        projectId: expectedProjectId,
        roundId: expected.conversationRoundId,
        userMessageId: expected.conversationUserMessageId,
        tasks: [expected as ProviderConversationTask],
        truncatedRouteIds: [],
      },
      expectedProjectId,
      current,
    )
  )
    throw new Error("对话项目、轮次、用户消息或模型绑定已变化，本次未提交。");
}
