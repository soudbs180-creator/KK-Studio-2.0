/**
 * Stage 编排器：驱动 StagePlan 状态机的宿主侧入口。
 *
 * 职责边界（对标竞品 media-agent 的 plan 工具族）：
 *  - 编排器是唯一可推进阶段状态的写入者（CAS 语义由 stagePlan.casAdvanceStage 保证）；
 *  - 计划物化到 CreationProject.stagePlans（本地持久化），UI/Agent 共享同一权威；
 *  - planTools() 暴露 MCP 风格工具面（plan_get_stage_status / plan_update_stage_state /
 *    plan_patch_stage / plan_replan），本模块只提供纯函数与描述，
 *    真正注册到 Agent MCP 服务在 BACKEND-MCP-AUTO 完成。
 *
 * 本模块不持有 Provider 凭据；所有生成仍走既有任务入口（imageTaskCommand 等）。
 */

import type { CreationProject } from "../creation/model.ts";
import {
  StagePlanError,
  casAdvanceStage,
  createStagePlan,
  pendingStageApprovals,
  retryStageWorkItems,
  stagePlanSummary,
  type CreateStagePlanInput,
  type StageApprovalGate,
  type StagePlan,
  type StageStatus,
  type StageWorkItemKind,
} from "../../domain/stagePlan.ts";

export interface StageOrchestratorOptions {
  getProject(): CreationProject | undefined;
  commit(project: CreationProject): void;
}

export interface StageDecisionInput {
  planId: string;
  stageIndex: number;
  /** 当前待审批门，与状态校验一致（plan / result）。 */
  gate: StageApprovalGate;
  decision: "approve" | "reject";
}

export type PlanToolName =
  | "plan_get_stage_status"
  | "plan_update_stage_state"
  | "plan_patch_stage"
  | "plan_replan";

export interface PlanTool {
  name: PlanToolName;
  description: string;
  invoke(input: Record<string, unknown>): Record<string, unknown>;
}

const STAGE_STATUSES: readonly StageStatus[] = [
  "doing",
  "plan_review",
  "blocked",
  "result_review",
  "done",
];

const WORK_ITEM_KINDS: readonly StageWorkItemKind[] = [
  "image",
  "video",
  "audio",
  "text",
  "merge",
];

function isStageStatus(value: unknown): value is StageStatus {
  return STAGE_STATUSES.includes(value as StageStatus);
}

function normalizeWorkItemKind(value: unknown): StageWorkItemKind {
  return WORK_ITEM_KINDS.includes(value as StageWorkItemKind)
    ? (value as StageWorkItemKind)
    : "image";
}

function readPlan(project: CreationProject, planId: string): StagePlan {
  const plan = project.stagePlans?.find((item) => item.id === planId);
  if (!plan) throw new StagePlanError(`编排计划 ${planId} 不存在。`);
  return plan;
}

