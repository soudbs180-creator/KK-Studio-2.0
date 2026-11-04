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
 * Tier 2: Boundary & Corner Cases (Features 10 - 17 / Milestones 3 & 4)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 10: Router + Worker Multi-Agent Engine
// -------------------------------------------------------------------------
test("F10-T2-01: empty prompt is routed directly without crashing", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({ id: "t-empty", prompt: "" });
  assert.equal(res.route, "router_direct");
  assert.equal(res.requiresGateApproval, false);
});

test("F10-T2-02: huge prompt (10,000 characters) enforces worker delegation", () => {
  const engine = new RouterWorkerEngine();
  const hugePrompt = "A".repeat(10_000);
  const res = engine.classifyAndRoute({ id: "t-huge", prompt: hugePrompt });
  assert.equal(res.route, "worker_delegate");
  assert.equal(res.requiresGateApproval, true);
});

test("F10-T2-03: prompt containing conflicting keywords prioritizes visual artist over code", () => {
  const engine = new RouterWorkerEngine();
  const res = engine.classifyAndRoute({
    id: "t-mixed",
    prompt: "Draw an image representing a code bug in TypeScript",
  });
  assert.equal(res.workerType, "artist");
});

test("F10-T2-04: zero complexity score uses prompt length for gating evaluation", () => {
  const engine = new RouterWorkerEngine();
  const shortTask = engine.classifyAndRoute({
    id: "t-short",
    prompt: "Quick note",
    complexityScore: 0,
  });
  assert.equal(shortTask.route, "router_direct");

  const longTask = engine.classifyAndRoute({
    id: "t-long",
    prompt: "X".repeat(105),
    complexityScore: 0,
  });
  assert.equal(longTask.route, "worker_delegate");
});

test("F10-T2-05: repeated routing evaluations are deterministic and stateless", () => {
  const engine = new RouterWorkerEngine();
  const task = {
    id: "t-repeat",
    prompt: "Review architecture",
    complexityScore: 50,
  };
  const r1 = engine.classifyAndRoute(task);
  const r2 = engine.classifyAndRoute(task);
  assert.deepEqual(r1, r2);
});

// -------------------------------------------------------------------------
// Feature 11: Scoped Mandates & Lifecycle Tickets
// -------------------------------------------------------------------------
test("F11-T2-01: mandate with empty allowedTools permits no tools", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: [],
    maxStepCount: 5,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-empty");
  const step = mgr.executeStep(ticket.ticketId, "any_tool");
  assert.equal(step.allowed, false);
  assert.ok(step.reason?.includes("not permitted by mandate"));
});

test("F11-T2-02: mandate with zero step budget rejects step immediately", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "User",
    allowedTools: ["tool1"],
    maxStepCount: 0,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-0");
  const step = mgr.executeStep(ticket.ticketId, "tool1");
  assert.equal(step.allowed, false);
  assert.ok(step.reason?.includes("budget exhausted"));
});

test("F11-T2-03: executing step on non-existent ticket returns error", () => {
  const mgr = new MandateLifecycleManager();
  const step = mgr.executeStep("non-existent-ticket-id", "tool1");
  assert.equal(step.allowed, false);
  assert.equal(step.reason, "Ticket not found");
});

test("F11-T2-04: creating ticket with non-existent mandate throws error", () => {
  const mgr = new MandateLifecycleManager();
  assert.throws(
    () => mgr.createTicket("ghost-mandate", "worker-1"),
    /not found/,
  );
});

test("F11-T2-05: executing step on blocked ticket remains blocked", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["toolA"],
    maxStepCount: 5,
  });
  const ticket = mgr.createTicket(mandate.id, "worker-1");
  mgr.executeStep(ticket.ticketId, "unauthorized_tool"); // becomes blocked

  const nextStep = mgr.executeStep(ticket.ticketId, "toolA");
  assert.equal(nextStep.allowed, false);
  assert.equal(nextStep.reason, "Ticket is blocked");
});

