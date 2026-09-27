import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { reconcileProjectCanvas } from "../../domain/projectCanvas.ts";
import type { CreationProject } from "../creation/model.ts";
import { applyAgentOpsToItems, buildAgentSnapshot } from "./agentCanvas.ts";
import type { AgentOpResult } from "./agentConnection.ts";
import type { CanvasAgentOp } from "./agentTypes.ts";
import { storeGeneratedAsset } from "../creation/assetRepository.ts";
import { appendImageTaskResults } from "../creation/imageTaskCommand.ts";
import type { AgentCanvasView } from "./agentCanvasView.ts";
import type { PlanTool, StageOrchestrator } from "./orchestrator.ts";
import type { StagePlan } from "../../domain/stagePlan.ts";

export interface AgentHostOptions {
  getView?(): AgentCanvasView | null;
  getProject(): CreationProject | undefined;
  commit(project: CreationProject): void;
  generate(
    node: CanvasCollectionItem,
    prompt: string,
    signal?: AbortSignal,
  ): Promise<{ taskId?: string; error?: string }>;
  /** Stage 编排器：存在时宿主暴露 plan 工具面（A1）。 */
  orchestrator?: StageOrchestrator;
}

/** MCP 请求通过 KK 领域和任务入口落地，不直接持有 Provider 凭据。 */
export function createAgentHost(options: AgentHostOptions) {
  return {
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
      return options.orchestrator ? options.orchestrator.planTools() : [];
    },
    async importGeneratedImage(input: {
      id: string;
      blob: Blob;
      projectId: string;
      signal: AbortSignal;
      sourceNodeId?: string;
    }): Promise<void> {
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
      const asset = await storeGeneratedAsset({
        source,
        provider: "Codex 内置生图",
        sourceJobId: input.id,
        signal: input.signal,
      });
      const current = options.getProject();
      if (!current || current.id !== input.projectId || input.signal.aborted)
        throw new Error("项目已切换，图片已归档但未写入其他画布");
      const item: CanvasCollectionItem = {
        id: input.id,
        kind: "image",
        title: "Codex 生成图片",
        description: "Codex 内置生图 · 已归档",
        assetId: asset.assetId,
        preview: asset.preview,
        generationStatus: "ready",
        result: {
          id: input.id,
          kind: "image",
          title: "Codex 生成图片",
          description: "Codex 内置生图 · 已归档",
          src: asset.preview,
          source: "provider",
        },
      };
      options.commit({
        ...appendImageTaskResults(current, [item], input.sourceNodeId),
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
      context?: { signal: AbortSignal },
    ): Promise<AgentOpResult> {
      const result: AgentOpResult = { applied: [], rejected: [], tasks: [] };
      const projectId = options.getProject()?.id;
      for (const op of ops) {
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
            const accepted = await options.generate(
              node,
              prompt,
              context?.signal,
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
