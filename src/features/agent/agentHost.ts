import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";
import {
  projectChatExecutionBlockReason,
  activeChat,
  updateActiveChat,
  type CreationProject,
} from "../creation/model.ts";
import {
  applyAgentOpsToItems,
  assertCanvasDelivery,
  buildAgentSnapshot,
} from "./agentCanvas.ts";
import type { AgentOpResult } from "./agentConnection.ts";
import type { AgentChatItem, CanvasAgentOp, ChatScope } from "./agentTypes.ts";
import { storeGeneratedAsset } from "../creation/assetRepository.ts";
import { appendImageTaskResults } from "../creation/imageTaskCommand.ts";
import type { AgentCanvasView } from "./agentCanvasView.ts";
import type { PlanTool, StageOrchestrator } from "./orchestrator.ts";
import type { StagePlan } from "../../domain/stagePlan.ts";

export interface AgentHostOptions {
  getView?(): AgentCanvasView | null;
  getProject(): CreationProject | undefined;
  getProjects?(): readonly CreationProject[];
  getExecutionBlockReason?(): string | undefined;
  commit(project: CreationProject): void;
  flush?(): Promise<void>;
  generate(
    node: CanvasCollectionItem,
    prompt: string,
    signal?: AbortSignal,
    validate?: () => string | undefined,
  ): Promise<{ taskId?: string; error?: string }>;
  /** Stage 编排器：存在时宿主暴露 plan 工具面（A1）。 */
  orchestrator?: StageOrchestrator;
  /** 可选的模型白名单限制（或由当前活动会话获取）。 */
  modelAllowlist?: string[] | (() => string[] | undefined);
}

