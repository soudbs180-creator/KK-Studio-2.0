import { createElement as h } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { Button } from "../../src/components/ui/Button.tsx";
import { resolveImageSize } from "../../src/domain/imageParameters.ts";
import {
  validateViewportLayout,
  evaluateStyleDeclaration,
} from "../../src/domain/uiAestheticGovernance.ts";
import { renderSidebarSurface } from "../support/responsiveFixture.ts";
import { createCanvasOperationFixture } from "../support/canvasOperationFixture.ts";
import assert from "node:assert/strict";
import test from "node:test";
import {
  RouterWorkerEngine,
  MandateLifecycleManager,
  SecurityHookEngine,
  OntologyGraph,
  validateAnswerability,
  AutonomousCanvasController,
  CanvasMcpServer,
  detectVideoShots,
  auditStoryboardContinuity,
  parsePromptMentions,
  compileOpticsPrompt,
  GatewayCooldownScheduler,
  DualStickinessManager,
  formatStatuslineIPC,
} from "./harness.ts";

/* =========================================================================
 * Tier 4: Real-World Application Scenarios (S01 - S06)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Scenario 1: Full Novel Script to Production Pipeline
// Novel script -> Router delegation -> Storyboard pipeline -> Shot breakdown ->
// 34 Zod Canvas node generation -> Camera optics compilation -> Canvas Viewport fit
// -------------------------------------------------------------------------
test("SCENARIO-T4-01 (Full Novel Script to Production Pipeline)", () => {
  // 1. User inputs novel chapter synopsis
  const novelScript =
    "Chapter 1: Alice in the Crimson Valley. Alice wears red scarf standing on edge of cliff.";
  const router = new RouterWorkerEngine();
  const route = router.classifyAndRoute({
    id: "task-novel-01",
    prompt: `Generate storyboard from novel: ${novelScript}`,
    complexityScore: 180,
  });
  assert.equal(route.route, "worker_delegate");
  assert.equal(route.workerType, "artist");
  assert.equal(route.requiresGateApproval, true);

  // 2. Issue scoped mandate for storyboard production
  const mandateMgr = new MandateLifecycleManager();
  const mandate = mandateMgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["add_card", "connect_cards", "set_viewport"],
    maxStepCount: 15,
  });
  const ticket = mandateMgr.createTicket(mandate.id, "artist-director");

  // 3. Continuity verification by reviewer agent
  const continuityCheck = auditStoryboardContinuity(novelScript, [
    { characterName: "Alice", requiredAttributes: ["red scarf"] },
  ]);
  assert.equal(continuityCheck.compliant, true);

  // 4. Video shot breakdown detects key cut points
  const rawFrames = [
    { rgbDiff: 0.05, histDiff: 0.02 },
    { rgbDiff: 0.65, histDiff: 0.45 }, // CUT (Frame 1)
    { rgbDiff: 0.03, histDiff: 0.02 },
    { rgbDiff: 0.7, histDiff: 0.55 }, // CUT (Frame 3)
  ];
  const detectedCuts = detectVideoShots(rawFrames).filter((f) => f.isCut);
  assert.equal(detectedCuts.length, 2);

  // 5. Canvas MCP Server generates 34 Zod card operations
  const canvasMcp = new CanvasMcpServer(createCanvasOperationFixture());
  const canvasCtrl = new AutonomousCanvasController(canvasMcp.bridge!);
  const generatedCardIds: string[] = [];

  for (const cut of detectedCuts) {
    const cardId = `card-shot-${cut.frameIndex}`;
    generatedCardIds.push(cardId);

    // Mandate executes step
    const step = mandateMgr.executeStep(ticket.ticketId, "add_card");
    assert.equal(step.allowed, true);

    // MCP executes operation
    const opRes = canvasMcp.executeOp({
      op: "add_card",
      payload: {
        card: {
          id: cardId,
          kind: "text",
          title: `Shot at ${cut.timestampSeconds}s`,
        },
        position: { x: cut.frameIndex * 700, y: 100 },
      },
    });
    assert.equal(opRes.success, true);
  }

  // Connect shots in sequence
  const connectOp = canvasMcp.executeOp({
    op: "connect_cards",
    payload: {
      source: generatedCardIds[0],
      target: generatedCardIds[1],
      id: "shot-sequence",
      kind: "result",
    },
  });
  assert.equal(connectOp.success, true);

  // 6. Camera optics compiled for director console
  const opticsPrompt = compileOpticsPrompt({
    lensMm: 35,
    aperture: "f/2.0",
    cameraBody: "ARRI Alexa Mini",
  });
  assert.ok(opticsPrompt.includes("35mm focal length lens"));

  // 7. Adjust canvas viewport to focus on generated storyboard sequence
  canvasCtrl.setViewport(500, 250, 1.0);
  canvasCtrl.selectNodes(generatedCardIds);
  assert.deepEqual(canvasCtrl.selectedNodes, generatedCardIds);
  assert.equal(ticket.stepsUsed, 2);
  assert.equal(ticket.status, "in_progress");
});

// -------------------------------------------------------------------------
// Scenario 2: Resilient Provider Gateway Failover Under High Load
// High-concurrency requests -> Cache affinity -> 429 Cooldown ->
// Automatic failover -> Fallback TTL stickiness -> Cooldown expiration
// -------------------------------------------------------------------------
test("SCENARIO-T4-02 (Resilient Multi-Channel Gateway Failover Under Load)", async () => {
  const scheduler = new GatewayCooldownScheduler();
  const stickiness = new DualStickinessManager();

  // Register primary and backup provider accounts
  scheduler.registerAccount("siliconflow-main");
  scheduler.registerAccount("deepseek-direct-backup");

  // User session initializes with cache affinity for prompt caching
  const sessionId = "user-workspace-active";
  stickiness.setCacheAffinity(sessionId, "siliconflow-main", 300_000);
  assert.equal(
    stickiness.resolveAccount(sessionId).accountId,
    "siliconflow-main",
  );

  // Initial candidate acquisition selects primary
  const initialPlan = scheduler.acquireCandidate();
  assert.equal(initialPlan.selectedAccountId, "siliconflow-main");

  // Provider returns HTTP 429 Too Many Requests -> report 50ms cooldown
  scheduler.reportRateLimit("siliconflow-main", 0.05);

  // Scheduler hot-drifts to backup account without dropping request
  const failoverPlan = scheduler.acquireCandidate();
  assert.equal(failoverPlan.selectedAccountId, "deepseek-direct-backup");
  assert.equal(failoverPlan.waitingQueue.length, 1);
  assert.equal(failoverPlan.waitingQueue[0].accountId, "siliconflow-main");

  // Set temporary fallback stickiness TTL for session
  stickiness.setFallbackAffinity(
    sessionId,
    failoverPlan.selectedAccountId!,
    50,
  );
  const activeDuringFailover = stickiness.resolveAccount(sessionId);
  assert.equal(activeDuringFailover.accountId, "deepseek-direct-backup");
  assert.equal(activeDuringFailover.stickinessType, "fallback");

  // Await cooldown expiration
  await new Promise((r) => setTimeout(r, 65));

  // Primary account cools down and recovers; fallback TTL expires
  const recoveredPlan = scheduler.acquireCandidate();
  assert.equal(recoveredPlan.selectedAccountId, "siliconflow-main");
  assert.equal(recoveredPlan.waitingQueue.length, 0);

  const restoredSession = stickiness.resolveAccount(sessionId);
  assert.equal(restoredSession.accountId, "siliconflow-main");
  assert.equal(restoredSession.stickinessType, "cache");
});

// -------------------------------------------------------------------------
// Scenario 3: Multi-Agent Mandate Execution with PreInvocation Security & Memory
// Worldbuilding query -> Ontology pre-flight validation -> Mandate issuance ->
// PreInvocation hook defense -> Live statusline IPC emission -> Ticket completion
// -------------------------------------------------------------------------
test("SCENARIO-T4-03 (Multi-Agent Mandate Execution with Security & Ontology)", () => {
  // 1. Establish domain ontology knowledge graph
  const ontology = new OntologyGraph();
  ontology.addEntity({
    id: "lore_kingdom",
    name: "Valoria",
    type: "realm",
    properties: {},
  });
  ontology.addEntity({
    id: "lore_artifact",
    name: "Crown of Light",
    type: "relic",
    properties: {},
  });
  ontology.connect("lore_kingdom", "lore_artifact");

  // 2. Pre-flight answerability pre-check
  const preCheck = validateAnswerability(
    "Where is the Crown of Light kept in Valoria?",
    ["lore_kingdom", "lore_artifact"],
    ontology,
  );
  assert.equal(preCheck.answerable, true);

  // 3. Issue scoped mandate to worker agent
  const mandateMgr = new MandateLifecycleManager();
  const mandate = mandateMgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["knowledge_query", "format_response"],
    maxStepCount: 5,
  });
  const ticket = mandateMgr.createTicket(mandate.id, "lore-specialist");

  // 4. PreInvocation security hook checks each tool execution
  const security = new SecurityHookEngine();
  security.addHook((tool, args) => {
    // Intercept credential or secret leaks in queries
    const text = JSON.stringify(args);
    if (text.includes("AWS_SECRET") || text.includes("PRIVATE_KEY")) {
      return { allow: false, reason: "Credential leakage detected" };
    }
    return { allow: true };
  });

  // Step 1: Query knowledge base (safe)
  const secStep1 = security.evaluate("knowledge_query", {
    query: "Crown of Light",
  });
  assert.equal(secStep1.allow, true);
  assert.equal(
    mandateMgr.executeStep(ticket.ticketId, "knowledge_query").allowed,
    true,
  );

  // Step 2: Attempted injection with secret leak (blocked by hook)
  const secStep2 = security.evaluate("knowledge_query", {
    secret: "AWS_SECRET_123",
  });
  assert.equal(secStep2.allow, false);
  assert.equal(secStep2.reason, "Credential leakage detected");

  // Step 3: Format valid response and emit dynamic statusline IPC
  const secStep3 = security.evaluate("format_response", {
    result: "The Crown rests in Valoria Cathedral",
  });
  assert.equal(secStep3.allow, true);
  assert.equal(
    mandateMgr.executeStep(ticket.ticketId, "format_response").allowed,
    true,
  );

  const statusline = formatStatuslineIPC({
    agent: "lore-specialist",
    step: ticket.stepsUsed,
    totalSteps: mandate.maxStepCount,
    currentTool: "format_response",
    durationMs: 820,
  });
  const parsedStatus = JSON.parse(statusline);
  assert.equal(parsedStatus.type, "statusline");
  assert.equal(parsedStatus.progress, 40); // 2 of 5 steps = 40%
  assert.equal(parsedStatus.agent, "lore-specialist");
});

// -------------------------------------------------------------------------
// Scenario 4: Pure-Client Video Shot Breakdown with Aspect Ratio Adaptation
// Frame detection -> RGB+Hist cuts -> Keyframe cards with 16:9 dimensions ->
// Viewport focus and coordinate transformation
// -------------------------------------------------------------------------
test("SCENARIO-T4-04 (Pure-Client Video Breakdown & Canvas Card Generation)", () => {
  // 1. Ingest client-side video frame telemetry
  const videoFrames = [
    { rgbDiff: 0.02, histDiff: 0.01 }, // frame 0
    { rgbDiff: 0.04, histDiff: 0.03 }, // frame 1
    { rgbDiff: 0.6, histDiff: 0.5 }, // frame 2: CUT (score = 0.575)
    { rgbDiff: 0.01, histDiff: 0.02 }, // frame 3
    { rgbDiff: 0.7, histDiff: 0.6 }, // frame 4: CUT (score = 0.675)
  ];

  // 2. Client-side pure detection (no server required)
  const boundaries = detectVideoShots(videoFrames, 0.45, 24);
  const cutBoundaries = boundaries.filter((b) => b.isCut);
  assert.equal(cutBoundaries.length, 2);
  assert.equal(cutBoundaries[0].frameIndex, 2);
  assert.equal(cutBoundaries[1].frameIndex, 4);

  // 3. Adapt each cut frame to 16:9 aspect ratio dimensions
  assert.equal(resolveImageSize("16:9", "1K"), "1024x576");

  const liveCanvas = createCanvasOperationFixture();
  const mcp = new CanvasMcpServer(liveCanvas);
  const controller = new AutonomousCanvasController(liveCanvas);
  const createdCardIds: string[] = [];

  cutBoundaries.forEach((cut, i) => {
    const cardId = `keyframe-card-${cut.frameIndex}`;
    createdCardIds.push(cardId);
    const size = resolveImageSize("16:9", "1K")!;

    const res = mcp.executeOp({
      op: "add_card",
      payload: {
        card: {
          id: cardId,
          kind: "image",
          title: `Keyframe #${cut.frameIndex} at ${cut.timestampSeconds}s`,
          description: `${size}`,
        },
        position: { x: i * 700, y: 100 },
      },
    });
    assert.equal(res.success, true);
  });

  // 4. Autonomous canvas agent updates viewport to embrace keyframe row
  controller.setViewport(0, 100, 0.75);
  controller.selectNodes(createdCardIds);
  assert.equal(controller.viewport.zoom, 0.75);
  assert.deepEqual(controller.selectedNodes, createdCardIds);
});

// -------------------------------------------------------------------------
// Scenario 5: 3D Director Console Optics & In-Prompt Mention Workflow
// Lens/Aperture setup -> In-prompt @参考 parsing -> Atomic Button submission ->
// Live status tracking
// -------------------------------------------------------------------------
test("SCENARIO-T5-05 (3D Director Optics & In-Prompt Reference Mentions)", () => {
  // 1. Director configures 3D camera optics parameters
  const opticsPrompt = compileOpticsPrompt({
    lensMm: 85,
    aperture: "f/1.4",
    focalDistance: "1.5m",
    cameraBody: "ARRI Alexa 65",
  });
  assert.ok(opticsPrompt.includes("85mm focal length lens"));
  assert.ok(opticsPrompt.includes("f/1.4 aperture"));
  assert.ok(opticsPrompt.includes("shot on ARRI Alexa 65"));

  // 2. User writes prompt embedding reference mentions
  const userPrompt = `Cinematic character portrait @参考 1 with background {{ref 2}}, ${opticsPrompt}`;
  const assetMap = { "1": "asset-character-alice", "2": "asset-neo-tokyo-bg" };
  const { compiledPrompt, mentions } = parsePromptMentions(
    userPrompt,
    assetMap,
  );

  assert.equal(mentions.length, 2);
  assert.equal(mentions[0].assetId, "asset-character-alice");
  assert.equal(mentions[1].assetId, "asset-neo-tokyo-bg");
  assert.ok(compiledPrompt.includes("[RefAsset: asset-character-alice]"));
  assert.ok(compiledPrompt.includes("[RefAsset: asset-neo-tokyo-bg]"));

  // 3. UI validation: Standard 40px Button primitive renders with Lucide icon
  const markup = render(
    h(Button, { heightTier: "40px", prefixIcon: "camera" }, "Generate"),
  );
  assert.match(markup, /kk-button--40/u);
  assert.match(markup, /<svg/u);

  // 4. Generation pipeline progress statusline emission
  const statusMsg = formatStatuslineIPC({
    agent: "director-optics-pipeline",
    step: 4,
    totalSteps: 4,
    currentTool: "generate_optics_render",
    durationMs: 1400,
  });
  const parsed = JSON.parse(statusMsg);
  assert.equal(parsed.progress, 100);
});

// -------------------------------------------------------------------------
// Scenario 6: Mobile Single-Column Chat Viewport and Responsive Governance
// Screen width <=767px -> Viewport classification -> Canvas screen disabled ->
// Figma surface tokens & 4px grid rhythm verified
// -------------------------------------------------------------------------
test("SCENARIO-T4-06: actual phone and desktop layout hooks share typography and spacing rules", () => {
  assert.match(renderSidebarSurface(390), /data-surface="phone"/u);
  assert.match(renderSidebarSurface(1440), /data-surface="desktop"/u);
  assert.ok(validateViewportLayout(390, ["CanvasScreen"]).length);
  assert.deepEqual(validateViewportLayout(1440, ["CanvasScreen"]), []);
  assert.equal(
    evaluateStyleDeclaration({
      padding: "12px",
      margin: "8px",
      fontWeight: 400,
    }).valid,
    true,
  );
});
