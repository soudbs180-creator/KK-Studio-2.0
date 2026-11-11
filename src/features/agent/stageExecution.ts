import type { StageWorkItem } from "../../domain/stagePlan.ts";
import { ThreePhaseFlowCoordinator } from "./threePhaseFlow.ts";
import { prepareAgentOperationPlan } from "./agentOperationPlan.ts";
import type { CanvasAgentOp } from "./agentTypes.ts";
import type { StageDecisionInput, StageOrchestrator } from "./orchestrator.ts";
import {
  waitForCreationTask,
  type CreationProject,
} from "../creation/index.ts";
import type { CanvasCollectionItem } from "../../domain/canvasItems.ts";
import { stageGenerationParameters } from "../../domain/stageGenerationParameters.ts";
import { closeWorkTicket, openWorkTicket } from "./superagentSession.ts";

export function createStageExecution(options: {
  getProject(): CreationProject | undefined;
  orchestrator: StageOrchestrator;
  commit(project: CreationProject): void;
  flush(): Promise<void>;
  resolveConnection(work: { model?: string; kind: string }): string;
  generate(
    node: CanvasCollectionItem,
    prompt: string,
    signal: AbortSignal,
  ): Promise<{ taskId?: string; error?: string }>;
  cancelTask(id: string): void;
  retryTask?(projectId: string, taskId: string): string | undefined;
}) {
  const active = new Map<string, AbortController>();
  return {
    cancel(projectId: string) {
      active.get(projectId)?.abort();
    },
    async execute(
      projectId: string,
      input: { planId: string; stageIndex: number; expectedRevision: number },
      decision?: StageDecisionInput,
    ) {
      if (active.has(projectId)) throw new Error("阶段正在执行，请等待或取消");
      const signalController = new AbortController();
      active.set(projectId, signalController);
      const signal = signalController.signal,
        initial = options.getProject(),
        chatId = initial?.activeChatId;
      const read = () => {
        signal.throwIfAborted();
        const p = options.getProject();
        if (!p || p.id !== projectId || p.activeChatId !== chatId)
          throw new Error("项目或聊天已切换，阶段未继续派发");
        const plan = p.stagePlans?.find((p) => p.id === input.planId),
          stage = plan?.stages.find((s) => s.index === input.stageIndex);
        if (!plan || !stage) throw new Error("阶段计划不存在");
        return { project: p, plan, stage };
      };
      const flow = new ThreePhaseFlowCoordinator();
      let ticketId: string | undefined;
      try {
        const { project, plan, stage } = read();
        validateStage();
        ticketId = openWorkTicket(projectId, {
          id: `stage:${plan.id}:${stage.index}:${plan.revision}:${Date.now()}`,
          threadId: `${projectId}:${plan.id}`,
          text: stage.goal || stage.name,
          source: "canvas",
          explicit: true,
        });
        function validateStage() {
          if (plan.revision !== input.expectedRevision)
            throw new Error("计划已变化，请重新审阅");
          if (!stage.workItems.length) throw new Error("阶段没有可执行工作项");
          if (stage.workItems.some((w) => w.kind === "merge"))
            throw new Error("合成工作项需先选择真实合成工作流；本阶段尚未提交");
          if (stage.workItems.some((w) => !w.model))
            throw new Error("请为每个工作项指定已配置的真实模型，再批准执行");
          stage.workItems.forEach(stageGenerationParameters);
        }
        const connections = new Map(
          stage.workItems
            .filter((work) => work.status !== "succeeded" && !work.taskId)
            .map((work) => [work.id, options.resolveConnection(work)]),
        );
        const { planId } = flow.startPlanning(stage.goal);
        const ops: CanvasAgentOp[] = stage.workItems
          .filter((w) => w.status === "queued")
          .flatMap((work): CanvasAgentOp[] => {
            const id = work.sourceNodeId ?? `stage-${crypto.randomUUID()}`;
            return [
              {
                type: "add_node",
                id,
                nodeType: work.kind,
                title: work.id,
                metadata: {
                  model: work.model,
                  prompt: work.reworkPrompt ?? work.prompt,
                },
              },
              {
                type: "run_generation",
                nodeId: id,
                mode: work.kind as "text" | "image" | "video" | "audio",
                model: work.model,
                prompt: work.reworkPrompt ?? work.prompt,
              },
            ];
          });
        const preview = prepareAgentOperationPlan(ops, project, null);
        const { checkpoint } = flow.compilePlan(
          {
            planId,
            title: stage.name,
            userPrompt: stage.goal,
            requestedTools: ["stage_generate"],
            suggestedStepQuota: stage.workItems.length,
            items: stage.workItems.map((w) => ({
              id: w.id,
              kind: w.kind as "text" | "image" | "video" | "audio",
              goal: w.reworkPrompt ?? w.prompt,
              estimatedDurationMs: 0,
              toolToUse: "stage_generate",
              dependencies: w.dependencies,
            })),
          },
          {
            costTier: "medium",
            estimatedTokens: 0,
            triggeredGates: [],
            reversibility: "partial_undo",
            affectedNodeIds: [],
            externalEndpointsContacted: [],
            securityRiskLevel: "low",
          },
          true,
        );
        const approved = flow.approveCheckpoint(checkpoint.checkpointId, {
          authorizedBy: "User",
        });
        if (decision) options.orchestrator.decideStage(decision, projectId);
        else if (
          stage.status !== "doing" ||
          (stage.approvalGate === "plan" && stage.planApprovedAt === undefined)
        )
          throw new Error("请先批准当前阶段计划");
        options.orchestrator.bindExecution(
          plan.id,
          stage.index,
          read().plan.revision,
          {
            ...approved.mandate,
            allowedTools: [...approved.mandate.allowedTools],
          },
        );
        await options.flush();
        const remaining = new Set(
          read()
            .stage.workItems.filter((w) => w.status !== "succeeded")
            .map((w) => w.id),
        );
        while (remaining.size) {
          const current = read();
          const work = current.stage.workItems.find(
            (w) =>
              remaining.has(w.id) &&
              w.dependencies.every((id) =>
                current.plan.stages
                  .flatMap((s) => s.workItems)
                  .some((d) => d.id === id && d.status === "succeeded"),
              ),
          );
          if (!work) throw new Error("工作项依赖未完成或存在循环，阶段已停止");
          if (!["queued", "running"].includes(work.status))
            throw new Error("请先解除阻断后重试失败工作项");
          const taskId = await acceptWorkItem(work);
          async function acceptWorkItem(work: StageWorkItem) {
            let taskId = work.taskId;
            if (taskId && work.status === "queued") {
              const old = read().project.tasks.find((t) => t.id === taskId);
              if (!old || old.status === "unknown")
                throw new Error("原任务受理状态不明，请先核对供应商");
              options.orchestrator.updateWorkItem({
                planId: plan.id,
                stageIndex: stage.index,
                workItemId: work.id,
                expectedRevision: read().plan.revision,
                status: "running",
              });
              await options.flush();
              read();
              if (
                old.status !== "succeeded" &&
                old.status !== "running" &&
                old.status !== "queued"
              ) {
                const retried = options.retryTask?.(projectId, taskId);
                if (!retried)
                  throw new Error(
                    "原任务没有安全可重试的输出，请在任务面板核对后继续",
                  );
                taskId = retried;
                options.orchestrator.bindWorkItemTask(
                  plan.id,
                  stage.index,
                  work.id,
                  read().plan.revision,
                  taskId,
                );
                await options.flush();
              }
            }
            if (!taskId) {
              if (work.status === "running")
                throw new Error(
                  "工作项已开始但受理记录不明，请核对任务后再恢复，不能重复提交",
                );
              const check = flow.executeStep("stage_generate");
              if (!check.allowed) throw new Error(check.reason);
              const planned = preview.ops.find(
                (op) => op.type === "add_node" && op.title === work.id,
              );
              const sourceId =
                work.sourceNodeId ??
                (planned?.type === "add_node" ? planned.id : undefined);
              if (!sourceId) throw new Error("缺少已批准的节点身份");
              options.orchestrator.updateWorkItem({
                planId: plan.id,
                stageIndex: stage.index,
                workItemId: work.id,
                expectedRevision: current.plan.revision,
                status: "running",
                sourceNodeId: sourceId,
              });
              const node: CanvasCollectionItem = {
                id: sourceId,
                kind: work.kind as CanvasCollectionItem["kind"],
                title: work.id,
                description: stage.name,
                model: work.model,
                providerConnectionId: connections.get(work.id),
                parameters: stageGenerationParameters(work),
                prompt: work.reworkPrompt ?? work.prompt,
              };
              const p = read().project;
              if (!p.items.some((i) => i.id === node.id))
                options.commit({ ...p, items: [...p.items, node] });
              await options.flush();
              read();
              const receipt = await options.generate(
                node,
                node.prompt!,
                signal,
              );
              if (!receipt.taskId)
                throw new Error(receipt.error ?? "任务未受理");
              taskId = receipt.taskId;
              options.orchestrator.bindWorkItemTask(
                plan.id,
                stage.index,
                work.id,
                read().plan.revision,
                taskId,
              );
              await options.flush();
              if (receipt.error) throw new Error(receipt.error);
            }

            return taskId;
          }
          const task = await waitForCreationTask({
            getProject: () => {
              try {
                return read().project;
              } catch {
                return undefined;
              }
            },
            taskId,
            signal,
            cancel: options.cancelTask,
          });
          options.orchestrator.updateWorkItem({
            planId: plan.id,
            stageIndex: stage.index,
            workItemId: work.id,
            expectedRevision: read().plan.revision,
            status: "succeeded",
            assetId: task.outputs?.find((o) => o.assetId)?.assetId,
          });
          await options.flush();
          remaining.delete(work.id);
        }
        closeWorkTicket(projectId, ticketId, "ready");
        options.orchestrator.requestStageApproval(
          plan.id,
          stage.index,
          "result",
          read().plan.revision,
          projectId,
        );
        await options.flush();
        flow.completeExecution("工作项已完成，等待用户审阅结果");
      } catch (error) {
        closeWorkTicket(projectId, ticketId, "failed");
        flow.failExecution(
          error instanceof Error ? error.message : "阶段执行失败",
        );
        await recordFailure();
        async function recordFailure() {
          const p = options.getProject();
          if (p?.id === projectId && p.activeChatId === chatId) {
            let plan = p.stagePlans?.find((plan) => plan.id === input.planId);
            const stage = plan?.stages.find(
              (s) => s.index === input.stageIndex,
            );
            if (plan && stage?.status === "doing") {
              for (const work of stage.workItems.filter(
                (w) => w.status === "running",
              )) {
                if (signal.aborted && work.taskId)
                  options.cancelTask(work.taskId);
                plan = options.orchestrator.updateWorkItem({
                  planId: plan.id,
                  stageIndex: stage.index,
                  workItemId: work.id,
                  expectedRevision: plan.revision,
                  status: signal.aborted ? "cancelled" : "failed",
                  error:
                    error instanceof Error ? error.message : "阶段执行失败",
                });
              }
              options.orchestrator.markStageBlocked(
                plan.id,
                stage.index,
                plan.revision,
              );
              await options.flush();
            }
          }
        }
        throw error;
      } finally {
        active.delete(projectId);
      }
    },
  };
}
