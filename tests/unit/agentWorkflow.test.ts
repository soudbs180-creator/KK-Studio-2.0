import test from "node:test";
import assert from "node:assert/strict";
import {
  createMandate,
  validateMandateExecution,
  requiredApprovalGates,
  transitionWorkflowPhase,
  formatStatuslineIPC,
  type StructuredPlan,
  type PlanImpactAssessment,
} from "../../src/domain/agentWorkflow.ts";
import {
  MandateLifecycleManager,
  ThreePhaseFlowCoordinator,
} from "../../src/features/agent/threePhaseFlow.ts";

test("agentWorkflow: createMandate enforces immutability and valid defaults", () => {
  const tools = ["search_index", "get_node_info"];
  const mandate = createMandate({
    authorizedBy: "Router",
    allowedTools: tools,
    maxStepCount: 10,
    scope: "project-test",
  });

  assert.ok(mandate.id.startsWith("mandate-"));
  assert.equal(mandate.authorizedBy, "Router");
  assert.equal(mandate.maxStepCount, 10);
  assert.equal(mandate.scope, "project-test");
  assert.ok(mandate.signature?.includes("sig-"));
  assert.ok(Object.isFrozen(mandate));
  assert.ok(Object.isFrozen(mandate.allowedTools));

  // Verify mutating array throws in strict mode
  assert.throws(() => {
    (mandate.allowedTools as string[]).push("unauthorized_tool");
  }, TypeError);
});

test("agentWorkflow: validateMandateExecution enforces tools, quotas, and expiry", () => {
  const mandate = createMandate({
    authorizedBy: "User",
    allowedTools: ["canvas_add_node", "compile_optics"],
    maxStepCount: 3,
    ttlMs: 5000,
  });

  // Valid execution
  const res1 = validateMandateExecution(mandate, "canvas_add_node", 0);
  assert.equal(res1.allowed, true);

  // Unauthorized tool
  const res2 = validateMandateExecution(mandate, "delete_system_file", 0);
  assert.equal(res2.allowed, false);
  assert.match(res2.reason ?? "", /not permitted by mandate/);

  // Step quota exhausted
  const res3 = validateMandateExecution(mandate, "canvas_add_node", 3);
  assert.equal(res3.allowed, false);
  assert.match(res3.reason ?? "", /budget exhausted/);

  // Expired token
  const futureMs = Date.now() + 10000;
  const res4 = validateMandateExecution(
    mandate,
    "canvas_add_node",
    1,
    futureMs,
  );
  assert.equal(res4.allowed, false);
  assert.match(res4.reason ?? "", /token has expired/);
});

test("agentWorkflow: requiredApprovalGates checks boundaries and high cost", () => {
  // Safe local run
  const safeGates = requiredApprovalGates({
    privacyMode: "local_only",
    requestedOutputs: 4,
  });
  assert.deepEqual(safeGates, []);

  // Remote platform transfer + batch >= 16 + overwrite + external share
  const heavyGates = requiredApprovalGates({
    privacyMode: "platform_backed",
    requestedOutputs: 16,
    overwriteOriginal: true,
    externalShare: true,
  });
  assert.ok(heavyGates.includes("remote_transfer"));
  assert.ok(heavyGates.includes("high_cost_batch"));
  assert.ok(heavyGates.includes("overwrite_original"));
  assert.ok(heavyGates.includes("external_share"));
});

test("agentWorkflow: transitionWorkflowPhase handles 3-phase flow DAG transitions", () => {
  // Standard flow: idle -> planning -> confirm -> execution -> completed -> idle
  let phase = transitionWorkflowPhase("idle", { type: "START_PLANNING" });
  assert.equal(phase, "planning");

  phase = transitionWorkflowPhase(phase, {
    type: "PLAN_READY",
    requiresConfirmation: true,
  });
  assert.equal(phase, "confirm");

  phase = transitionWorkflowPhase(phase, { type: "USER_APPROVE" });
  assert.equal(phase, "execution");

  phase = transitionWorkflowPhase(phase, {
    type: "STEP_BLOCKED",
    reason: "Tool quota",
  });
  assert.equal(phase, "blocked");

  phase = transitionWorkflowPhase(phase, { type: "UNBLOCK_RESUME" });
  assert.equal(phase, "execution");

  phase = transitionWorkflowPhase(phase, { type: "EXECUTION_COMPLETE" });
  assert.equal(phase, "completed");

  phase = transitionWorkflowPhase(phase, { type: "RESET_IDLE" });
  assert.equal(phase, "idle");

  // Fast path: planning -> execution directly
  let fastPhase = transitionWorkflowPhase("idle", { type: "START_PLANNING" });
  fastPhase = transitionWorkflowPhase(fastPhase, {
    type: "PLAN_READY",
    requiresConfirmation: false,
  });
  assert.equal(fastPhase, "execution");

  // User modify: confirm -> planning
  const modifyPhase = transitionWorkflowPhase("confirm", {
    type: "USER_MODIFY",
  });
  assert.equal(modifyPhase, "planning");

  // User reject: confirm -> cancelled
  const rejectPhase = transitionWorkflowPhase("confirm", {
    type: "USER_REJECT",
  });
  assert.equal(rejectPhase, "cancelled");
});

