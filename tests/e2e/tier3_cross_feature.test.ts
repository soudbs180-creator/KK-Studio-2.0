import assert from "node:assert/strict";
import test from "node:test";
import {
  GatewayCooldownScheduler,
  DualStickinessManager,
  RouterWorkerEngine,
  MandateLifecycleManager,
  SecurityHookEngine,
  OntologyGraph,
  validateAnswerability,
  AutonomousCanvasController,
  CanvasMcpServer,
  FloorplanCanvasAdapter,
  detectVideoShots,
  auditStoryboardContinuity,
  parsePromptMentions,
  compileOpticsPrompt,
  parseAspectRatio,
  calculateDimensionsForRatio,
  evaluateElementAesthetics,
  FIGMA_SURFACE_TOKENS,
  classifyViewport,
  ExtensionRuntimeBridge,
  validateButtonProps,
  resolveUiIcon,
  sanitizeAdversarialPrompt,
  formatStatuslineIPC,
  validateTestSuiteReport,
} from "./harness.ts";

/* =========================================================================
 * Tier 3: Pairwise Cross-Feature Interactions (Features 1 - 23)
 * ========================================================================= */

// -------------------------------------------------------------------------
// 1. Gateway Cooldown (F7) + Dual Stickiness (F8)
// -------------------------------------------------------------------------
test("SCENARIO-T3-01: rate limit 429 on cache-sticky account triggers temporary fallback stickiness", () => {
  const scheduler = new GatewayCooldownScheduler();
  const stickiness = new DualStickinessManager();

  scheduler.registerAccount("primary-acc");
  scheduler.registerAccount("fallback-acc");

  // Establish cache affinity with primary account
  stickiness.setCacheAffinity("user-session-1", "primary-acc", 300_000);
  assert.equal(
    stickiness.resolveAccount("user-session-1").accountId,
    "primary-acc",
  );

  // Primary account hits rate limit (429) -> put in cooldown
  scheduler.reportRateLimit("primary-acc", 30);
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "fallback-acc");

  // Switch temporary session stickiness to fallback account
  stickiness.setFallbackAffinity(
    "user-session-1",
    plan.selectedAccountId!,
    30_000,
  );
  const resolved = stickiness.resolveAccount("user-session-1");
  assert.equal(resolved.accountId, "fallback-acc");
  assert.equal(resolved.stickinessType, "fallback");
});

// -------------------------------------------------------------------------
// 2. Router-Worker Hierarchy (F10) + Scoped Mandates & Tickets (F11)
// -------------------------------------------------------------------------
test("SCENARIO-T3-02: router gate-approves complex task, issues mandate, and dispatches ticket to worker", () => {
  const router = new RouterWorkerEngine();
  const mandateMgr = new MandateLifecycleManager();

  const task = {
    id: "task-storyboard-gen",
    prompt:
      "Generate an extensive multi-shot sci-fi storyboard scene with detailed camera directives",
    complexityScore: 120,
  };

  const routePlan = router.classifyAndRoute(task);
  assert.equal(routePlan.route, "worker_delegate");
  assert.equal(routePlan.requiresGateApproval, true);

  // Issue mandate for delegated worker
  const mandate = mandateMgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["storyboard_draft", "continuity_check"],
    maxStepCount: 8,
  });

  // Create ticket for artist worker
  const ticket = mandateMgr.createTicket(mandate.id, routePlan.workerType);
  assert.equal(ticket.workerType ?? ticket.workerId, "artist");
  assert.equal(ticket.status, "pending");

  // Execute first permitted step
  const stepRes = mandateMgr.executeStep(ticket.ticketId, "storyboard_draft");
  assert.equal(stepRes.allowed, true);
  assert.equal(ticket.status, "in_progress");
});

