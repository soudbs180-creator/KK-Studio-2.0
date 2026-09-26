/**
 * Stage 执行计划：Agent 编排的物化状态机。
 *
 * 对齐竞品 MiniMax Design 的 Stage 状态机机制：
 *   doing → plan_review → doing | blocked；doing → result_review → done | doing。
 * 设计原则：
 *  - "doing 是框架拥有的执行信号"：只有编排器可推进状态，推进使用 CAS（携带
 *    expectedStatus），防止重复派发与越权推进；
 *  - 失败只重试失败工作项（failed/partial），不重复整段；
 *  - 简单任务不进 Plan（直接路径），只有依赖/审批场景物化为 Plan。
 *
 * 存储兼容：normalizeStagePlan 白名单重建，与 reviewWorkflow 风格一致。
 */

import { z } from "zod";

export const stageStatusSchema = z.enum([
  "doing",
  "plan_review",
  "blocked",
  "result_review",
  "done",
]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

/** 审批门类型：plan=执行计划审批，result=产物结果审批。 */
export const stageApprovalGateSchema = z.enum(["plan", "result"]);
export type StageApprovalGate = z.infer<typeof stageApprovalGateSchema>;

export const stageWorkItemStatusSchema = z.enum([
  "queued",
  "running",
  "partial",
  "succeeded",
  "failed",
  "cancelled",
]);
export type StageWorkItemStatus = z.infer<typeof stageWorkItemStatusSchema>;

export const stageWorkItemKindSchema = z.enum([
  "image",
  "video",
  "audio",
  "text",
  "merge",
]);
export type StageWorkItemKind = z.infer<typeof stageWorkItemKindSchema>;

export const stageWorkItemSchema = z.object({
  id: z.string().min(1).max(160),
  kind: stageWorkItemKindSchema,
  prompt: z.string().min(1).max(4000),
  /** 工作项依赖：本工作项开始前须成功完成的其它工作项 id。 */
  dependencies: z.array(z.string().max(160)).max(64),
  status: stageWorkItemStatusSchema,
  model: z.string().max(120).optional(),
  /** 简化的生成参数（尺寸/时长/数量等），不承载密钥。 */
  params: z
    .record(
      z.string().max(40),
      z.union([z.string().max(200), z.number().max(1e9), z.boolean()]),
    )
    .optional(),
  error: z.string().max(500).optional(),
  /** 成功产出的本地资产 id（素材注册完成证明）。 */
  assetId: z
    .string()
    .regex(/^asset-[0-9a-f]{24}$/)
    .optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type StageWorkItem = z.infer<typeof stageWorkItemSchema>;

export const stageSchema = z.object({
  index: z.number().int().min(0).max(64),
  name: z.string().max(120),
  goal: z.string().max(400),
  status: stageStatusSchema,
  workItems: z.array(stageWorkItemSchema).max(128),
  /** 仅当该阶段需要人工审批时声明；审批门在状态中体现（plan_review / result_review）。 */
  approvalGate: stageApprovalGateSchema.optional(),
  /** 计划审批由宿主通过后记录；缺失表示尚未批准。 */
  planApprovedAt: z.number().int().min(0).optional(),
  /** 阶段完成时给用户/Agent 的产物摘要（≤200 字）。 */
  resultSummary: z.string().max(500).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type Stage = z.infer<typeof stageSchema>;

export const stagePlanSchema = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().min(1).max(120),
    projectId: z.string().min(1).max(160),
    createdBy: z.enum(["agent", "user"]),
    /** 每次推进递增，作为并发写入的乐观锁（UI/编排器侧校验）。 */
    revision: z.number().int().min(0),
    stages: z.array(stageSchema).min(1).max(32),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .superRefine((plan, context) => {
    const stageIndexes = new Set<number>();
    const ids = new Set<string>();
    const workItems = plan.stages.flatMap((stage) => stage.workItems);
    plan.stages.forEach((stage, stageIndex) => {
      if (stage.planApprovedAt !== undefined && stage.approvalGate !== "plan")
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex, "planApprovedAt"],
          message: "只有计划审批阶段可记录计划批准时间。",
        });
      if (
        stage.status === "plan_review" &&
        (stage.approvalGate !== "plan" || stage.planApprovedAt !== undefined)
      )
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex, "status"],
          message: "计划审批状态与阶段声明不一致。",
        });
      if (
        stage.approvalGate === "plan" &&
        stage.planApprovedAt === undefined &&
        stage.workItems.some((item) => item.status !== "queued")
      )
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex, "workItems"],
          message: "计划审批前不能执行工作项。",
        });
      if (
        (stage.status === "result_review" || stage.status === "done") &&
        ((stage.approvalGate === "plan" &&
          stage.planApprovedAt === undefined) ||
          stage.workItems.some((item) => item.status !== "succeeded"))
      )
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex, "status"],
          message: "阶段完成前须通过计划审批并完成全部工作项。",
        });
      if (stageIndexes.has(stage.index)) {
        context.addIssue({
          code: "custom",
          path: ["stages", stageIndex, "index"],
          message: "阶段 index 不得重复。",
        });
      }
      stageIndexes.add(stage.index);
      stage.workItems.forEach((workItem, workIndex) => {
        if (ids.has(workItem.id)) {
          context.addIssue({
            code: "custom",
            path: ["stages", stageIndex, "workItems", workIndex, "id"],
            message: "工作项 id 不得重复。",
          });
        }
        ids.add(workItem.id);
      });
    });
    if (ids.size !== workItems.length) return;
    const indegree = new Map(workItems.map((item) => [item.id, 0]));
    const dependents = new Map(
      workItems.map((item) => [item.id, [] as string[]]),
    );
    plan.stages.forEach((stage, stageIndex) =>
      stage.workItems.forEach((item, workIndex) =>
        item.dependencies.forEach((dependency, dependencyIndex) => {
          if (!ids.has(dependency) || dependency === item.id) {
            context.addIssue({
              code: "custom",
              path: [
                "stages",
                stageIndex,
                "workItems",
                workIndex,
                "dependencies",
                dependencyIndex,
              ],
              message: "工作项依赖必须指向其它已存在的工作项。",
            });
            return;
          }
          indegree.set(item.id, indegree.get(item.id)! + 1);
          dependents.get(dependency)!.push(item.id);
        }),
      ),
    );
    const ready = [...indegree]
      .filter(([, count]) => count === 0)
      .map(([id]) => id);
    let visited = 0;
    while (ready.length) {
      const id = ready.pop()!;
      visited += 1;
      for (const dependent of dependents.get(id)!) {
        const count = indegree.get(dependent)! - 1;
        indegree.set(dependent, count);
        if (count === 0) ready.push(dependent);
      }
    }
    if (visited !== workItems.length)
      context.addIssue({
        code: "custom",
        path: ["stages"],
        message: "工作项依赖不能形成循环。",
      });
  });