test("agentWorkflow: MandateLifecycleManager tracks ticket lifecycle and enforces quota", () => {
  const mgr = new MandateLifecycleManager();
  const mandate = mgr.issueMandate({
    authorizedBy: "Router",
    allowedTools: ["tool_a", "tool_b"],
    maxStepCount: 2,
  });

  const ticket = mgr.createTicket(mandate.id, "worker-1");
  assert.equal(ticket.status, "pending");
  assert.equal(ticket.stepsUsed, 0);

  // Step 1
  const step1 = mgr.executeStep(ticket.ticketId, "tool_a");
  assert.equal(step1.allowed, true);
  assert.equal(step1.stepsRemaining, 1);
  assert.equal(ticket.status, "in_progress");

  // Step 2
  const step2 = mgr.executeStep(ticket.ticketId, "tool_b");
  assert.equal(step2.allowed, true);
  assert.equal(step2.stepsRemaining, 0);

  // Step 3: Quota exhausted -> blocked
  const step3 = mgr.executeStep(ticket.ticketId, "tool_a");
  assert.equal(step3.allowed, false);
  assert.equal(ticket.status, "blocked");

  // Unblock with additional steps
  mgr.unblockTicket(ticket.ticketId, 2);
  assert.equal(ticket.status, "in_progress");
  const step4 = mgr.executeStep(ticket.ticketId, "tool_a");
  assert.equal(step4.allowed, true);

  // Complete ticket
  mgr.completeTicket(ticket.ticketId, "All done");
  assert.equal(ticket.status, "completed");
  assert.equal(ticket.resultSummary, "All done");
});

test("agentWorkflow: ThreePhaseFlowCoordinator orchestrates checkpoints and modifications", () => {
  const coordinator = new ThreePhaseFlowCoordinator();
  assert.equal(coordinator.phase, "idle");

  // 1. Planning phase
  const planInfo = coordinator.startPlanning(
    "Generate 4 shots for Cyberpunk Scene",
  );
  assert.equal(coordinator.phase, "planning");

  const plan: StructuredPlan = {
    planId: planInfo.planId,
    title: "Cyberpunk Scene",
    userPrompt: "Generate 4 shots for Cyberpunk Scene",
    items: [
      {
        id: "item-1",
        kind: "image",
        goal: "Generate keyframe",
        estimatedDurationMs: 2000,
        toolToUse: "generate_image",
        dependencies: [],
      },
    ],
    requestedTools: ["generate_image", "canvas_add_node"],
    suggestedStepQuota: 5,
  };

  const impact: PlanImpactAssessment = {
    costTier: "medium",
    estimatedTokens: 3500,
    triggeredGates: ["high_cost_batch"],
    reversibility: "full_snapshot_undo",
    affectedNodeIds: ["node-1"],
    externalEndpointsContacted: [],
    securityRiskLevel: "low",
  };

  // 2. Compile plan -> confirm checkpoint
  const compiled = coordinator.compilePlan(plan, impact);
  assert.equal(compiled.requiresConfirmation, true);
  assert.equal(coordinator.phase, "confirm");
  assert.ok(coordinator.currentCheckpoint);

  // 3. User modifies plan
  const modResult = coordinator.modifyCheckpoint(
    compiled.checkpoint.checkpointId,
    "Use only 3 steps",
    ["generate_image"],
    3,
  );
  assert.equal(modResult.phase, "planning");
  assert.equal(modResult.reworkedPlan.suggestedStepQuota, 3);

  // Re-compile and approve
  const recompiled = coordinator.compilePlan(modResult.reworkedPlan, impact);
  const approval = coordinator.approveCheckpoint(
    recompiled.checkpoint.checkpointId,
  );
  assert.equal(approval.phase, "execution");
  assert.equal(approval.mandate.maxStepCount, 3);
  assert.deepEqual(approval.mandate.allowedTools, ["generate_image"]);

  // 4. Execution
  const stepRes = coordinator.executeStep("generate_image");
  assert.equal(stepRes.allowed, true);

  const doneRes = coordinator.completeExecution(
    "Generated all images successfully",
  );
  assert.equal(doneRes.phase, "completed");
  assert.equal(doneRes.ticket?.status, "completed");
});