export function createStageOrchestrator(options: StageOrchestratorOptions) {
  const projectOrThrow = () => {
    const project = options.getProject();
    if (!project) throw new StagePlanError("当前没有活动项目，无法编排。");
    return project;
  };
  const persist = (project: CreationProject, plan: StagePlan) => {
    options.commit({
      ...project,
      stagePlans: project.stagePlans?.map((item) =>
        item.id === plan.id ? plan : item,
      ),
      updatedAt: Date.now(),
    });
  };

  const upsertPlan = (input: CreateStagePlanInput): StagePlan => {
    const project = projectOrThrow();
    const plan = createStagePlan({ ...input, projectId: project.id });
    options.commit({
      ...project,
      stagePlans: [
        ...(project.stagePlans ?? []).filter((item) => item.id !== plan.id),
        plan,
      ],
      updatedAt: Date.now(),
    });
    return plan;
  };
  const listPlans = (): StagePlan[] => projectOrThrow().stagePlans ?? [];
  const getPlan = (planId: string): StagePlan | null =>
    options.getProject()?.stagePlans?.find((item) => item.id === planId) ??
    null;
  /** 内部持久化入口：被工具面与测试使用（按 id 覆盖计划并写回项目）。 */
  const persistPlan = (plan: StagePlan): StagePlan => {
    const project = projectOrThrow();
    persist(project, plan);
    return plan;
  };

  return {
    /** 物化或覆盖一个编排计划（同一项目下按 id 幂等）。 */
    upsertPlan,
    listPlans,
    getPlan,
    /** 进入审批等待：doing → plan_review / result_review（CAS）。 */
    requestStageApproval(
      planId: string,
      stageIndex: number,
      gate: StageApprovalGate,
    ): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      const expected: "plan_review" | "result_review" =
        gate === "plan" ? "plan_review" : "result_review";
      const next = casAdvanceStage(plan, stageIndex, "doing", expected);
      persist(project, next);
      return next;
    },
    /**
     * 审批决策：
     *  - plan 门：approve → doing；reject → blocked；
     *  - result 门：approve → done；reject → doing（返回修改）。
     */
    decideStage(input: StageDecisionInput): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, input.planId);
      const waiting: "plan_review" | "result_review" =
        input.gate === "plan" ? "plan_review" : "result_review";
      const pending = pendingStageApprovals(plan).some(
        (entry) =>
          entry.stageIndex === input.stageIndex &&
          (entry.gate === "plan" ? "plan_review" : "result_review") === waiting,
      );
      if (!pending)
        throw new StagePlanError(
          `阶段 ${input.stageIndex} 不在 ${waiting} 状态，无法审批。`,
        );
      const next = casAdvanceStage(
        plan,
        input.stageIndex,
        waiting,
        input.decision === "approve"
          ? waiting === "plan_review"
            ? "doing"
            : "done"
          : waiting === "plan_review"
            ? "blocked"
            : "doing",
      );
      persist(project, next);
      return next;
    },
    /** 执行中异常阻断：doing → blocked（编排器调用，非审批拒绝）。 */
    markStageBlocked(planId: string, stageIndex: number): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      const next = casAdvanceStage(plan, stageIndex, "doing", "blocked");
      persist(project, next);
      return next;
    },
    /** 解除阻断并只重试失败工作项：blocked → doing（CAS），失败项 requeue。 */
    retryStage(planId: string, stageIndex: number): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      const requeued = retryStageWorkItems(plan, stageIndex);
      const next = casAdvanceStage(requeued, stageIndex, "blocked", "doing");
      persist(project, next);
      return next;
    },
    /** 结果审批通过收尾：result_review → done。 */
    completeStage(planId: string, stageIndex: number): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      const next = casAdvanceStage(plan, stageIndex, "result_review", "done");
      persist(project, next);
      return next;
    },
    /** 当前待审批摘要（UI/Agent 状态条）。 */
    approvalSummary(): Array<{
      planId: string;
      stageIndex: number;
      gate: StageApprovalGate;
    }> {
      const project = options.getProject();
      if (!project?.stagePlans?.length) return [];
      return project.stagePlans.flatMap((plan) =>
        pendingStageApprovals(plan).map((entry) => ({
          planId: plan.id,
          stageIndex: entry.stageIndex,
          gate: entry.gate,
        })),
      );
    },
    /** 内部持久化入口：被工具面与测试使用（按 id 覆盖计划并写回项目）。 */
    persistPlan(plan: StagePlan): StagePlan {
      const project = projectOrThrow();
      persist(project, plan);
      return plan;
    },
    /** MCP 风格工具面：本 PR 提供纯函数与描述，注册到 Agent 服务在 BACKEND-MCP-AUTO。 */
    planTools(): PlanTool[] {
      const requirePlanId = (input: Record<string, unknown>) =>
        typeof input.planId === "string"
          ? input.planId
          : listPlans().at(-1)?.id;
      return [
        {
          name: "plan_get_stage_status",
          description:
            "读取当前编排计划的阶段状态与待审批项；输入 { planId? }。",
          invoke(input) {
            const planId = requirePlanId(input);
            if (!planId) return { ok: false, error: "没有编排计划。" };
            const plan = getPlan(planId);
            if (!plan) return { ok: false, error: `计划 ${planId} 不存在。` };
            return {
              ok: true,
              planId,
              summary: stagePlanSummary(plan),
              stages: plan.stages.map((stage) => ({
                index: stage.index,
                name: stage.name,
                status: stage.status,
              })),
            };
          },
        },
        {
          name: "plan_update_stage_state",
          description:
            "推进阶段状态（CAS）：doing→plan_review/result_review；plan_review→doing/blocked；result_review→done/doing；blocked→doing。输入 { planId, stageIndex, expectedStatus, nextStatus }。",
          invoke(input) {
            const planId = String(input.planId ?? "");
            const stageIndex = Number(input.stageIndex);
            const expected = input.expectedStatus;
            const next = input.nextStatus;
            if (!planId || !Number.isInteger(stageIndex))
              return { ok: false, error: "planId 与 stageIndex 必填。" };
            if (!isStageStatus(expected) || !isStageStatus(next))
              return {
                ok: false,
                error:
                  "expectedStatus/nextStatus 必须为 doing/plan_review/blocked/result_review/done。",
              };
            const plan = getPlan(planId);
            if (!plan) return { ok: false, error: `计划 ${planId} 不存在。` };
            try {
              const updated = casAdvanceStage(plan, stageIndex, expected, next);
              persistPlan(updated);
              return {
                ok: true,
                planId,
                revision: updated.revision,
                summary: stagePlanSummary(updated),
              };
            } catch (error) {
              return {
                ok: false,
                error: error instanceof Error ? error.message : "状态推进失败",
              };
            }
          },
        },
        {
          name: "plan_patch_stage",
          description:
            "物化/更新编排计划（幂等，按 id 覆盖）。输入 { id?, title, stages: [{ name, goal, approvalGate?, workItems: [{ id, kind, prompt, dependencies?, model? }] }] }。",
          invoke(input) {
            const title = String(input.title ?? "");
            const stages = Array.isArray(input.stages) ? input.stages : [];
            if (!title || !stages.length)
              return { ok: false, error: "title 与 stages 必填。" };
            const project = projectOrThrow();
            const plan = upsertPlan({
              id: typeof input.id === "string" ? input.id : undefined,
              title,
              projectId: project.id,
              createdBy: "agent",
              stages: stages.map((stage, index) => {
                const source = stage as Record<string, unknown>;
                const workItems = Array.isArray(source.workItems)
                  ? source.workItems.map((item, itemIndex) => {
                      const raw = item as Record<string, unknown>;
                      return {
                        id: String(raw.id ?? `workitem-${index}-${itemIndex}`),
                        kind: normalizeWorkItemKind(raw.kind),
                        prompt: String(raw.prompt ?? ""),
                        dependencies: Array.isArray(raw.dependencies)
                          ? raw.dependencies.map(String)
                          : [],
                        status: "queued" as const,
                        model:
                          typeof raw.model === "string" ? raw.model : undefined,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      };
                    })
                  : [];
                return {
                  name: String(source.name ?? `阶段 ${index}`),
                  goal: String(source.goal ?? ""),
                  approvalGate:
                    source.approvalGate === "result" ||
                    source.approvalGate === "plan"
                      ? (source.approvalGate as StageApprovalGate)
                      : undefined,
                  workItems,
                };
              }),
            });
            return {
              ok: true,
              planId: plan.id,
              summary: stagePlanSummary(plan),
            };
          },
        },
        {
          name: "plan_replan",
          description:
            "根据当前计划摘要与失败项重建计划（占位：仅返回现有计划摘要与失败项；编排修复在后续任务实现）。输入 { planId? }。",
          invoke(input) {
            const planId = requirePlanId(input);
            const plan = planId ? getPlan(planId) : null;
            if (!plan) return { ok: false, error: "没有可重排的计划。" };
            const failed = plan.stages.flatMap((stage) =>
              stage.workItems
                .filter(
                  (item) =>
                    item.status === "failed" || item.status === "partial",
                )
                .map((item) => ({
                  stageIndex: stage.index,
                  workItemId: item.id,
                })),
            );
            return {
              ok: true,
              planId: plan.id,
              summary: stagePlanSummary(plan),
              failedWorkItems: failed,
              note: "拓扑修复与重排执行在 BACKEND-MCP-AUTO 阶段接入。",
            };
          },
        },
      ];
    },
  };
}

export type StageOrchestrator = ReturnType<typeof createStageOrchestrator>;