// -------------------------------------------------------------------------
// Feature 12: PreInvocation Security Hooks & Statusline IPC
// -------------------------------------------------------------------------
test("F12-T2-01: hook returning allow=false without explicit reason provides safe rejection", () => {
  const engine = new SecurityHookEngine();
  engine.addHook(() => ({ allow: false }));
  const res = engine.evaluate("tool", {});
  assert.equal(res.allow, false);
  assert.equal(res.reason, undefined);
});

test("F12-T2-02: evaluating invocation with empty tool name and args executes safely", () => {
  const engine = new SecurityHookEngine();
  const res = engine.evaluate("", {});
  assert.equal(res.allow, true);
});

test("F12-T2-03: formatStatuslineIPC handles totalSteps=0 without divide-by-zero Infinity", () => {
  const line = formatStatuslineIPC({
    agent: "agent-0",
    step: 0,
    totalSteps: 0,
    durationMs: 0,
  });
  const parsed = JSON.parse(line);
  assert.ok(Number.isFinite(parsed.progress));
});

test("F12-T2-04: formatStatuslineIPC preserves Unicode characters in tool and agent names", () => {
  const line = formatStatuslineIPC({
    agent: "分镜绘制智能体",
    step: 1,
    totalSteps: 2,
    currentTool: "提取分镜画面",
    durationMs: 500,
  });
  const parsed = JSON.parse(line);
  assert.equal(parsed.agent, "分镜绘制智能体");
  assert.equal(parsed.currentTool, "提取分镜画面");
});

test("F12-T2-05: security hook inspection handles nested complex arguments", () => {
  const engine = new SecurityHookEngine();
  engine.addHook((tool, args) => {
    const payload = args.payload as Record<string, unknown> | undefined;
    if (payload?.command === "eval")
      return { allow: false, reason: "eval prohibited" };
    return { allow: true };
  });

  const res = engine.evaluate("runner", { payload: { command: "eval" } });
  assert.equal(res.allow, false);
  assert.equal(res.reason, "eval prohibited");
});

// -------------------------------------------------------------------------
// Feature 13: Semantic Ontology Knowledge Graph
// -------------------------------------------------------------------------
test("F13-T2-01: cyclic paths in graph do not cause stack overflow", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "node-a", name: "A", type: "concept", properties: {} });
  g.addEntity({ id: "node-b", name: "B", type: "concept", properties: {} });

  g.connect("node-a", "node-b");
  g.connect("node-b", "node-a"); // cycle

  assert.equal(g.hasPath("node-a", "node-b"), true);
  assert.equal(g.hasPath("node-a", "node-a"), true);
});

test("F13-T2-02: query path between non-existent entity and valid entity returns false", () => {
  const g = new OntologyGraph();
  g.addEntity({
    id: "real-node",
    name: "Real",
    type: "concept",
    properties: {},
  });

  assert.equal(g.hasPath("ghost-node", "real-node"), false);
  assert.equal(g.hasPath("real-node", "ghost-node"), false);
});

test("F13-T2-03: querying path on empty graph returns false", () => {
  const g = new OntologyGraph();
  assert.equal(g.hasPath("a", "b"), false);
});

test("F13-T2-04: deep linear chain of 50 nodes resolves path successfully", () => {
  const g = new OntologyGraph();
  for (let i = 0; i <= 50; i++) {
    g.addEntity({
      id: `n-${i}`,
      name: `Node ${i}`,
      type: "step",
      properties: {},
    });
    if (i > 0) g.connect(`n-${i - 1}`, `n-${i}`);
  }
  assert.equal(g.hasPath("n-0", "n-50"), true);
  assert.equal(g.hasPath("n-50", "n-0"), false);
});

test("F13-T2-05: duplicate entity registration updates entity definition", () => {
  const g = new OntologyGraph();
  g.addEntity({
    id: "prop-sword",
    name: "Iron Sword",
    type: "prop",
    properties: { power: 10 },
  });
  g.addEntity({
    id: "prop-sword",
    name: "Excalibur",
    type: "prop",
    properties: { power: 100 },
  });

  assert.equal(g.hasEntity("prop-sword"), true);
});