// -------------------------------------------------------------------------
// 3. Scoped Mandates (F11) + PreInvocation Security Hooks (F12)
// -------------------------------------------------------------------------
test("SCENARIO-T3-03: PreInvocation hook blocks dangerous payload even if tool is authorized in mandate", () => {
  const mandateMgr = new MandateLifecycleManager();
  const security = new SecurityHookEngine();

  // Register security hook that forbids sensitive paths
  security.addHook((tool, args) => {
    const path = args.filePath as string | undefined;
    if (path && (path.includes(".ssh") || path.includes("/etc/passwd"))) {
      return {
        allow: false,
        reason: "Access to sensitive system path blocked",
      };
    }
    return { allow: true };
  });

  // Issue mandate granting file_read tool
  const mandate = mandateMgr.issueMandate({
    authorizedBy: "User",
    allowedTools: ["file_read"],
    maxStepCount: 5,
  });
  const ticket = mandateMgr.createTicket(mandate.id, "worker-io");
  assert.equal(ticket.status, "pending");

  // 1. Tool is authorized in mandate
  assert.equal(mandate.allowedTools.includes("file_read"), true);

  // 2. But arguments violate security hook -> blocked
  const secCheck = security.evaluate("file_read", {
    filePath: "/home/user/.ssh/id_rsa",
  });
  assert.equal(secCheck.allow, false);
  assert.equal(secCheck.reason, "Access to sensitive system path blocked");
});

// -------------------------------------------------------------------------
// 4. Semantic Ontology Graph (F13) + Pre-Flight Answerability (F14)
// -------------------------------------------------------------------------
test("SCENARIO-T3-04: ontology knowledge graph informs pre-flight feasibility pre-check", () => {
  const ontology = new OntologyGraph();
  ontology.addEntity({
    id: "script_act1",
    name: "Act 1",
    type: "script",
    properties: {},
  });
  ontology.addEntity({
    id: "char_alice",
    name: "Alice",
    type: "character",
    properties: {},
  });
  ontology.connect("script_act1", "char_alice");

  // Pre-flight check: required entities are present
  const check1 = validateAnswerability(
    "Generate Act 1 scene featuring Alice",
    ["script_act1", "char_alice"],
    ontology,
  );
  assert.equal(check1.answerable, true);

  // Pre-flight check: required entity Bob is missing -> unanswerable
  const check2 = validateAnswerability(
    "Generate Act 1 scene featuring Bob",
    ["script_act1", "char_bob"],
    ontology,
  );
  assert.equal(check2.answerable, false);
  assert.deepEqual(check2.missingEntities, ["char_bob"]);
});

// -------------------------------------------------------------------------
// 5. Autonomous Canvas Ops (F15) + Canvas 34 Zod Operations (F16)
// -------------------------------------------------------------------------
test("SCENARIO-T3-05: Canvas MCP Server executes 34 Zod operations while controller tracks viewport & selection", () => {
  const mcp = new CanvasMcpServer();
  const controller = new AutonomousCanvasController();

  // Execute set_viewport op via MCP
  const vpOp = { op: "set_viewport", payload: { x: 100, y: 150, zoom: 1.25 } };
  const resVp = mcp.executeOp(vpOp);
  assert.equal(resVp.success, true);
  controller.setViewport(100, 150, 1.25);
  assert.equal(controller.viewport.zoom, 1.25);

  // Execute select_nodes op via MCP
  const selOp = {
    op: "select_nodes",
    payload: { nodeIds: ["card-1", "card-2"] },
  };
  const resSel = mcp.executeOp(selOp);
  assert.equal(resSel.success, true);
  controller.selectNodes(["card-1", "card-2"]);
  assert.deepEqual(controller.selectedNodes, ["card-1", "card-2"]);
});

// -------------------------------------------------------------------------
// 6. Hierarchical Blueprint Canvas (F17) + Canvas 34 Zod Operations (F16)
// -------------------------------------------------------------------------
test("SCENARIO-T3-06: blueprint architecture tree generates compliant 34 Zod card operations", () => {
  const adapter = new FloorplanCanvasAdapter();
  const mcp = new CanvasMcpServer();

  const blueprint = {
    id: "system-root",
    name: "KK Studio",
    kind: "ui" as const,
    path: "/",
    children: [
      {
        id: "mod-gateway",
        name: "Gateway",
        kind: "service" as const,
        path: "/gateway",
      },
      {
        id: "mod-agent",
        name: "Agent",
        kind: "worker" as const,
        path: "/agent",
      },
    ],
  };

  const flatNodes = adapter.flattenHierarchy(blueprint);
  assert.equal(flatNodes.length, 3);

  // Convert each node to an add_card operation
  for (const node of flatNodes) {
    const op = {
      op: "add_card",
      payload: { cardId: node.id, title: node.name, level: node.level },
    };
    const res = mcp.executeOp(op);
    assert.equal(res.success, true);
  }
});

