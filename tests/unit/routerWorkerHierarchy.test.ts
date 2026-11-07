import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyWorkerRole,
  computeComplexityScore,
  evaluateGate,
  RouterWorkerEngine,
  RouterSession,
  type AgentTask,
} from "../../src/features/agent/router.ts";
import {
  SubagentRegistry,
  WorkerSession,
  WorkerPoolManager,
} from "../../src/features/agent/workerSession.ts";
import { ToolRegistry } from "../../src/features/agent/toolRegistry.ts";
import { MandateLifecycleManager } from "../../src/features/agent/threePhaseFlow.ts";

test("router: classifyWorkerRole maps intent keywords to standard worker roles", () => {
  assert.equal(
    classifyWorkerRole("Draw a cyberpunk storyboard for scene 1"),
    "artist",
  );
  assert.equal(classifyWorkerRole("生成分镜画面并渲染"), "artist");
  assert.equal(
    classifyWorkerRole("Review and audit aesthetic redline"),
    "critic",
  );
  assert.equal(classifyWorkerRole("检查评审角色一致性"), "critic");
  assert.equal(
    classifyWorkerRole("Write a typescript script to fix bug"),
    "coder",
  );
  assert.equal(classifyWorkerRole("编译并生成代码"), "coder");
  assert.equal(classifyWorkerRole("Tell me about the story premise"), "writer");
});

test("router: computeComplexityScore and evaluateGate produce deterministic gating", () => {
  // Simple prompt
  const simpleScore = computeComplexityScore("Hello");
  assert.ok(simpleScore < 30);

  // Multi-step complex creative pipeline
  const complexPrompt =
    "第一步：解析小说文本并生成4个分镜；第二步：在画布上创建节点并连线；第三步：调用高清渲染生图并排布到画布";
  const complexScore = computeComplexityScore(complexPrompt);
  assert.ok(complexScore >= 60);

  const gate = evaluateGate(complexPrompt);
  assert.equal(gate.requiresWorker, true);
  assert.ok(gate.recommendedTools.length > 0);
  assert.ok(gate.recommendedMaxSteps >= 10);
});

test("router: RouterWorkerEngine conforms to canonical E2E routing interface", () => {
  const engine = new RouterWorkerEngine();

  // Short simple query -> router_direct
  const taskDirect: AgentTask = {
    id: "task-1",
    prompt: "Short prompt",
  };
  const routeDirect = engine.classifyAndRoute(taskDirect);
  assert.equal(routeDirect.route, "router_direct");
  assert.equal(routeDirect.requiresGateApproval, false);

  // Long complex query -> worker_delegate
  const taskDelegate: AgentTask = {
    id: "task-2",
    prompt: "A".repeat(120),
  };
  const routeDelegate = engine.classifyAndRoute(taskDelegate);
  assert.equal(routeDelegate.route, "worker_delegate");
  assert.equal(routeDelegate.requiresGateApproval, true);

  // Explicit complexityScore
  const taskExplicitScore: AgentTask = {
    id: "task-3",
    prompt: "Draw storyboard",
    complexityScore: 120,
  };
  const routeExplicit = engine.classifyAndRoute(taskExplicitScore);
  assert.equal(routeExplicit.route, "worker_delegate");
  assert.equal(routeExplicit.workerType, "artist");
});

test("router: RouterSession handles stop words, direct replies, and task acceptance", () => {
  const session = new RouterSession();

  // 1. Stop command
  const stopDecision = session.evaluateInput("停止任务，立即终止");
  assert.equal(stopDecision.kind, "stop");

  // 2. Low-complexity query -> direct_reply
  const directDecision = session.evaluateInput("How are you?");
  assert.equal(directDecision.kind, "direct_reply");
  assert.ok(directDecision.directResponseText?.length);

  // 3. Complex creative request -> accept with mandate & ticket
  const acceptDecision = session.evaluateInput(
    "第一步生成赛博朋克分镜，第二步排布到画布并连线，批量生成16张",
  );
  assert.equal(acceptDecision.kind, "accept");
  assert.ok(acceptDecision.mandate);
  assert.ok(acceptDecision.ticketId);

  // 4. Dispatch task
  const dispatchRes = session.dispatchTask({
    id: "d-1",
    prompt: "Short simple query",
  });
  assert.equal(dispatchRes.decision.kind, "direct_reply");
});

