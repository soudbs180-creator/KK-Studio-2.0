import { z } from "zod";
import type {
  ConfirmationCheckpoint,
  RichStatuslinePayload,
} from "../../domain/agentWorkflow.ts";
import type { AgentOpResult } from "./agentConnection.ts";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "./agentTypes.ts";
import {
  type AgentOperationPlan,
  operationSnapshotIdentity,
} from "./agentOperationPlan.ts";
import { RouterWorkerEngine } from "./router.ts";
import { WorkerPoolManager } from "./workerSession.ts";
import { ThreePhaseFlowCoordinator } from "./threePhaseFlow.ts";
import { ToolRegistry } from "./toolRegistry.ts";
import { SecurityHookEngine, createSecretLeakGuard } from "./preInvocation.ts";
import {
  StatuslineBroadcaster,
  type StatuslineListener,
} from "./statuslineIpc.ts";

export interface AgentOpExecutionContext {
  signal: AbortSignal;
  modelAllowlist?: readonly string[];
  confirmPlan?: (
    checkpoint: ConfirmationCheckpoint,
    signal: AbortSignal,
  ) => Promise<boolean>;
}

interface RuntimeOptions {
  getScope(): string;
  getBlockReason(): string | undefined;
}

/** Coordinates concrete host operations; model inference stays in the selected Agent. */
export class AgentToolRuntime {
  readonly #options: RuntimeOptions;
  readonly #router = new RouterWorkerEngine();
  readonly #workers = new WorkerPoolManager(3);
  readonly #statusline = new StatuslineBroadcaster();

  constructor(options: RuntimeOptions) {
    this.#options = options;
  }

  subscribe(listener: StatuslineListener): () => void {
    return this.#statusline.subscribe(listener);
  }

  async applyOps(
    plan: AgentOperationPlan,
    context: AgentOpExecutionContext | undefined,
    execute: (
      ops: CanvasAgentOp[],
      context: AgentOpExecutionContext,
    ) => Promise<AgentOpResult>,
    getSnapshot: () => CanvasAgentSnapshot | null,
  ): Promise<AgentOpResult> {
    const { ops, descriptions, snapshot } = structuredClone(plan);
    if (!ops.length) return { applied: [], rejected: [], tasks: [] };
    const snapshotIdentity = operationSnapshotIdentity(snapshot);
    const scope = this.#options.getScope();
    const signal = context?.signal ?? new AbortController().signal;
    const assertCurrent = () => {
      signal.throwIfAborted();
      const blocked = this.#options.getBlockReason();
      if (blocked) throw new Error(blocked);
      if (!scope || scope !== this.#options.getScope())
        throw new Error("项目或聊天已切换，未执行旧授权操作。");
    };
    const flow = new ThreePhaseFlowCoordinator();
    const prompt = ops.map((op) => op.type).join(", ");
    const route = this.#router.classifyAndRoute({
      id: crypto.randomUUID(),
      prompt,
    });
    const workerId =
      route.route === "worker_delegate"
        ? `worker-${route.workerType}`
        : "router";
    const startedAt = Date.now();
    const emit = (state: RichStatuslinePayload["state"], step = 0, tasks = 0) =>
      this.#statusline.broadcast({
        type: "rich_statusline",
        scope,
        agent: workerId,
        state,
        progress: step * 100,
        step,
        totalSteps: 1,
        currentTool: state === "tool_use" ? "canvas_apply_ops" : null,
        durationMs: Date.now() - startedAt,
        sandboxEnabled: false,
        artifactCount: 0,
        taskCount: tasks,
        modelDisplayName: "",
        timestamp: Date.now(),
      });
    let ticketId: string | undefined;
    try {
      assertCurrent();
      const { planId } = flow.startPlanning(prompt);
      emit("thinking");
      const generationCount = ops.filter(
        (op) => op.type === "run_generation",
      ).length;
      const destructive = ops.some(
        (op) =>
          op.type === "delete_node" ||
          op.type === "delete_connections" ||
          op.type === "canvas_operation",
      );
      const { checkpoint, requiresConfirmation } = flow.compilePlan(
        {
          planId,
          title: "画布操作计划",
          userPrompt: descriptions.join("；"),
          items: descriptions.map((goal, index) => ({
            id: `op-${index}`,
            kind: "canvas_op",
            goal,
            estimatedDurationMs: 0,
            toolToUse: "canvas_apply_ops",
            dependencies: [],
          })),
          requestedTools: ["canvas_apply_ops"],
          suggestedStepQuota: 1,
        },
        {
          costTier: generationCount ? "medium" : "zero",
          estimatedTokens: 0,
          triggeredGates: destructive ? ["overwrite_original"] : [],
          reversibility: "partial_undo",
          affectedNodeIds: [],
          externalEndpointsContacted: [],
          securityRiskLevel: "low",
        },
      );
      if (requiresConfirmation) {
        emit("blocked");
        if (
          !context?.confirmPlan ||
          !(await context.confirmPlan(checkpoint, signal))
        ) {
          flow.rejectCheckpoint(checkpoint.checkpointId, "未批准本次操作");
          throw new Error("操作计划未获授权，未删除节点或提交生成。");
        }
        if (snapshotIdentity !== operationSnapshotIdentity(getSnapshot()))
          throw new Error("画布已变化，请重新审阅操作计划；本次未执行。");
      }
      assertCurrent();
      const { ticket } = flow.approveCheckpoint(checkpoint.checkpointId, {
        authorizedBy: requiresConfirmation ? "User" : "Router",
        workerId,
      });
      ticketId = ticket.ticketId;
      const security = new SecurityHookEngine();
      security.addHook(createSecretLeakGuard());
      security.addHook(() => {
        assertCurrent();
        return { allow: true };
      });
      const registry = new ToolRegistry(security);
      let receipt: AgentOpResult | undefined;
      let operation: Promise<AgentOpResult> | undefined;
      registry.registerTool({
        name: "canvas_apply_ops",
        description: "Apply authorized operations to the current project",
        riskLevel: generationCount || destructive ? "sensitive" : "safe",
        parameters: z.object({
          ops: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
        }),
        timeoutMs: 120000,
        execute: async (_args, execution) => {
          assertCurrent();
          emit("tool_use");
          operation = execute(ops, { ...context, signal: execution.signal });
          receipt = await operation;
          return {
            applied: receipt.applied.length,
            rejected: receipt.rejected.map((item) => item.reason),
            tasks: receipt.tasks,
            outputs: receipt.outputs,
          };
        },
      });
      const worker = this.#workers.acquireSession({
        ticket,
        toolRegistry: registry,
        workspaceRoot: scope,
      });
      const result = await worker.executeStep(
        "canvas_apply_ops",
        { ops },
        signal,
      );
      // A cancelled host batch must settle its already accepted writes and tasks.
      if (!result.ok && operation) receipt = await operation;
      if (!result.ok && !receipt)
        throw new Error(result.error?.message ?? "工具执行失败");
      if (!receipt) throw new Error("工具未返回执行回执");
      if (receipt.rejected.length) {
        flow.failExecution(
          receipt.rejected.map((item) => item.reason).join("；"),
        );
        emit("failed", 1, receipt.tasks?.length);
      } else {
        worker.complete(`已执行 ${receipt.applied.length} 项画布操作`);
        flow.completeExecution();
        emit("completed", 1, receipt.tasks?.length);
      }
      return receipt;
    } catch (error) {
      flow.failExecution(
        error instanceof Error ? error.message : "工具执行失败",
      );
      emit("failed");
      throw error;
    } finally {
      if (ticketId) this.#workers.releaseSession(ticketId);
    }
  }
}