// -------------------------------------------------------------------------
// 7. Video Shot Breakdown (F18) + Autonomous Canvas Ops (F15)
// -------------------------------------------------------------------------
test("SCENARIO-T3-07: detected cut boundaries update canvas selection and focus", () => {
  const frames = [
    { rgbDiff: 0.05, histDiff: 0.05 },
    { rgbDiff: 0.75, histDiff: 0.6 }, // CUT
    { rgbDiff: 0.02, histDiff: 0.01 },
    { rgbDiff: 0.8, histDiff: 0.7 }, // CUT
  ];

  const boundaries = detectVideoShots(frames);
  const cutFrames = boundaries
    .filter((b) => b.isCut)
    .map((b) => `frame-node-${b.frameIndex}`);
  assert.deepEqual(cutFrames, ["frame-node-1", "frame-node-3"]);

  const controller = new AutonomousCanvasController();
  controller.selectNodes(cutFrames);
  assert.deepEqual(controller.selectedNodes, cutFrames);
});

// -------------------------------------------------------------------------
// 8. Storyboard Continuity Pipeline (F19) + In-Prompt Reference Mentions (F20)
// -------------------------------------------------------------------------
test("SCENARIO-T3-08: storyboard pipeline references character assets and verifies continuity", () => {
  const rawPrompt =
    "Scene: Alice wears silver locket standing by fountain @参考 1";
  const { compiledPrompt, mentions } = parsePromptMentions(rawPrompt, {
    "1": "asset-alice-costume",
  });

  assert.equal(mentions[0].assetId, "asset-alice-costume");

  // Audit continuity of prompt content
  const audit = auditStoryboardContinuity(compiledPrompt, [
    { characterName: "Alice", requiredAttributes: ["silver locket"] },
  ]);
  assert.equal(audit.compliant, true);
});

// -------------------------------------------------------------------------
// 9. 3D Director Optics (F21) + In-Prompt Reference Mentions (F20)
// -------------------------------------------------------------------------
test("SCENARIO-T3-09: compiles camera optics and in-prompt reference mentions into unified prompt", () => {
  const opticsPrompt = compileOpticsPrompt({
    lensMm: 50,
    aperture: "f/1.8",
    cameraBody: "ARRI Alexa",
  });

  const rawUserPrompt = `Close-up shot of hero {{ref 1}}, ${opticsPrompt}`;
  const { compiledPrompt } = parsePromptMentions(rawUserPrompt, {
    "1": "hero-3d-model",
  });

  assert.ok(compiledPrompt.includes("[RefAsset: hero-3d-model]"));
  assert.ok(compiledPrompt.includes("50mm focal length lens"));
  assert.ok(compiledPrompt.includes("f/1.8 aperture"));
  assert.ok(compiledPrompt.includes("shot on ARRI Alexa"));
});

// -------------------------------------------------------------------------
// 10. 15 Aspect Ratios (F4) + Pure Video Shot Breakdown (F18)
// -------------------------------------------------------------------------
test("SCENARIO-T3-10: video shot keyframe dimensions adapt to selected aspect ratio", () => {
  const frames = [{ rgbDiff: 0.8, histDiff: 0.8 }];
  const cuts = detectVideoShots(frames);
  assert.equal(cuts[0].isCut, true);

  // Apply 16:9 cinema ratio
  const ratio = parseAspectRatio("16:9");
  assert.equal(ratio.orientation, "landscape");

  const cardDims = calculateDimensionsForRatio("16:9", 800);
  assert.equal(cardDims.width, 800);
  assert.equal(cardDims.height, 450);
});

// -------------------------------------------------------------------------
// 11. Figma Surface Tokens (F1) + Aesthetic Governance (F6)
// -------------------------------------------------------------------------
test("SCENARIO-T3-11: UI surface styling with Figma tokens complies with 4px grid and redline", () => {
  const style = {
    paddingPx: 16, // 4px grid compliant
    marginPx: 24, // 4px grid compliant
    borderRadiusPx: 8, // <= 999px compliant
    contrastRatio: 5.5, // >= 4.5 WCAG AA compliant
  };
  const redline = evaluateElementAesthetics(style);
  assert.equal(redline.pass, true);
  assert.equal(FIGMA_SURFACE_TOKENS.bgSurface, "#f2f2f2");
});