test("worker: SubagentRegistry validates role tools and mandate scope", () => {
  const registry = new SubagentRegistry();
  const specs = registry.list();
  assert.ok(specs.length >= 6);

  const plannerSpec = registry.get("planner");
  assert.ok(plannerSpec);
  assert.equal(plannerSpec?.role, "planner");

  const mandateManager = new MandateLifecycleManager();

  // Valid mandate for planner
  const validMandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["plan_get_stage_status", "search_index"],
    maxStepCount: 5,
  });
  // attach targetRole
  const plannerMandate = Object.freeze({
    ...validMandate,
    targetRole: "planner" as const,
  });
  const validCheck = registry.validateMandate(plannerMandate);
  assert.equal(validCheck.valid, true);

  // Invalid mandate requesting generation_worker tools for planner
  const invalidMandate = Object.freeze({
    ...validMandate,
    targetRole: "planner" as const,
    allowedTools: ["generate_image"],
  });
  const invalidCheck = registry.validateMandate(invalidMandate);
  assert.equal(invalidCheck.valid, false);
});

test("worker: WorkerSession executes tools, tracks steps, and supports foldback & handback", async () => {
  const toolRegistry = new ToolRegistry();
  toolRegistry.registerTool({
    name: "mock_canvas_node",
    description: "Adds node to canvas",
    riskLevel: "safe",
    parameters: {},
    execute: (args) => ({ nodeId: "node-101", ...args }),
  });

  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["mock_canvas_node"],
    maxStepCount: 5,
  });
  const ticket = mandateManager.createTicket(mandate.id, "worker-canvas");

  const session = new WorkerSession({
    ticket,
    toolRegistry,
    workspaceRoot: "D:/kk-studio/KK-Studio-2.0",
  });

  // Step 1: Tool execution
  const res = await session.executeStep("mock_canvas_node", {
    title: "Hero Shot",
  });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, { nodeId: "node-101", title: "Hero Shot" });
  assert.equal(session.turnsExecuted, 1);
  assert.equal(ticket.stepsUsed, 1);

  // Complete session -> foldback result
  const foldback = session.complete("Canvas node created successfully", [
    "node-101",
  ]);
  assert.equal(foldback.status, "success");
  assert.equal(foldback.executiveSummary, "Canvas node created successfully");
  assert.deepEqual(foldback.artifactRefs, ["node-101"]);
  assert.equal(ticket.status, "completed");

  // Handback demonstration
  const ticket2 = mandateManager.createTicket(mandate.id, "worker-canvas-2");
  const session2 = new WorkerSession({
    ticket: ticket2,
    toolRegistry,
    workspaceRoot: "D:/kk-studio/KK-Studio-2.0",
  });
  const handback = session2.handback("trig-1", "External billing required");
  assert.equal(handback.handedBack, true);
  assert.equal(ticket2.status, "blocked");
  assert.match(ticket2.blockedReason ?? "", /External billing required/);
});

test("worker: WorkerPoolManager enforces concurrency limits and slot release", () => {
  const pool = new WorkerPoolManager(2);
  const toolRegistry = new ToolRegistry();
  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: [],
    maxStepCount: 5,
  });

  const t1 = mandateManager.createTicket(mandate.id, "w-1");
  const t2 = mandateManager.createTicket(mandate.id, "w-2");
  const t3 = mandateManager.createTicket(mandate.id, "w-3");

  const s1 = pool.acquireSession({
    ticket: t1,
    toolRegistry,
    workspaceRoot: ".",
  });
  assert.equal(pool.activeCount, 1);

  const s2 = pool.acquireSession({
    ticket: t2,
    toolRegistry,
    workspaceRoot: ".",
  });
  assert.equal(pool.activeCount, 2);
  assert.equal(pool.canAcquireSlot(), false);

  // 3rd worker should throw limit reached
  assert.throws(() => {
    pool.acquireSession({ ticket: t3, toolRegistry, workspaceRoot: "." });
  }, /Worker concurrency limit reached/);

  // Release s1 -> now can acquire
  pool.releaseSession(s1.ticket.ticketId);
  assert.equal(pool.activeCount, 1);
  assert.equal(pool.canAcquireSlot(), true);

  const s3 = pool.acquireSession({
    ticket: t3,
    toolRegistry,
    workspaceRoot: ".",
  });
  assert.equal(pool.activeCount, 2);
  assert.ok(s2);
  assert.ok(s3);
});

