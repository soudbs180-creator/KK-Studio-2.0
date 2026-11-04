import assert from "node:assert/strict";
import test from "node:test";
import {
  RouterWorkerEngine,
  MandateLifecycleManager,
  SecurityHookEngine,
  formatStatuslineIPC,
  OntologyGraph,
  validateAnswerability,
  AutonomousCanvasController,
  CanvasMcpServer,
  FloorplanCanvasAdapter,
} from "./harness.ts";

/* =========================================================================
 * Tier 1: Feature Coverage (Features 10 - 17 / Milestones 3 & 4)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 10: Router + Worker Multi-Agent Engine
// -------------------------------------------------------------------------
test("F10-T1-01: Router handles simple low-complexity prompt directly without gate", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "task-simple",
    prompt: "Hello world greeting",
    complexityScore: 10,
  });
  assert.equal(res.route, "router_direct");
  assert.equal(res.requiresGateApproval, false);
});

test("F10-T1-02: Router delegates complex prompt to worker session with gate approval", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "task-complex",
    prompt:
      "Generate an elaborate 5-scene cinematic storyboard depicting an ancient sci-fi city",
    complexityScore: 150,
  });
  assert.equal(res.route, "worker_delegate");
  assert.equal(res.requiresGateApproval, true);
});

test("F10-T1-03: Router classifies visual/storyboard prompts to artist worker", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "task-art",
    prompt: "绘制赛博朋克风格的电影分镜",
  });
  assert.equal(res.workerType, "artist");
});

test("F10-T1-04: Router classifies coding/debugging prompts to coder worker", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "task-code",
    prompt: "Fix TypeScript type error in gateway scheduler",
  });
  assert.equal(res.workerType, "coder");
});

test("F10-T1-05: Router classifies review/audit prompts to critic worker", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "task-review",
    prompt: "Perform forensic audit and review continuity of the shots",
  });
  assert.equal(res.workerType, "critic");
});

// -------------------------------------------------------------------------
// Feature 11: Scoped Mandates & Lifecycle Tickets
// -------------------------------------------------------------------------
test("F11-T1-01: MandateManager issues immutable mandate with frozen allowedTools", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["canvas_add", "canvas_move"],
    maxStepCount: 10,
  });
  assert.ok(mandate.id.startsWith("mandate-"));
  assert.equal(mandate.authorizedBy, "Router");
  assert.equal(mandate.maxStepCount, 10);
  assert.ok(Object.isFrozen(mandate));
  assert.ok(Object.isFrozen(mandate.allowedTools));
});

test("F11-T1-02: MandateManager creates initial pending ticket bound to mandate", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "User",
    allowedTools: ["tool_a"],
    maxStepCount: 5,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-1");
  assert.equal(ticket.status, "pending");
  assert.equal(ticket.stepsUsed, 0);
  assert.equal(ticket.mandate.id, mandate.id);
});

test("F11-T1-03: executing authorized step transitions ticket to in_progress and increments step count", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["query_db"],
    maxStepCount: 5,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-db");

  const step1 = mgr.executeStep(ticket.ticketId, "query_db");
  assert.equal(step1.allowed, true);
  assert.equal(ticket.status, "in_progress");
  assert.equal(ticket.stepsUsed, 1);
});

test("F11-T1-04: unauthorized tool execution is blocked and marks ticket blocked", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["safe_tool"],
    maxStepCount: 5,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-rogue");

  const step = mgr.executeStep(ticket.ticketId, "dangerous_system_delete");
  assert.equal(step.allowed, false);
  assert.ok(step.reason?.includes("not permitted by mandate"));
  assert.equal(ticket.status, "blocked");
});

test("F11-T1-05: step budget exhaustion blocks subsequent tool invocations", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "User",
    allowedTools: ["step_tool"],
    maxStepCount: 2,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-budget");

  assert.equal(mgr.executeStep(ticket.ticketId, "step_tool").allowed, true);
  assert.equal(mgr.executeStep(ticket.ticketId, "step_tool").allowed, true);
  // Exceeded
  const step3 = mgr.executeStep(ticket.ticketId, "step_tool");
  assert.equal(step3.allowed, false);
  assert.ok(step3.reason?.includes("budget exhausted"));
  assert.equal(ticket.status, "blocked");
});

// -------------------------------------------------------------------------
// Feature 12: PreInvocation Security Hooks & Statusline IPC
// -------------------------------------------------------------------------
test("F12-T1-01: SecurityHookEngine permits safe tool invocation without hooks", () => {
  const engine = new SecurityHookEngine();
  const res = engine.evaluate("canvas_zoom", { zoom: 1.5 });
  assert.equal(res.allow, true);
});

test("F12-T1-02: SecurityHookEngine intercepts dangerous tool commands via registered hook", () => {
  const engine = new SecurityHookEngine();
  engine.addHook((tool, args) => {
    if (
      tool === "system_exec" &&
      typeof args.cmd === "string" &&
      args.cmd.includes("rm -rf")
    ) {
      return { allow: false, reason: "Destructive shell command prohibited" };
    }
    return { allow: true };
  });

  const blocked = engine.evaluate("system_exec", { cmd: "rm -rf /" });
  assert.equal(blocked.allow, false);
  assert.equal(blocked.reason, "Destructive shell command prohibited");

  const allowed = engine.evaluate("system_exec", { cmd: "echo safe" });
  assert.equal(allowed.allow, true);
});

test("F12-T1-03: multiple hooks evaluate in order and short-circuit on first rejection", () => {
  const engine = new SecurityHookEngine();
  let hook2Run = false;
  engine.addHook(() => ({ allow: false, reason: "Failed hook 1" }));
  engine.addHook(() => {
    hook2Run = true;
    return { allow: true };
  });

  const res = engine.evaluate("any_tool", {});
  assert.equal(res.allow, false);
  assert.equal(res.reason, "Failed hook 1");
  assert.equal(hook2Run, false, "Hook 2 must not run after rejection");
});

test("F12-T1-04: formatStatuslineIPC serializes valid JSON statusline message", () => {
  const line = formatStatuslineIPC({
    agent: "worker_writer",
    step: 3,
    totalSteps: 10,
    currentTool: "generate_outline",
    durationMs: 1250,
  });
  const parsed = JSON.parse(line);
  assert.equal(parsed.type, "statusline");
  assert.equal(parsed.agent, "worker_writer");
  assert.equal(parsed.progress, 30);
  assert.equal(parsed.currentTool, "generate_outline");
  assert.equal(parsed.durationMs, 1250);
});

test("F12-T1-05: formatStatuslineIPC clamps progress to 100%", () => {
  const line = formatStatuslineIPC({
    agent: "worker_done",
    step: 15,
    totalSteps: 10,
    durationMs: 3000,
  });
  const parsed = JSON.parse(line);
  assert.equal(parsed.progress, 100);
});

// -------------------------------------------------------------------------
// Feature 13: Semantic Ontology Knowledge Graph
// -------------------------------------------------------------------------
test("F13-T1-01: OntologyGraph adds entities and retains node records", () => {
  const g = new OntologyGraph();
  g.addEntity({
    id: "character_protagonist",
    name: "Alice",
    type: "character",
    properties: { age: 24 },
  });
  assert.equal(
    g.hasPath("character_protagonist", "character_protagonist"),
    true,
  );
});

test("F13-T1-02: OntologyGraph connects directed relationship between two entities", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "hero", name: "Hero", type: "character", properties: {} });
  g.addEntity({ id: "sword", name: "Excalibur", type: "prop", properties: {} });
  g.connect("hero", "sword");

  assert.equal(g.hasPath("hero", "sword"), true);
  assert.equal(
    g.hasPath("sword", "hero"),
    false,
    "Directed edge is not bidirectional",
  );
});

test("F13-T1-03: OntologyGraph resolves multi-hop transitive paths", () => {
  const g = new OntologyGraph();
  g.addEntity({
    id: "scene_1",
    name: "Intro Scene",
    type: "scene",
    properties: {},
  });
  g.addEntity({ id: "shot_1_1", name: "Shot 1", type: "shot", properties: {} });
  g.addEntity({ id: "actor_1", name: "Bob", type: "actor", properties: {} });

  g.connect("scene_1", "shot_1_1");
  g.connect("shot_1_1", "actor_1");

  assert.equal(g.hasPath("scene_1", "actor_1"), true);
});

test("F13-T1-04: OntologyGraph identifies disjoint disconnected entities", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "island_a", name: "A", type: "entity", properties: {} });
  g.addEntity({ id: "island_b", name: "B", type: "entity", properties: {} });

  assert.equal(g.hasPath("island_a", "island_b"), false);
});

test("F13-T1-05: connecting to non-existent entity throws explicit error", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "valid_node", name: "V", type: "entity", properties: {} });
  assert.throws(() => {
    g.connect("valid_node", "ghost_node");
  }, /Cannot connect non-existent entities/);
});

// -------------------------------------------------------------------------
// Feature 14: Pre-Flight Answerability Pre-Validation
// -------------------------------------------------------------------------
test("F14-T1-01: validateAnswerability succeeds when all required entities exist in graph", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "hero", name: "Hero", type: "character", properties: {} });
  g.addEntity({
    id: "villain",
    name: "Villain",
    type: "character",
    properties: {},
  });

  const res = validateAnswerability(
    "Battle between hero and villain",
    ["hero", "villain"],
    g,
  );
  assert.equal(res.answerable, true);
  assert.equal(res.missingEntities.length, 0);
});

test("F14-T1-02: validateAnswerability fails when required entity is missing from graph", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "hero", name: "Hero", type: "character", properties: {} });

  const res = validateAnswerability(
    "Hero summons magic dragon",
    ["hero", "dragon"],
    g,
  );
  assert.equal(res.answerable, false);
  assert.deepEqual(res.missingEntities, ["dragon"]);
});

test("F14-T1-03: validateAnswerability identifies multiple missing prerequisites", () => {
  const g = new OntologyGraph();
  const res = validateAnswerability(
    "Cast spell",
    ["wand", "mana", "target"],
    g,
  );
  assert.equal(res.answerable, false);
  assert.equal(res.missingEntities.length, 3);
});

test("F14-T1-04: validateAnswerability passes on empty required entities list", () => {
  const g = new OntologyGraph();
  const res = validateAnswerability("Generic text", [], g);
  assert.equal(res.answerable, true);
});

test("F14-T1-05: validateAnswerability preserves prompt text intact in result verification", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "sun", name: "Sun", type: "prop", properties: {} });
  const prompt = "Render the rising sun over mountain";
  const res = validateAnswerability(prompt, ["sun"], g);
  assert.equal(res.answerable, true);
});

// -------------------------------------------------------------------------
// Feature 15: Autonomous Canvas Agent Ops
// -------------------------------------------------------------------------
test("F15-T1-01: AutonomousCanvasController initializes with default viewport", () => {
  const ctrl = new AutonomousCanvasController();
  const vp = ctrl.viewport;
  assert.equal(vp.x, 0);
  assert.equal(vp.y, 0);
  assert.equal(vp.zoom, 1);
});

test("F15-T1-02: setViewport updates x, y coordinates and zoom level", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.setViewport(250, -100, 1.5);
  const vp = ctrl.viewport;
  assert.equal(vp.x, 250);
  assert.equal(vp.y, -100);
  assert.equal(vp.zoom, 1.5);
});

test("F15-T1-03: setViewport clamps zoom between 0.1 and 5.0", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.setViewport(0, 0, 10);
  assert.equal(ctrl.viewport.zoom, 5);

  ctrl.setViewport(0, 0, 0.01);
  assert.equal(ctrl.viewport.zoom, 0.1);
});

test("F15-T1-04: selectNodes selects specified list of node IDs", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.selectNodes(["node-1", "node-2"]);
  assert.deepEqual(ctrl.selectedNodes, ["node-1", "node-2"]);
});

test("F15-T1-05: selectNodes with append=true retains previously selected nodes", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.selectNodes(["node-1"]);
  ctrl.selectNodes(["node-2"], true);
  assert.deepEqual(ctrl.selectedNodes, ["node-1", "node-2"]);
});

// -------------------------------------------------------------------------
// Feature 16: Canvas 34 Zod Operations & MCP Server
// -------------------------------------------------------------------------
test("F16-T1-01: CanvasMcpServer executes valid add_card operation", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "add_card",
    payload: { cardId: "c-1", x: 100, y: 200, title: "Scene 1" },
  });
  assert.equal(res.success, true);
  assert.equal(res.op, "add_card");
});

test("F16-T1-02: CanvasMcpServer executes valid move_card operation", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "move_card",
    payload: { cardId: "c-1", deltaX: 50, deltaY: 20 },
  });
  assert.equal(res.success, true);
  assert.equal(res.op, "move_card");
});

test("F16-T1-03: CanvasMcpServer executes valid connect_cards operation", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "connect_cards",
    payload: { source: "c-1", target: "c-2", linkType: "sequence" },
  });
  assert.equal(res.success, true);
  assert.equal(res.op, "connect_cards");
});

test("F16-T1-04: CanvasMcpServer executes valid set_viewport operation", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "set_viewport",
    payload: { x: 500, y: 300, zoom: 0.8 },
  });
  assert.equal(res.success, true);
  assert.equal(res.op, "set_viewport");
});

test("F16-T1-05: CanvasMcpServer rejects unknown canvas operation with error", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "non_existent_op_99",
    payload: {},
  });
  assert.equal(res.success, false);
  assert.ok(res.error?.includes("Invalid"));
});

// -------------------------------------------------------------------------
// Feature 17: Hierarchical Blueprint Canvas Mapping (Floorplan)
// -------------------------------------------------------------------------
test("F17-T1-01: FloorplanCanvasAdapter flattens single root node", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "app-root",
    name: "KK Studio App",
    kind: "ui",
    path: "src/App.tsx",
  });
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].name, "KK Studio App");
  assert.equal(nodes[0].level, 0);
});

test("F17-T1-02: FloorplanCanvasAdapter flattens nested two-tier hierarchy", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "root",
    name: "Root",
    kind: "ui",
    path: "/",
    children: [
      { id: "child-1", name: "Gateway", kind: "service", path: "/gateway" },
      { id: "child-2", name: "Agent", kind: "worker", path: "/agent" },
    ],
  });
  assert.equal(nodes.length, 3);
  assert.equal(nodes[0].level, 0);
  assert.equal(nodes[1].level, 1);
  assert.equal(nodes[2].level, 1);
});

test("F17-T1-03: FloorplanCanvasAdapter preserves node kinds correctly", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "data-service",
    name: "Store",
    kind: "data",
    path: "/data",
  });
  assert.equal(nodes[0].kind, "data");
});

test("F17-T1-04: FloorplanCanvasAdapter processes 3-tier deep architecture tree", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "l0",
    name: "Level 0",
    kind: "feature",
    path: "/",
    children: [
      {
        id: "l1",
        name: "Level 1",
        kind: "service",
        path: "/l1",
        children: [
          { id: "l2", name: "Level 2", kind: "worker", path: "/l1/l2" },
        ],
      },
    ],
  });
  assert.equal(nodes.length, 3);
  assert.equal(nodes[2].level, 2);
  assert.equal(nodes[2].id, "l2");
});

test("F17-T1-05: FloorplanCanvasAdapter maintains stable depth-first traversal ordering", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "r",
    name: "Root",
    kind: "ui",
    path: "/",
    children: [
      {
        id: "c1",
        name: "C1",
        kind: "feature",
        path: "/c1",
        children: [{ id: "c1-1", name: "C1-1", kind: "data", path: "/c1/1" }],
      },
      { id: "c2", name: "C2", kind: "feature", path: "/c2" },
    ],
  });
  const ids = nodes.map((n) => n.id);
  assert.deepEqual(ids, ["r", "c1", "c1-1", "c2"]);
});