// -------------------------------------------------------------------------
// 12. Mobile Chat Viewport (F5) + Extension Runtime Bridge (F9)
// -------------------------------------------------------------------------
test("SCENARIO-T3-12: mobile viewport classification disables canvas extension slot", () => {
  const vp = classifyViewport(375); // mobile
  assert.equal(vp.allowCanvas, false);

  const bridge = new ExtensionRuntimeBridge();
  bridge.registerExtension({
    id: "canvas-addon",
    name: "Canvas Addon",
    version: "1.0",
    entryPoint: "ca.js",
  });
  bridge.registerSlot("chat-toolbar", "canvas-addon", () => "Chat Addon");

  // In mobile, chat toolbar slot is permitted
  const chatItems = bridge.getSlotItems("chat-toolbar");
  assert.equal(chatItems.length, 1);
});

// -------------------------------------------------------------------------
// 13. Foundational UI Primitives (F2) + 124 Lucide Icons (F3)
// -------------------------------------------------------------------------
test("SCENARIO-T3-13: 5-tier Button primitive embeds official Lucide icon while keeping 44px hit box", () => {
  const btn = validateButtonProps({ heightTier: "24px" });
  assert.equal(btn.valid, true);
  assert.equal(btn.heightPx, 24);
  assert.equal(btn.hitBoxPx, 44);

  const icon = resolveUiIcon("play", 16);
  assert.equal(icon.resolved, true);
  assert.equal(icon.size, 16);
});

// -------------------------------------------------------------------------
// 14. Adversarial Hardening (F23) + Router Worker Engine (F10)
// -------------------------------------------------------------------------
test("SCENARIO-T3-14: malicious input is sanitized before entering Router multi-agent pipeline", () => {
  const router = new RouterWorkerEngine();
  const dangerousInput =
    "Generate script with <script>stealTokens()</script> about an astronaut";

  // Sanitize adversarial threat
  const sanitized = sanitizeAdversarialPrompt(dangerousInput);
  assert.equal(sanitized.safe, false);
  assert.ok(!sanitized.cleanPrompt.includes("<script>"));

  // Route sanitized prompt
  const route = router.classifyAndRoute({
    id: "t-safe",
    prompt: sanitized.cleanPrompt,
  });
  assert.equal(route.route, "router_direct");
  assert.equal(route.workerType, "writer");
});

// -------------------------------------------------------------------------
// 15. Full E2E Test Suite Validation (F22) + Statusline IPC (F12)
// -------------------------------------------------------------------------
test("SCENARIO-T3-15: statusline IPC broadcasts progress during full test suite verification", () => {
  const statusline = formatStatuslineIPC({
    agent: "e2e_runner",
    step: 252,
    totalSteps: 252,
    currentTool: "validate_all_tiers",
    durationMs: 450,
  });
  const parsed = JSON.parse(statusline);
  assert.equal(parsed.progress, 100);

  const suiteCheck = validateTestSuiteReport({
    totalTests: parsed.step,
    passCount: 252,
    failCount: 0,
    skipCount: 0,
  });
  assert.equal(suiteCheck.ready, true);
});

// -------------------------------------------------------------------------
// 16. Gateway Cooldown (F7) + Canvas 34 Zod Operations (F16)
// -------------------------------------------------------------------------
test("SCENARIO-T3-16: Canvas MCP Server requests model execution via Gateway with active cooldown fallback", () => {
  const scheduler = new GatewayCooldownScheduler();
  const mcp = new CanvasMcpServer();

  scheduler.registerAccount("primary-gen-acc");
  scheduler.registerAccount("fallback-gen-acc");

  // Canvas dispatches card generation op
  const op = {
    op: "add_card",
    payload: { cardId: "scene-3", title: "Render" },
  };
  assert.equal(mcp.executeOp(op).success, true);

  // Primary rate limited during render
  scheduler.reportRateLimit("primary-gen-acc", 20);
  const plan = scheduler.acquireCandidate();
  assert.equal(plan.selectedAccountId, "fallback-gen-acc");
});