test("router: RouterWorkerEngine falls back to prompt length when complexityScore is 0", () => {
  const engine = new RouterWorkerEngine();

  // Short prompt with 0 complexity score -> router_direct
  const shortTask: AgentTask = {
    id: "t-short",
    prompt: "Quick note",
    complexityScore: 0,
  };
  const routeShort = engine.classifyAndRoute(shortTask);
  assert.equal(routeShort.route, "router_direct");

  // Long prompt (>100 chars) with 0 complexity score -> worker_delegate
  const longTask: AgentTask = {
    id: "t-long",
    prompt: "X".repeat(105),
    complexityScore: 0,
  };
  const routeLong = engine.classifyAndRoute(longTask);
  assert.equal(routeLong.route, "worker_delegate");
  assert.equal(routeLong.requiresGateApproval, true);
});

test("worker: WorkerPoolManager provides async FIFO queueing when capacity is saturated", async () => {
  const pool = new WorkerPoolManager(1);
  const toolRegistry = new ToolRegistry();
  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: [],
    maxStepCount: 5,
  });

  const t1 = mandateManager.createTicket(mandate.id, "w-q1");
  const t2 = mandateManager.createTicket(mandate.id, "w-q2");

  // Acquire first slot synchronously
  const s1 = pool.acquireSession({
    ticket: t1,
    toolRegistry,
    workspaceRoot: ".",
  });
  assert.equal(pool.activeCount, 1);
  assert.equal(pool.canAcquireSlot(), false);

  // Second worker waits on queue via acquireAsync
  let s2Resolved = false;
  const acquirePromise = pool
    .acquireAsync({ ticket: t2, toolRegistry, workspaceRoot: "." })
    .then((s2) => {
      s2Resolved = true;
      return s2;
    });

  assert.equal(pool.queueLength, 1);
  assert.equal(s2Resolved, false);

  // Release s1 -> frees slot, s2 immediately dequeues and acquires
  pool.releaseSession(s1.ticket.ticketId);
  const s2 = await acquirePromise;
  assert.equal(s2Resolved, true);
  assert.equal(s2.ticket.ticketId, t2.ticketId);
  assert.equal(pool.activeCount, 1);
  assert.equal(pool.queueLength, 0);

  // Cleanup
  pool.releaseSession(s2.ticket.ticketId);
  assert.equal(pool.activeCount, 0);
});

test("worker: WorkerPoolManager prevents concurrency breach under microtask race", async () => {
  const pool = new WorkerPoolManager(1);
  const toolRegistry = new ToolRegistry();
  const mandateManager = new MandateLifecycleManager();
  const mandate = mandateManager.issueMandate({
    authorizedBy: "Router",
    allowedTools: [],
    maxStepCount: 5,
  });

  const t1 = mandateManager.createTicket(mandate.id, "w-race-1");
  const t2 = mandateManager.createTicket(mandate.id, "w-race-2");
  const t3 = mandateManager.createTicket(mandate.id, "w-race-3");

  const s1 = pool.acquireSession({
    ticket: t1,
    toolRegistry,
    workspaceRoot: ".",
  });
  const p2 = pool.acquireAsync({
    ticket: t2,
    toolRegistry,
    workspaceRoot: ".",
  });

  // When s1 is released, canAcquireSlot must remain false to protect queued p2's slot
  pool.releaseSession(s1.ticket.ticketId);
  assert.equal(
    pool.canAcquireSlot(),
    false,
    "Slot must be reserved for queued waiter",
  );

  // Synchronous caller must be rejected
  assert.throws(() => {
    pool.acquireSession({ ticket: t3, toolRegistry, workspaceRoot: "." });
  }, /Worker concurrency limit reached/);

  // Queued waiter acquires successfully
  const s2 = await p2;
  assert.equal(pool.activeCount, 1);
  assert.equal(s2.ticket.ticketId, t2.ticketId);

  // Cleanup
  pool.releaseSession(s2.ticket.ticketId);
  assert.equal(pool.activeCount, 0);
});