test("agentWorkflow: formatStatuslineIPC serializes telemetry with proper bounds", () => {
  // Normal execution
  const json1 = formatStatuslineIPC({
    agent: "ArtistWorker",
    step: 2,
    totalSteps: 5,
    currentTool: "generate_image",
    durationMs: 1500,
  });
  const parsed1 = JSON.parse(json1);
  assert.equal(parsed1.type, "statusline");
  assert.equal(parsed1.agent, "ArtistWorker");
  assert.equal(parsed1.progress, 40);
  assert.equal(parsed1.currentTool, "generate_image");

  // Zero totalSteps guard
  const json2 = formatStatuslineIPC({
    agent: "PlannerWorker",
    step: 0,
    totalSteps: 0,
    durationMs: 100,
  });
  const parsed2 = JSON.parse(json2);
  assert.equal(parsed2.progress, 0);
  assert.equal(parsed2.currentTool, null);

  // Step exceeds totalSteps (clamped to 100)
  const json3 = formatStatuslineIPC({
    agent: "Reviewer",
    step: 10,
    totalSteps: 5,
    currentTool: "",
    durationMs: 500,
  });
  const parsed3 = JSON.parse(json3);
  assert.equal(parsed3.progress, 100);
  assert.equal(parsed3.currentTool, null);
});

test("agentWorkflow: FATAL_ERROR during confirm phase transitions safely to failed", () => {
  // Test direct transitionWorkflowPhase
  const phase = transitionWorkflowPhase("confirm", {
    type: "FATAL_ERROR",
    error: "Emergency shutdown",
  });
  assert.equal(phase, "failed");

  // Test ThreePhaseFlowCoordinator.failExecution from confirm phase
  const coordinator = new ThreePhaseFlowCoordinator();
  coordinator.startPlanning("Crash test");
  const plan: StructuredPlan = {
    planId: "p-crash",
    title: "Crash Plan",
    userPrompt: "prompt",
    items: [],
    requestedTools: ["gen_img"],
    suggestedStepQuota: 5,
  };
  const impact: PlanImpactAssessment = {
    costTier: "high",
    estimatedTokens: 10000,
    triggeredGates: ["high_cost_batch"],
    reversibility: "full_snapshot_undo",
    affectedNodeIds: [],
    externalEndpointsContacted: [],
    securityRiskLevel: "low",
  };
  coordinator.compilePlan(plan, impact);
  assert.equal(coordinator.phase, "confirm");

  const failRes = coordinator.failExecution(
    "System crash while in confirm phase",
  );
  assert.equal(failRes.phase, "failed");
  assert.equal(coordinator.phase, "failed");
});

test("agentWorkflow: compilePlan prevents forceConfirmation: false from bypassing high_cost_batch and critical risk", () => {
  const coordinator = new ThreePhaseFlowCoordinator();
  coordinator.startPlanning("High cost gate test");
  const plan: StructuredPlan = {
    planId: "p-gate",
    title: "Gate Plan",
    userPrompt: "prompt",
    items: [],
    requestedTools: ["gen_img"],
    suggestedStepQuota: 5,
  };

  // High cost batch gate cannot be bypassed by forceConfirmation: false
  const highCostImpact: PlanImpactAssessment = {
    costTier: "high",
    estimatedTokens: 50000,
    triggeredGates: ["high_cost_batch"],
    reversibility: "irreversible",
    affectedNodeIds: [],
    externalEndpointsContacted: [],
    securityRiskLevel: "low",
  };
  const compiled1 = coordinator.compilePlan(plan, highCostImpact, false);
  assert.equal(compiled1.requiresConfirmation, true);
  assert.equal(coordinator.phase, "confirm");

  // Critical security risk cannot be bypassed by forceConfirmation: false
  const coord2 = new ThreePhaseFlowCoordinator();
  coord2.startPlanning("Critical risk gate test");
  const criticalImpact: PlanImpactAssessment = {
    costTier: "low",
    estimatedTokens: 100,
    triggeredGates: [],
    reversibility: "full_snapshot_undo",
    affectedNodeIds: [],
    externalEndpointsContacted: [],
    securityRiskLevel: "critical",
  };
  const compiled2 = coord2.compilePlan(plan, criticalImpact, false);
  assert.equal(compiled2.requiresConfirmation, true);
  assert.equal(coord2.phase, "confirm");

  // Non-critical low-risk plan CAN have confirmation suppressed
  const coord3 = new ThreePhaseFlowCoordinator();
  coord3.startPlanning("Safe plan");
  const safeImpact: PlanImpactAssessment = {
    costTier: "low",
    estimatedTokens: 50,
    triggeredGates: [],
    reversibility: "full_snapshot_undo",
    affectedNodeIds: [],
    externalEndpointsContacted: [],
    securityRiskLevel: "low",
  };
  const compiled3 = coord3.compilePlan(plan, safeImpact, false);
  assert.equal(compiled3.requiresConfirmation, false);
  assert.equal(coord3.phase, "execution");
});
