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

import { z } from "zod";
import type { CreationProject } from "../creation/model.ts";
import {
  StagePlanError,
  casAdvanceStage,
  createStagePlan,
  pendingStageApprovals,
  retryStageWorkItems,
  stageApprovalGateSchema,
  stagePlanSchema,
  stagePlanSummary,
  stageSchema,
  stageWorkItemKindSchema,
  stageWorkItemSchema,
  type CreateStagePlanInput,
  type StageApprovalGate,
  type StagePlan,
  type StageStatus,
  type StageWorkItemStatus,
} from "../../domain/stagePlan.ts";

export interface StageOrchestratorOptions {
  getProject(): CreationProject | undefined;
  commit(project: CreationProject): void;
}

export interface StageDecisionInput {
  planId: string;
  stageIndex: number;
  expectedRevision: number;
  /** 当前待审批门，与状态校验一致（plan / result）。 */
  gate: StageApprovalGate;
  decision: "approve" | "reject";
}

export interface StageWorkItemUpdateInput {
  planId: string;
  stageIndex: number;
  workItemId: string;
  expectedRevision: number;
  status: Exclude<StageWorkItemStatus, "queued">;
  assetId?: string;
  error?: string;
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

function isStageStatus(value: unknown): value is StageStatus {
  return STAGE_STATUSES.includes(value as StageStatus);
}

const planPatchInputSchema = z.object({
  id: stagePlanSchema.shape.id.optional(),
  title: stagePlanSchema.shape.title.min(1),
  stages: z
    .array(
      z.object({
        name: stageSchema.shape.name,
        goal: stageSchema.shape.goal,
        approvalGate: stageApprovalGateSchema.optional(),
        workItems: z
          .array(
            z.object({
              id: stageWorkItemSchema.shape.id,
              kind: stageWorkItemKindSchema,
              prompt: stageWorkItemSchema.shape.prompt,
              dependencies: stageWorkItemSchema.shape.dependencies.default([]),
              model: stageWorkItemSchema.shape.model,
            }),
          )
          .max(128),
      }),
    )
    .min(1)
    .max(32),
});

function planDefinition(plan: StagePlan): string {
  return JSON.stringify({
    title: plan.title,
    createdBy: plan.createdBy,
    stages: plan.stages.map((stage) => ({
      name: stage.name,
      goal: stage.goal,
      approvalGate: stage.approvalGate,
      workItems: stage.workItems.map((item) => ({
        id: item.id,
        kind: item.kind,
        prompt: item.prompt,
        dependencies: item.dependencies,
        model: item.model,
        params: item.params
          ? Object.fromEntries(
              Object.entries(item.params).sort(([left], [right]) =>
                left.localeCompare(right),
              ),
            )
          : undefined,
      })),
    })),
  });
}

function readPlan(project: CreationProject, planId: string): StagePlan {
  const plan = project.stagePlans?.find((item) => item.id === planId);
  if (!plan) throw new StagePlanError(`编排计划 ${planId} 不存在。`);
  return plan;
}

function assertRevision(plan: StagePlan, expectedRevision: number): void {
  if (
    !Number.isSafeInteger(expectedRevision) ||
    expectedRevision < 0 ||
    plan.revision !== expectedRevision
  )
    throw new StagePlanError("编排计划 revision 已变化（并发冲突，未写入）。");
}

export function createStageOrchestrator(options: StageOrchestratorOptions) {
  const projectOrThrow = () => {
    const project = options.getProject();
    if (!project) throw new StagePlanError("当前没有活动项目，无法编排。");
    return project;
  };
  const persist = (project: CreationProject, plan: StagePlan) => {
    const result = stagePlanSchema.safeParse(plan);
    if (!result.success) throw new StagePlanError("编排计划无效，未写入项目。");
    if (result.data.projectId !== project.id)
      throw new StagePlanError("编排计划与当前项目不匹配，未写入项目。");
    const current = readPlan(project, plan.id);
    if (result.data.revision <= current.revision)
      throw new StagePlanError(
        "编排计划 revision 已变化（并发冲突，未写入）。",
      );
    options.commit({
      ...project,
      stagePlans: project.stagePlans?.map((item) =>
        item.id === plan.id ? result.data : item,
      ),
      updatedAt: Date.now(),
    });
  };

  const upsertPlan = (input: CreateStagePlanInput): StagePlan => {
    const project = projectOrThrow();
    const plan = createStagePlan({ ...input, projectId: project.id });
    const existing = project.stagePlans?.find((item) => item.id === plan.id);
    if (existing) {
      if (planDefinition(existing) === planDefinition(plan)) return existing;
      throw new StagePlanError(
        `编排计划 ${plan.id} 已存在且内容不同；请使用新 id 创建计划。`,
      );
    }
    if ((project.stagePlans?.length ?? 0) >= 64)
      throw new StagePlanError("编排计划已达 64 个上限，未写入项目。");
    options.commit({
      ...project,
      stagePlans: [...(project.stagePlans ?? []), plan],
      updatedAt: Date.now(),
    });
    return plan;
  };
  const listPlans = (): StagePlan[] => projectOrThrow().stagePlans ?? [];
  const getPlan = (planId: string): StagePlan | null =>
    options.getProject()?.stagePlans?.find((item) => item.id === planId) ??
    null;
  /** 内部持久化入口：只供本模块的受控状态迁移使用。 */
  const persistPlan = (plan: StagePlan): StagePlan => {
    const project = projectOrThrow();
    persist(project, plan);
    return plan;
  };

  return {
    /** 物化计划；同 id 同定义重放保留已有进度，内容变更须使用新 id。 */
    upsertPlan,
    listPlans,
    getPlan,
    /** 工作项结果只允许在 doing 阶段按预期 revision 推进。 */
    updateWorkItem(input: StageWorkItemUpdateInput): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, input.planId);
      assertRevision(plan, input.expectedRevision);
      const stage = plan.stages.find((item) => item.index === input.stageIndex);
      if (!stage) throw new StagePlanError(`阶段 ${input.stageIndex} 不存在。`);
      if (stage.status !== "doing")
        throw new StagePlanError("阶段不在 doing 状态，不能写入工作结果。");
      if (stage.approvalGate === "plan" && stage.planApprovedAt === undefined)
        throw new StagePlanError("计划审批尚未通过，不能执行工作项。");
      const workItem = stage.workItems.find(
        (item) => item.id === input.workItemId,
      );
      if (!workItem)
        throw new StagePlanError(`工作项 ${input.workItemId} 不存在。`);
      const allowed: Record<
        StageWorkItemStatus,
        readonly StageWorkItemStatus[]
      > = {
        queued: ["running", "cancelled"],
        running: ["succeeded", "failed", "partial", "cancelled"],
        partial: [],
        succeeded: [],
        failed: [],
        cancelled: [],
      };
      if (!allowed[workItem.status].includes(input.status))
        throw new StagePlanError("工作项状态迁移无效，未写入。");
      if (input.status === "running") {
        for (const dependency of workItem.dependencies) {
          const prerequisite = plan.stages
            .flatMap((item) => item.workItems)
            .find((item) => item.id === dependency);
          if (prerequisite?.status !== "succeeded")
            throw new StagePlanError(
              `工作项依赖 ${dependency} 尚未成功，不能开始执行。`,
            );
        }
      }
      const stamp = Date.now();
      const next: StagePlan = {
        ...plan,
        revision: plan.revision + 1,
        updatedAt: stamp,
        stages: plan.stages.map((item) =>
          item.index === input.stageIndex
            ? {
                ...item,
                updatedAt: stamp,
                workItems: item.workItems.map((work) =>
                  work.id === input.workItemId
                    ? {
                        ...work,
                        status: input.status,
                        assetId: input.assetId ?? work.assetId,
                        error: input.error,
                        updatedAt: stamp,
                      }
                    : work,
                ),
              }
            : item,
        ),
      };
      persist(project, next);
      return next;
    },
    /** 进入审批等待：doing → plan_review / result_review（CAS）。 */
    requestStageApproval(
      planId: string,
      stageIndex: number,
      gate: StageApprovalGate,
      expectedRevision: number,
    ): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      assertRevision(plan, expectedRevision);
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
      assertRevision(plan, input.expectedRevision);
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
    markStageBlocked(
      planId: string,
      stageIndex: number,
      expectedRevision: number,
    ): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      assertRevision(plan, expectedRevision);
      const next = casAdvanceStage(plan, stageIndex, "doing", "blocked");
      persist(project, next);
      return next;
    },
    /** 解除阻断并只重试失败工作项：blocked → doing（CAS），失败项 requeue。 */
    retryStage(
      planId: string,
      stageIndex: number,
      expectedRevision: number,
    ): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      assertRevision(plan, expectedRevision);
      const requeued = retryStageWorkItems(plan, stageIndex);
      const next = casAdvanceStage(requeued, stageIndex, "blocked", "doing");
      persist(project, next);
      return next;
    },
    /** 结果审批通过收尾：result_review → done。 */
    completeStage(
      planId: string,
      stageIndex: number,
      expectedRevision: number,
    ): StagePlan {
      const project = projectOrThrow();
      const plan = readPlan(project, planId);
      assertRevision(plan, expectedRevision);
      const next = casAdvanceStage(plan, stageIndex, "result_review", "done");
      persist(project, next);
      return next;
    },
    /** 当前待审批摘要（UI/Agent 状态条）。 */
    approvalSummary(): Array<{
      planId: string;
      stageIndex: number;
      gate: StageApprovalGate;
      revision: number;
    }> {
      const project = options.getProject();
      if (!project?.stagePlans?.length) return [];
      return project.stagePlans.flatMap((plan) =>
        pendingStageApprovals(plan).map((entry) => ({
          planId: plan.id,
          stageIndex: entry.stageIndex,
          gate: entry.gate,
          revision: plan.revision,
        })),
      );
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
              revision: plan.revision,
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
            "Agent 只可报告阶段进入审批或阻断（CAS）：doing→plan_review/result_review/blocked。审批决策与解除阻断由宿主入口处理。输入 { planId, stageIndex, expectedRevision, expectedStatus, nextStatus }。",
          invoke(input) {
            const planId = String(input.planId ?? "");
            const stageIndex = Number(input.stageIndex);
            const expected = input.expectedStatus;
            const expectedRevision = input.expectedRevision;
            const next = input.nextStatus;
            if (!planId || !Number.isInteger(stageIndex))
              return { ok: false, error: "planId 与 stageIndex 必填。" };
            if (!isStageStatus(expected) || !isStageStatus(next))
              return {
                ok: false,
                error:
                  "expectedStatus/nextStatus 必须为 doing/plan_review/blocked/result_review/done。",
              };
            if (
              typeof expectedRevision !== "number" ||
              !Number.isSafeInteger(expectedRevision) ||
              expectedRevision < 0
            )
              return { ok: false, error: "expectedRevision 必须为非负整数。" };
            if (
              expected !== "doing" ||
              (next !== "plan_review" &&
                next !== "result_review" &&
                next !== "blocked")
            )
              return {
                ok: false,
                error: "Agent 不能审批或解除阻断；请使用宿主审批/重试入口。",
              };
            const plan = getPlan(planId);
            if (!plan) return { ok: false, error: `计划 ${planId} 不存在。` };
            if (plan.revision !== expectedRevision)
              return {
                ok: false,
                error: "编排计划 revision 已变化（并发冲突，未推进）。",
              };
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
            "物化编排计划；同 id 同定义重放保留执行进度，修改请使用新 id。输入 { id?, title, stages: [{ name, goal, approvalGate?, workItems: [{ id, kind, prompt, dependencies?, model? }] }] }。",
          invoke(input) {
            const parsed = planPatchInputSchema.safeParse(input);
            if (!parsed.success) {
              const issue = parsed.error.issues[0];
              return {
                ok: false,
                error: `计划输入无效：${issue?.path.join(".") || "plan"} ${issue?.message || "校验失败"}`,
              };
            }
            try {
              const project = projectOrThrow();
              const stamp = Date.now();
              const plan = upsertPlan({
                id: parsed.data.id,
                title: parsed.data.title,
                projectId: project.id,
                createdBy: "agent",
                stages: parsed.data.stages.map((stage) => ({
                  name: stage.name,
                  goal: stage.goal,
                  approvalGate: stage.approvalGate,
                  workItems: stage.workItems.map((item) => ({
                    ...item,
                    status: "queued" as const,
                    createdAt: stamp,
                    updatedAt: stamp,
                  })),
                })),
              });
              return {
                ok: true,
                planId: plan.id,
                revision: plan.revision,
                summary: stagePlanSummary(plan),
              };
            } catch (error) {
              return {
                ok: false,
                error: error instanceof Error ? error.message : "计划写入失败",
              };
            }
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