export type StagePlan = z.infer<typeof stagePlanSchema>;

export interface StageInput {
  name: string;
  goal: string;
  workItems: StageWorkItem[];
  approvalGate?: StageApprovalGate;
}

export interface CreateStagePlanInput {
  id?: string;
  title: string;
  projectId: string;
  createdBy: "agent" | "user";
  stages: StageInput[];
}

export class StagePlanError extends Error {}

function now(): number {
  return Date.now();
}

/** 物化一个新 StagePlan：stages 按输入顺序编号，状态统一 doing。 */
export function createStagePlan(input: CreateStagePlanInput): StagePlan {
  if (!input.stages.length || input.stages.length > 32)
    throw new StagePlanError("Stage 计划必须包含 1–32 个阶段。");
  const stamp = now();
  const candidate = {
    id:
      input.id ??
      `plan-${stamp.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title,
    projectId: input.projectId,
    createdBy: input.createdBy,
    revision: 0,
    stages: input.stages.map((stage, index) => ({
      index,
      name: stage.name,
      goal: stage.goal,
      status: "doing" as const,
      workItems: stage.workItems,
      approvalGate: stage.approvalGate,
      createdAt: stamp,
      updatedAt: stamp,
    })),
    createdAt: stamp,
    updatedAt: stamp,
  };
  const result = stagePlanSchema.safeParse(candidate);
  if (!result.success)
    throw new StagePlanError(
      `Stage 计划无效：${result.error.issues[0]?.path.join(".") || "plan"} ${result.error.issues[0]?.message || "校验失败"}`,
    );
  return result.data;
}

/**
 * CAS 推进阶段状态。expectedStatus 必须与当前一致，否则抛错（不写入）。
 * 合法迁移：
 *   doing → plan_review | result_review | blocked
 *   plan_review → doing（批准）| blocked（拒绝）
 *   result_review → done（批准）| doing（拒绝，返回修改）
 *   blocked → doing（修复/重试后继续）
 *   done →（终态，无迁移）
 */
export function casAdvanceStage(
  plan: StagePlan,
  stageIndex: number,
  expectedStatus: StageStatus,
  nextStatus: StageStatus,
): StagePlan {
  const stage = plan.stages.find((item) => item.index === stageIndex);
  if (!stage) throw new StagePlanError(`阶段 ${stageIndex} 不存在。`);
  if (stage.status !== expectedStatus)
    throw new StagePlanError(
      `阶段 ${stageIndex} 当前状态为 ${stage.status}，期望 ${expectedStatus}（并发冲突，未推进）。`,
    );
  const allowed: Record<string, readonly StageStatus[]> = {
    doing: ["plan_review", "result_review", "blocked"],
    plan_review: ["doing", "blocked"],
    result_review: ["done", "doing"],
    blocked: ["doing"],
    done: [],
  };
  if (!allowed[stage.status].includes(nextStatus))
    throw new StagePlanError(`不允许从 ${stage.status} 迁移到 ${nextStatus}。`);
  if (stage.status === "doing" && nextStatus === "plan_review") {
    if (stage.approvalGate !== "plan" || stage.planApprovedAt !== undefined)
      throw new StagePlanError("此阶段不需要或已通过计划审批。");
  }
  if (
    (stage.status === "doing" && nextStatus === "result_review") ||
    (stage.status === "result_review" && nextStatus === "done")
  ) {
    if (stage.approvalGate === "plan" && stage.planApprovedAt === undefined)
      throw new StagePlanError("计划审批尚未通过，不能提交结果。");
    if (stage.workItems.some((item) => item.status !== "succeeded"))
      throw new StagePlanError("工作项尚未全部成功，不能完成阶段。");
  }
  const stamp = now();
  return {
    ...plan,
    revision: plan.revision + 1,
    updatedAt: stamp,
    stages: plan.stages.map((item) =>
      item.index === stageIndex
        ? {
            ...item,
            status: nextStatus,
            planApprovedAt:
              stage.status === "plan_review" && nextStatus === "doing"
                ? stamp
                : item.planApprovedAt,
            updatedAt: stamp,
          }
        : item,
    ),
  };
}

/** 阶段当前需要哪个审批门；无审批要求或不在审批状态时返回 null。 */
export function stageApprovalGateFor(stage: Stage): StageApprovalGate | null {
  if (stage.status === "plan_review") return "plan";
  if (stage.status === "result_review") return "result";
  return null;
}

/** 当前等待人工审批的（阶段, 门）列表，供 UI 与编排器汇总。 */
export function pendingStageApprovals(
  plan: StagePlan,
): Array<{ stageIndex: number; gate: StageApprovalGate }> {
  return plan.stages
    .map((stage) => {
      const gate = stageApprovalGateFor(stage);
      return gate ? { stageIndex: stage.index, gate } : null;
    })
    .filter((entry): entry is { stageIndex: number; gate: StageApprovalGate } =>
      Boolean(entry),
    );
}

export interface StagePlanProgress {
  total: number;
  done: number;
  blocked: number;
  inFlight: number;
  pendingApprovals: number;
}

/** 计划进度汇总（不承载生成细节，供 UI/摘要）。 */
export function stagePlanProgress(plan: StagePlan): StagePlanProgress {
  const done = plan.stages.filter((stage) => stage.status === "done").length;
  const blocked = plan.stages.filter(
    (stage) => stage.status === "blocked",
  ).length;
  const inFlight = plan.stages.filter(
    (stage) => stage.status === "doing" || stage.status === "result_review",
  ).length;
  return {
    total: plan.stages.length,
    done,
    blocked,
    inFlight,
    pendingApprovals: pendingStageApprovals(plan).length,
  };
}

/** 只重试失败/部分成功的工作项（failed/partial → queued，清 error）；cancelled/succeeded 不动。 */
export function retryStageWorkItems(
  plan: StagePlan,
  stageIndex: number,
): StagePlan {
  const stage = plan.stages.find((item) => item.index === stageIndex);
  if (!stage) throw new StagePlanError(`阶段 ${stageIndex} 不存在。`);
  const stamp = now();
  const workItems = stage.workItems.map((item) =>
    item.status === "failed" || item.status === "partial"
      ? {
          ...item,
          status: "queued" as const,
          error: undefined,
          updatedAt: stamp,
        }
      : item,
  );
  return {
    ...plan,
    revision: plan.revision + 1,
    updatedAt: stamp,
    stages: plan.stages.map((item) =>
      item.index === stageIndex
        ? { ...item, workItems, updatedAt: stamp }
        : item,
    ),
  };
}

export interface StageWorkItemCounts {
  total: number;
  succeeded: number;
  failed: number;
  partial: number;
  queued: number;
  running: number;
  cancelled: number;
}

/** 阶段工作项计数，用于 UI/摘要。 */
export function stageWorkItemCounts(stage: Stage): StageWorkItemCounts {
  const counts: StageWorkItemCounts = {
    total: stage.workItems.length,
    succeeded: 0,
    failed: 0,
    partial: 0,
    queued: 0,
    running: 0,
    cancelled: 0,
  };
  for (const item of stage.workItems) counts[item.status] += 1;
  return counts;
}

/** 单行摘要（≤120 字），供 Agent 活动行与 UI 徽标。 */
export function stagePlanSummary(plan: StagePlan): string {
  const progress = stagePlanProgress(plan);
  const first = pendingStageApprovals(plan)[0];
  const approval =
    first?.gate === "plan"
      ? ` · 等待计划审批(阶段${first.stageIndex})`
      : first?.gate === "result"
        ? ` · 等待结果审批(阶段${first.stageIndex})`
        : "";
  return `${plan.title}：${progress.done}/${progress.total} 阶段完成${approval}`;
}

/** 存储兼容：白名单重建；损坏条目返回 null（调用方丢弃，不覆盖有效快照）。 */
export function normalizeStagePlan(value: unknown): StagePlan | null {
  if (!value || typeof value !== "object") return null;
  const result = stagePlanSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function normalizeStagePlans(value: unknown): StagePlan[] {
  const ids = new Set<string>();
  return Array.isArray(value)
    ? value.slice(0, 64).flatMap((entry) => {
        const plan = normalizeStagePlan(entry);
        if (!plan || ids.has(plan.id)) return [];
        ids.add(plan.id);
        return [plan];
      })
    : [];
}