// -------------------------------------------------------------------------
// Feature 14: Pre-Flight Answerability Pre-Validation
// -------------------------------------------------------------------------
test("F14-T2-01: duplicate required entities in query are checked without errors", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "ent-1", name: "E1", type: "concept", properties: {} });

  const res = validateAnswerability("Prompt", ["ent-1", "ent-1", "ent-1"], g);
  assert.equal(res.answerable, true);
});

test("F14-T2-02: empty string required entity is flagged as missing if not in graph", () => {
  const g = new OntologyGraph();
  const res = validateAnswerability("Prompt", [""], g);
  assert.equal(res.answerable, false);
  assert.deepEqual(res.missingEntities, [""]);
});

test("F14-T2-03: massive list of 100 required entities is validated cleanly", () => {
  const g = new OntologyGraph();
  for (let i = 0; i < 100; i++) {
    g.addEntity({
      id: `ent-${i}`,
      name: `E${i}`,
      type: "concept",
      properties: {},
    });
  }

  const allReq = Array.from({ length: 100 }, (_, i) => `ent-${i}`);
  const res = validateAnswerability("Prompt", allReq, g);
  assert.equal(res.answerable, true);
});

test("F14-T2-04: prompt containing special characters ($^*?#) validates prerequisites correctly", () => {
  const g = new OntologyGraph();
  g.addEntity({
    id: "regex-var",
    name: "Var",
    type: "concept",
    properties: {},
  });

  const res = validateAnswerability(
    "Prompt with regex meta: [a-z]+.*^$",
    ["regex-var"],
    g,
  );
  assert.equal(res.answerable, true);
});

test("F14-T2-05: partial presence of required entities accurately reports exact missing subset", () => {
  const g = new OntologyGraph();
  g.addEntity({ id: "a", name: "A", type: "c", properties: {} });
  g.addEntity({ id: "c", name: "C", type: "c", properties: {} });

  const res = validateAnswerability("Test", ["a", "b", "c", "d"], g);
  assert.equal(res.answerable, false);
  assert.deepEqual(res.missingEntities, ["b", "d"]);
});

// -------------------------------------------------------------------------
// Feature 15: Autonomous Canvas Agent Ops
// -------------------------------------------------------------------------
test("F15-T2-01: negative zoom clamps to 0.1", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.setViewport(0, 0, -2);
  assert.equal(ctrl.viewport.zoom, 0.1);
});

test("F15-T2-02: extreme zoom clamps to 5.0", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.setViewport(0, 0, 9999);
  assert.equal(ctrl.viewport.zoom, 5.0);
});

test("F15-T2-03: selecting empty node list clears all selected nodes", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.selectNodes(["node-a", "node-b"]);
  assert.equal(ctrl.selectedNodes.length, 2);

  ctrl.selectNodes([]);
  assert.equal(ctrl.selectedNodes.length, 0);
});

test("F15-T2-04: duplicate node IDs in selection are deduplicated by Set", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.selectNodes(["card-1", "card-1", "card-1"]);
  assert.deepEqual(ctrl.selectedNodes, ["card-1"]);
});

test("F15-T2-05: negative x and y viewport coordinates are supported for infinite canvas", () => {
  const ctrl = new AutonomousCanvasController();
  ctrl.setViewport(-50000, -25000, 0.5);
  assert.equal(ctrl.viewport.x, -50000);
  assert.equal(ctrl.viewport.y, -25000);
});

// -------------------------------------------------------------------------
// Feature 16: Canvas 34 Zod Operations & MCP Server
// -------------------------------------------------------------------------
test("F16-T2-01: CanvasMcpServer rejects null payload", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp(null);
  assert.equal(res.success, false);
});

test("F16-T2-02: CanvasMcpServer rejects string payload instead of object", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp("add_card");
  assert.equal(res.success, false);
});

test("F16-T2-03: CanvasMcpServer rejects non-object payload field", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({
    op: "add_card",
    payload: "invalid-payload-string",
  });
  assert.equal(res.success, false);
});