/** MCP 请求通过 KK 领域和任务入口落地，不直接持有 Provider 凭据。 */
export function createAgentHost(options: AgentHostOptions) {
  const getExecutionBlockReason = () =>
    options.getExecutionBlockReason?.() ??
    projectChatExecutionBlockReason(options.getProject());
  const getChatScope = (): ChatScope | null => {
    const project = options.getProject();
    return project
      ? { projectId: project.id, chatId: project.activeChatId ?? null }
      : null;
  };
  const scopeKey = () => JSON.stringify(getChatScope());
  const getModelAllowlist = (): string[] | undefined => {
    const project = options.getProject();
    const override =
      typeof options.modelAllowlist === "function"
        ? options.modelAllowlist()
        : options.modelAllowlist;
    const allowed =
      override !== undefined
        ? override
        : project?.chats
          ? (project.chats[project.activeChatId ?? ""]?.modelAllowlist ?? [])
          : undefined;
    return allowed === undefined
      ? undefined
      : Array.isArray(allowed) &&
          allowed.every((model) => typeof model === "string")
        ? [...allowed]
        : [];
  };
  const assertExecutable = () => {
    const reason = getExecutionBlockReason();
    if (reason) throw new Error(reason);
  };
  return {
    getChatScope,
    getExecutionAdapter: () => activeChat(options.getProject())?.mainAgent,
    getExecutionBlockReason,
    getModelAllowlist,
    readAgentThread() {
      if (getExecutionBlockReason()) return;
      const project = options.getProject();
      return project?.chats
        ? activeChat(project)?.agentThreadId
        : project?.agentThreadId;
    },
    knownAgentProjects() {
      if (getExecutionBlockReason()) return [];
      return (options.getProjects?.() ?? [])
        .filter((project) => !projectChatExecutionBlockReason(project))
        .flatMap<{
          projectId: string;
          chatId: string | null;
          threadId?: string;
        }>((project) =>
          project.chats
            ? Object.values(project.chats).map((chat) => ({
                projectId: project.id,
                chatId: chat.id,
                threadId: chat.agentThreadId,
              }))
            : [
                {
                  projectId: project.id,
                  chatId: null,
                  threadId: project.agentThreadId,
                },
              ],
        );
    },
    async saveAgentThread(threadId: string, projectId: string) {
      assertExecutable();
      const project = options.getProject();
      if (!project || project.id !== projectId)
        throw new Error("项目已切换，未保存到其他项目。");
      if (!/^[A-Za-z0-9_-]{1,160}$/.test(threadId))
        throw new Error("Agent 线程身份无效，未保存。");
      if (
        (options.getProjects?.() ?? [project]).some((candidate) =>
          candidate.chats
            ? Object.values(candidate.chats).some(
                (chat) =>
                  chat.agentThreadId === threadId &&
                  (candidate.id !== project.id ||
                    chat.id !== project.activeChatId),
              )
            : candidate.agentThreadId === threadId &&
              candidate.id !== project.id,
        )
      )
        throw new Error("线程属于其他聊天，未改写当前聊天的归属。");
      if (project.chats)
        options.commit(
          updateActiveChat(project, (chat) => ({
            ...chat,
            agentThreadId: threadId,
            updatedAt: Date.now(),
          })),
        );
      else if (project.agentThreadId !== threadId)
        options.commit({
          ...project,
          agentThreadId: threadId,
          updatedAt: Date.now(),
        });
      await options.flush?.();
    },
    readAgentMessages(): AgentChatItem[] {
      const project = options.getProject();
      return (activeChat(project)?.messages ?? []).map(
        ({ content, ...message }) =>
          ({ ...message, text: content }) as AgentChatItem,
      );
    },
    async saveAgentMessages(messages: AgentChatItem[], scope: ChatScope) {
      assertExecutable();
      const project = options.getProject();
      if (
        !project ||
        project.id !== scope.projectId ||
        (project.activeChatId ?? null) !== scope.chatId
      )
        throw new Error("聊天已切换，未保存到其他聊天。");
      if (!project.chats) return;
      const ownThread = activeChat(project)?.agentThreadId;
      if (
        ownThread &&
        messages.some(
          (message) => message.threadId && message.threadId !== ownThread,
        )
      )
        throw new Error("历史包含其他聊天的线程，原件已保留。");
      if (
        messages.some(
          (message) =>
            !message ||
            typeof message.text !== "string" ||
            typeof message.id !== "string" ||
            !message.id ||
            !["user", "assistant", "system", "tool", "error"].includes(
              message.role,
            ),
        )
      )
        throw new Error("聊天历史格式无效，原件已保留。");
      options.commit(
        updateActiveChat(project, (chat) => ({
          ...chat,
          messages: messages.map(({ text, ...message }) => ({
            ...message,
            content: text,
          })),
          updatedAt: Date.now(),
        })),
      );
      await options.flush?.();
    },
    readGoogleConversation() {
      if (getExecutionBlockReason()) return;
      const project = options.getProject();
      const chat = activeChat(project);
      if (!chat) return project?.googleConversation;
      const context = chat.googleConversation as
        | import("../../domain/googleConversation.ts").GoogleConversation
        | undefined;
      return context
        ? {
            ...context,
            messages: chat.messages
              .slice(-200)
              .map(({ content, ...message }) => ({
                ...message,
                text: content,
              })) as typeof context.messages,
          }
        : undefined;
    },
    saveGoogleConversation(
      record: import("../../domain/googleConversation.ts").GoogleConversation,
      projectId: string,
    ) {
      assertExecutable();
      const project = options.getProject();
      if (!project || project.id !== projectId)
        throw new Error("项目已切换，未保存旧会话。");
      if (project.chats) {
        const { messages, ...context } = record;
        options.commit(
          updateActiveChat(project, (chat) => {
            const merged = [...chat.messages];
            for (const { text, ...message } of messages) {
              const index = merged.findIndex(
                (previous) => previous.id === message.id,
              );
              if (index < 0) merged.push({ ...message, content: text });
              else
                merged[index] = { ...merged[index], ...message, content: text };
            }
            return {
              ...chat,
              googleConversation: context,
              messages: merged,
              updatedAt: Date.now(),
            };
          }),
        );
      } else
        options.commit({
          ...project,
          googleConversation: record,
          updatedAt: Date.now(),
        });
    },
    hasGeneratedImage(id: string) {
      const project = options.getProject();
      return Boolean(
        project?.agentGeneratedImageIds?.includes(id) ||
        project?.items.some((item) => item.id === id),
      );
    },
    /** 当前项目的编排计划（只读权威来源，供 UI/Agent 状态条）。 */
    stagePlans(): StagePlan[] {
      return options.getProject()?.stagePlans ?? [];
    },
    /** Stage 编排器工具面（A1）；未注入编排器时返回空（不提供计划能力）。 */
    planTools(): PlanTool[] {
      return options.orchestrator && !getExecutionBlockReason()
        ? options.orchestrator.planTools()
        : [];
    },
    async importGeneratedImage(input: {
      id: string;
      blob: Blob;
      projectId: string;
      signal: AbortSignal;
      sourceNodeId?: string;
      provider?: "Google Gemini";
      model?: string;
      effectiveModel?: string;
    }): Promise<void> {
      assertExecutable();
      const boundScope = scopeKey();
      const project = options.getProject();
      if (!project || project.id !== input.projectId || input.signal.aborted)
        throw new Error("项目或连接已变化，未导入旧图片");
      if (
        project.items.some((item) => item.id === input.id) ||
        project.agentGeneratedImageIds?.includes(input.id)
      )
        return;
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(input.blob);
      });
      assertExecutable();
      if (boundScope !== scopeKey() || input.signal.aborted)
        throw new Error("项目或聊天已切换，未导入旧图片");
      const imageModel =
        input.effectiveModel?.trim() || input.model?.trim() || "图片模型未报告";
      const executor = input.provider ?? "Codex 内置生图";
      const asset = await storeGeneratedAsset({
        source,
        provider: executor,
        model: imageModel,
        sourceJobId: input.id,
        signal: input.signal,
      });
      const current = options.getProject();
      assertExecutable();
      if (
        !current ||
        current.id !== input.projectId ||
        boundScope !== scopeKey() ||
        input.signal.aborted
      )
        throw new Error("项目已切换，图片已归档但未写入其他画布");
      // 归档期间另一完成通知可能已导入同一图片，提交前再次检查幂等身份。
      if (
        current.items.some((item) => item.id === input.id) ||
        current.agentGeneratedImageIds?.includes(input.id)
      )
        return;
      const item: CanvasCollectionItem = {
        id: input.id,
        kind: "image",
        title: imageModel,
        description: `${imageModel} · 来源：${executor}`,
        model: imageModel,
        assetId: asset.assetId,
        preview: asset.preview,
        generationStatus: "ready",
        result: {
          id: input.id,
          kind: "image",
          title: imageModel,
          description: `${imageModel} · 来源：${executor}`,
          model: imageModel,
          src: asset.preview,
          source: "provider",
        },
      };
      const nextProject = appendImageTaskResults(
        current,
        [item],
        input.sourceNodeId,
      );
      assertCanvasDelivery({
        nodeId: item.id,
        project: nextProject,
        label: "Agent 图片产物",
        requireAssetId: true,
      });
      options.commit({
        ...nextProject,
        agentGeneratedImageIds: [
          ...(current.agentGeneratedImageIds ?? []),
          input.id,
        ],
        updatedAt: Date.now(),
      });
    },
    getSnapshot() {
      const project = options.getProject();
      if (!project) return null;
      const snapshot = buildAgentSnapshot(project.items, {
        projectId: project.id,
        title: project.name,
        canvas: project.canvas,
        selectedNodeIds: options.getView?.()?.getState().selectedNodeIds,
      });
      snapshot.threadId = project.chats
        ? activeChat(project)?.agentThreadId
        : project.agentThreadId;
      const view = options.getView?.()?.getState();
      if (view) snapshot.viewport = { ...view.viewport };
      for (const node of snapshot.nodes) {
        const task = project.tasks
          .slice()
          .reverse()
          .find((item) => item.sourceItemId === node.id);
        if (task)
          node.metadata.generationTask = {
            id: task.id,
            status: task.status,
            error: task.error,
          };
      }
      return snapshot;
    },
    async applyOps(
      ops: CanvasAgentOp[],
      context?: { signal: AbortSignal; modelAllowlist?: readonly string[] },
    ): Promise<AgentOpResult> {
      const result: AgentOpResult = { applied: [], rejected: [], tasks: [] };
      const projectId = options.getProject()?.id;
      const boundScope = scopeKey();
      const allowedAtStart = getModelAllowlist();
      const allowedForTurn =
        context?.modelAllowlist === undefined
          ? undefined
          : Array.isArray(context.modelAllowlist) &&
              context.modelAllowlist.every((model) => typeof model === "string")
            ? [...context.modelAllowlist]
            : [];
      for (const op of ops) {
        const blocked = getExecutionBlockReason();
        if (blocked || boundScope !== scopeKey()) {
          result.rejected.push({
            op,
            reason: blocked ?? "项目或聊天已切换，未执行旧会话操作",
          });
          continue;
        }
        if (context?.signal.aborted) {
          result.rejected.push({ op, reason: "已取消，未执行操作" });
          continue;
        }
        const project = options.getProject();
        if (!project || project.id !== projectId) {
          result.rejected.push({ op, reason: "项目已切换或没有活动项目" });
          continue;
        }
        if (op.type === "run_generation") {
          const node = project.items.find((item) => item.id === op.nodeId);
          if (!node) {
            result.rejected.push({ op, reason: "生成节点不存在" });
            continue;
          }

          if (
            node.plugin ||
            !["image", "text"].includes(op.mode ?? node.kind) ||
            (op.mode && op.mode !== node.kind)
          ) {
            result.rejected.push({
              op,
              reason: "此节点的生成模式暂未接入，支持图片和文案节点",
            });
            continue;
          }
          const requestedModel = op.model ?? node.model;
          const validate = (): string | undefined => {
            if (context?.signal.aborted) return "已取消，未受理生成任务";
            const blocked = getExecutionBlockReason();
            if (blocked) return blocked;
            if (boundScope !== scopeKey())
              return "项目或聊天已切换，未受理生成任务";
            return [allowedAtStart, allowedForTurn, getModelAllowlist()].some(
              (allowed) =>
                allowed !== undefined &&
                (!requestedModel || !allowed.includes(requestedModel)),
            )
              ? `模型 ${requestedModel || "未指定"} 不在允许调用的模型白名单中`
              : undefined;
          };
          const denied = validate();
          if (denied) {
            result.rejected.push({
              op,
              reason: denied,
            });
            continue;
          }
          try {
            const raw = op.prompt ?? node.prompt ?? node.description;
            const prompt = raw
              .replace(/@\[node:([\w-]+)\]/g, (_token, id: string) => {
                const reference = project.items.find((item) => item.id === id);
                if (!reference) throw new Error("提示词引用节点不存在：" + id);
                if (reference.kind !== "text") return "";
                return (
                  reference.result?.text ??
                  reference.prompt ??
                  reference.description
                );
              })
              .trim();
            if (!prompt) throw new Error("生成提示词为空");
            const targetNode = op.model ? { ...node, model: op.model } : node;
            const accepted = await options.generate(
              targetNode,
              prompt,
              context?.signal,
              validate,
            );
            if (accepted.error || !accepted.taskId)
              throw new Error(accepted.error || "生成任务未受理");
            result.applied.push(op);
            result.tasks!.push({
              taskId: accepted.taskId,
              nodeId: node.id,
              status: "queued",
            });
          } catch (error) {
            result.rejected.push({
              op,
              reason: error instanceof Error ? error.message : "生成失败",
            });
          }
          continue;
        }
        if (op.type === "select_nodes" || op.type === "set_viewport") {
          try {
            const view = options.getView?.();
            if (!view) throw new Error("当前画布控件尚未就绪。");
            if (op.type === "select_nodes") {
              if (
                !Array.isArray(op.ids) ||
                op.ids.some(
                  (id) =>
                    typeof id !== "string" ||
                    !project.items.some((item) => item.id === id),
                )
              )
                throw new Error("选择的画布节点不存在。");
              view.selectNodes([...new Set(op.ids)]);
            } else {
              const raw = op.viewport;
              const viewport = raw && {
                x: raw.x,
                y: raw.y,
                scale: "k" in raw ? raw.k : raw.scale,
              };
              if (
                !viewport ||
                ![viewport.x, viewport.y, viewport.scale].every(
                  Number.isFinite,
                ) ||
                viewport.scale < 0.2 ||
                viewport.scale > 4
              )
                throw new Error("视口必须为有限坐标，缩放范围为 20%–400%。");
              view.setViewport({ ...viewport });
            }
            result.applied.push(op);
          } catch (error) {
            result.rejected.push({
              op,
              reason: error instanceof Error ? error.message : "画布操作失败",
            });
          }
          continue;
        }
        const translated = applyAgentOpsToItems(project.items, [op]);
        result.applied.push(...translated.applied);
        result.rejected.push(...translated.rejected);
        if (!translated.applied.length) continue;
        const canvas = reconcileProjectCanvas(project.canvas, translated.items);
        let edges = canvas.edges.filter(
          (edge) =>
            !translated.connections.removeIds.includes("*") &&
            !translated.connections.removeIds.includes(edge.id),
        );
        for (const edge of translated.connections.add) {
          if (
            !edges.some(
              (item) =>
                item.source === edge.source && item.target === edge.target,
            )
          )
            edges = [
              ...edges,
              {
                ...edge,
                id: edge.id ?? "agent-" + crypto.randomUUID(),
                kind: "reference",
              },
            ];
        }
        options.commit({
          ...project,
          items: translated.items,
          canvas: {
            ...canvas,
            positions: { ...canvas.positions, ...translated.positions },
            edges,
          },
          updatedAt: Date.now(),
        });
      }
      return result;
    },
  };
}