test("F16-T2-04: CanvasMcpServer accepts all 34 recognized canvas operation names", () => {
  const server = new CanvasMcpServer();
  const ops = [
    "add_card",
    "delete_card",
    "update_card",
    "move_card",
    "resize_card",
    "connect_cards",
    "disconnect_cards",
    "group_cards",
    "ungroup_cards",
    "set_viewport",
    "reset_viewport",
    "fit_view",
    "select_nodes",
    "clear_selection",
    "align_nodes_horizontal",
    "align_nodes_vertical",
    "distribute_nodes",
    "duplicate_node",
    "lock_node",
    "unlock_node",
    "set_card_color",
    "add_asset_attachment",
    "remove_asset_attachment",
    "create_frame",
    "export_canvas_image",
    "export_canvas_json",
    "import_canvas_json",
    "undo",
    "redo",
    "set_grid_snap",
    "toggle_mini_map",
    "focus_node",
    "batch_transform",
    "reorder_z_index",
  ];
  for (const op of ops) {
    const res = server.executeOp({ op, payload: {} });
    assert.equal(res.success, true, `Operation ${op} must be accepted`);
  }
});

test("F16-T2-05: CanvasMcpServer rejects case-mismatched operation name", () => {
  const server = new CanvasMcpServer();
  const res = server.executeOp({ op: "ADD_CARD", payload: {} });
  assert.equal(res.success, false);
});

// -------------------------------------------------------------------------
// Feature 17: Hierarchical Blueprint Canvas Mapping (Floorplan)
// -------------------------------------------------------------------------
test("F17-T2-01: root node with empty children array returns single node", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "empty-root",
    name: "Empty",
    kind: "ui",
    path: "/",
    children: [],
  });
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].id, "empty-root");
});

test("F17-T2-02: hierarchy node without children field defaults cleanly", () => {
  const adapter = new FloorplanCanvasAdapter();
  const nodes = adapter.flattenHierarchy({
    id: "leaf",
    name: "Leaf",
    kind: "data",
    path: "/leaf",
  });
  assert.equal(nodes.length, 1);
});

test("F17-T2-03: wide flat hierarchy with 100 siblings flattens in level 1", () => {
  const adapter = new FloorplanCanvasAdapter();
  const children = Array.from({ length: 100 }, (_, i) => ({
    id: `sib-${i}`,
    name: `Sibling ${i}`,
    kind: "worker" as const,
    path: `/sib/${i}`,
  }));
  const nodes = adapter.flattenHierarchy({
    id: "parent",
    name: "Parent",
    kind: "service",
    path: "/parent",
    children,
  });
  assert.equal(nodes.length, 101);
  assert.equal(nodes[0].level, 0);
  assert.equal(nodes[50].level, 1);
  assert.equal(nodes[100].level, 1);
});

test("F17-T2-04: deep 5-level hierarchy preserves progressive depth indices", () => {
  const adapter = new FloorplanCanvasAdapter();
  const root = {
    id: "d0",
    name: "D0",
    kind: "ui" as const,
    path: "/0",
    children: [
      {
        id: "d1",
        name: "D1",
        kind: "service" as const,
        path: "/1",
        children: [
          {
            id: "d2",
            name: "D2",
            kind: "feature" as const,
            path: "/2",
            children: [
              {
                id: "d3",
                name: "D3",
                kind: "worker" as const,
                path: "/3",
                children: [
                  { id: "d4", name: "D4", kind: "data" as const, path: "/4" },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  const nodes = adapter.flattenHierarchy(root);
  assert.equal(nodes.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.equal(nodes[i].level, i);
  }
});

test("F17-T2-05: hierarchy node kinds are strictly typed union members", () => {
  const adapter = new FloorplanCanvasAdapter();
  const kinds = ["ui", "service", "worker", "feature", "data"] as const;
  for (const kind of kinds) {
    const res = adapter.flattenHierarchy({
      id: kind,
      name: kind,
      kind,
      path: `/${kind}`,
    });
    assert.equal(res[0].kind, kind);
  }
});
