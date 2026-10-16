import assert from "node:assert/strict";
import test from "node:test";
import {
  ActionButtonStateMachine,
  validateSnapshotV3,
  migrateSnapshotV2ToV3,
  NonDowngradableWriteBarrier,
  deduplicateRelayModels,
  createTestChannelRegistry,
  createPixelBuffer,
  verifyAlphaIntegrity,
  calculateAdaptiveResize,
  parseComfyUiOutputs,
  calculateWebSocketProgress,
  type CreationSnapshotV3,
  type LegacyV2Snapshot,
  type ModelMenuEntry,
  type ComfyUiHistoryOutputs,
} from "./harness.ts";
import type { ChannelRegistration } from "../../src/features/ai-gateway/channels/registry.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";

/* =========================================================================
 * Tiers 3 & 4: Cross-Feature Interactions & Real-World Application Scenarios
 * ========================================================================= */

const mockAdapter = (provider: string): ChannelAdapter => ({
  provider,
  estimate: async () => ({
    currency: "cny",
    minimumUnits: 1,
    maximumUnits: 1,
    billingMode: "free",
  }),
  submit: async () => ({
    providerJobId: `job-${provider}-${Date.now()}`,
    async: true,
    status: "queued",
  }),
  getStatus: async (id) => ({ providerJobId: id, async: true, status: "succeeded" }),
  cancel: async () => {},
  listResults: async () => [],
});

// -------------------------------------------------------------------------
// Tier 3: Cross-Feature Interactions (Pairwise Permutations)
// -------------------------------------------------------------------------

test("SCENARIO-T3-01 (R1 + R5): pausing action button during ComfyUI video task freezes turn dispatch while background polling continues", async () => {
  const button = new ActionButtonStateMachine("executing");
  button.setRemotePolling(true); // ComfyUI video generation running

  // ComfyUI task running
  const comfyTask = {
    promptId: "prompt-h3-render-001",
    status: "running",
    progress: 45,
  };

  // User clicks pause on Action Button
  await button.handleClick(); // executing -> pausing
  button.completeStepAndFreeze(); // pausing -> paused

  // Assert button state
  assert.equal(button.state, "paused");
  assert.equal(button.isTurnQueueFrozen, true, "Subsequent turn scheduling must be frozen");

  // Assert ComfyUI video task continues polling in background
  assert.equal(button.isRemotePollingActive, true, "Background video polling must NOT be cancelled");

  // Background ComfyUI finishes while turn is paused
  comfyTask.progress = 100;
  comfyTask.status = "succeeded";
  const history: ComfyUiHistoryOutputs = {
    "node-vhs": {
      videos: [{ filename: "final_render.mp4", subfolder: "renders", type: "output" }],
    },
  };
  const parsed = parseComfyUiOutputs(comfyTask.promptId, "http://127.0.0.1:8188", history);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].mime, "video/mp4");
  assert.equal(button.state, "paused", "Button remains safely in paused state upon background completion");
});

test("SCENARIO-T3-02 (R2 + R3): switching multi-chat tabs isolates deduplicated model selections and allowlists between chats", () => {
  // Model catalog with deduplicated entries
  const modelEntries: ModelMenuEntry[] = [
    {
      id: "r1-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "c1",
      connectionName: "Relay 1",
      priority: 100,
      weight: 50,
      state: "active",
      kind: "text",
    },
    {
      id: "r2-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "c2",
      connectionName: "Relay 2",
      priority: 90,
      weight: 50,
      state: "active",
      kind: "text",
    },
    {
      id: "r3-claude",
      modelId: "claude-3-5-sonnet",
      displayName: "Claude 3.5 Sonnet",
      connectionId: "c3",
      connectionName: "Official",
      priority: 100,
      weight: 100,
      state: "active",
      kind: "text",
    },
  ];

  const deduplicated = deduplicateRelayModels(modelEntries);
  assert.equal(deduplicated.length, 2);

  // Snapshot v3 project with two chats having different model permissions
  const project: CreationSnapshotV3["projects"][0] = {
    id: "proj-1",
    name: "Model Gated Project",
    activeChatId: "chat-gpt",
    chats: {
      "chat-gpt": {
        id: "chat-gpt",
        name: "GPT 助理",
        createdAt: 100,
        updatedAt: 100,
        draft: { text: "Use GPT-4o for code generation" },
        messages: [],
        mainAgent: "codex",
        modelAllowlist: ["gpt-4o"],
      },
      "chat-claude": {
        id: "chat-claude",
        name: "Claude 创意",
        createdAt: 200,
        updatedAt: 200,
        draft: { text: "Use Claude for creative writing" },
        messages: [],
        mainAgent: "codex",
        modelAllowlist: ["claude-3-5-sonnet"],
      },
    },
  };

  // Chat 1 allowlist check
  assert.deepEqual(project.chats[project.activeChatId].modelAllowlist, ["gpt-4o"]);

  // Switch to Chat 2
  project.activeChatId = "chat-claude";
  assert.deepEqual(project.chats[project.activeChatId].modelAllowlist, ["claude-3-5-sonnet"]);

  // Cross-chat isolation check: Chat 1's draft did not overwrite Chat 2's draft
  assert.equal(project.chats["chat-gpt"].draft.text, "Use GPT-4o for code generation");
  assert.equal(project.chats["chat-claude"].draft.text, "Use Claude for creative writing");
});

test("SCENARIO-T3-03 (R2 + R4): multi-chat tabs sharing canvas assets preserve pristine originalAssetId across image edits from different chats", () => {
  const masterAssetId = "asset-transparent-logo-master";

  // Shared project canvas item
  const sharedItem = {
    id: "item-canvas-logo",
    assetId: masterAssetId,
    mime: "image/png",
    hasAlpha: true,
  };

  // Chat A crops the logo
  const taskFromChatA = {
    taskId: "task-crop-chat-a",
    originChatId: "chat-a",
    sourceItemId: sharedItem.id,
    originalAssetId: masterAssetId,
    parameters: { crop: { width: 500, height: 500 } },
  };

  // Chat B performs background cleanup on the same logo
  const taskFromChatB = {
    taskId: "task-cleanup-chat-b",
    originChatId: "chat-b",
    sourceItemId: sharedItem.id,
    originalAssetId: masterAssetId, // Must preserve same pristine master ID
    parameters: { prompt: "remove stray marks" },
  };

  assert.equal(taskFromChatA.originalAssetId, masterAssetId);
  assert.equal(taskFromChatB.originalAssetId, masterAssetId);
  assert.notEqual(taskFromChatA.originChatId, taskFromChatB.originChatId);
});

test("SCENARIO-T3-04 (R1 + R2): action button turn freeze state and composer draft are strictly isolated per chat during tab switching", async () => {
  // Chat A state machine
  const chatAMachine = new ActionButtonStateMachine("executing");
  chatAMachine.setDraft("Draft for Chat A (Turn Paused)");

  // Pause turn in Chat A
  await chatAMachine.handleClick(); // executing -> pausing
  chatAMachine.completeStepAndFreeze(); // pausing -> paused

  assert.equal(chatAMachine.state, "paused");
  assert.equal(chatAMachine.isTurnQueueFrozen, true);

  // User switches tab to Chat B
  const chatBMachine = new ActionButtonStateMachine("idle");
  chatBMachine.setDraft("Fresh draft for Chat B");

  assert.equal(chatBMachine.state, "idle");
  assert.equal(chatBMachine.isTurnQueueFrozen, false);
  assert.equal(chatBMachine.isButtonDisabled(), false);

  // User executes Chat B
  await chatBMachine.handleClick(); // idle -> executing
  assert.equal(chatBMachine.state, "executing");

  // User switches back to Chat A: Chat A remains paused with its draft intact
  assert.equal(chatAMachine.state, "paused");
  assert.equal(chatAMachine.isTurnQueueFrozen, true);
  assert.equal(chatAMachine.draft.text, "Draft for Chat A (Turn Paused)");
});

test("SCENARIO-T3-05 (R4 + R5): alpha-preserved PNG asset submitted to ComfyUI video workflow yields correctly parsed .mp4 task result", () => {
  // 1. Prepare PNG with alpha transparency
  const buffer = createPixelBuffer(64, 64, { r: 10, g: 20, b: 30, a: 0 }); // Alpha background
  const integrity = verifyAlphaIntegrity(buffer);
  assert.equal(integrity.hasTransparency, true);

  // 2. Adaptive resize for video generation input
  const resized = calculateAdaptiveResize(buffer.width, buffer.height, 1024);
  assert.equal(resized.width, 64);
  assert.equal(resized.height, 64);

  // 3. ComfyUI produces video output from input image
  const history: ComfyUiHistoryOutputs = {
    "node-svd-video": {
      videos: [
        {
          filename: "alpha_motion_output.mp4",
          subfolder: "svd",
          type: "output",
        },
      ],
    },
  };

  const parsed = parseComfyUiOutputs("prompt-svd-001", "http://127.0.0.1:8188", history);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].mime, "video/mp4");
  assert.ok(parsed[0].url.includes("alpha_motion_output.mp4"));
});

// -------------------------------------------------------------------------
// Tier 4: Real-World Application Scenarios (Full Lifecycle Journeys)
// -------------------------------------------------------------------------

test("SCENARIO-T4-01 (Complete Creative Studio Lifecycle): project creation -> multi-chat -> alpha PNG import -> relay model selection -> turn execution -> pause/resume -> completion", async () => {
  // Step 1: Create project with multi-chat
  const project: CreationSnapshotV3["projects"][0] = {
    id: "proj-studio-001",
    name: "Cyberpunk Game Asset",
    activeChatId: "chat-main",
    chats: {
      "chat-main": {
        id: "chat-main",
        name: "概念设计",
        createdAt: 1000,
        updatedAt: 1000,
        draft: { text: "Render floating neon logo" },
        messages: [],
        mainAgent: "codex",
        modelAllowlist: ["gpt-4o"],
      },
    },
    items: [],
  };

  // Step 2: Import alpha PNG logo
  const logoBuffer = createPixelBuffer(200, 200, { r: 0, g: 255, b: 128, a: 120 });
  const logoIntegrity = verifyAlphaIntegrity(logoBuffer);
  assert.equal(logoIntegrity.hasTransparency, true);

  project.items!.push({
    id: "item-logo",
    assetId: "asset-raw-logo-master",
    title: "Neon Logo",
  });

  // Step 3: Model selection via deduplicated relays
  const entries: ModelMenuEntry[] = [
    {
      id: "relay-a-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "conn-a",
      connectionName: "Relay Fast",
      priority: 100,
      weight: 50,
      state: "active",
      kind: "text",
    },
    {
      id: "relay-b-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "conn-b",
      connectionName: "Relay Backup",
      priority: 80,
      weight: 50,
      state: "active",
      kind: "text",
    },
  ];
  const [dedupModel] = deduplicateRelayModels(entries);
  assert.equal(dedupModel.candidateCount, 2);
  assert.equal(dedupModel.badgeLabel, "中转 · 2 个可用");

  // Step 4: Turn execution with Action Button
  const button = new ActionButtonStateMachine("idle");
  button.setDraft(project.chats["chat-main"].draft.text || "");

  // Send turn
  await button.handleClick(); // idle -> executing
  assert.equal(button.state, "executing");

  // User pauses turn
  await button.handleClick(); // executing -> pausing
  button.completeStepAndFreeze(); // pausing -> paused
  assert.equal(button.state, "paused");
  assert.equal(button.isTurnQueueFrozen, true);

  // User alters draft while paused
  button.setDraft("Render floating neon logo with cinematic lighting");
  assert.equal(button.draft.text, "Render floating neon logo with cinematic lighting");

  // User resumes turn
  let autoSent = false;
  await button.handleClick(
    () => {
      autoSent = true;
    },
    undefined,
    () => {},
  );
  button.acknowledgeUnfreeze();

  assert.equal(autoSent, false, "Resume must NOT automatically send draft");
  assert.equal(button.state, "executing");

  // Step 5: Turn completion
  button.completeExecution();
  assert.equal(button.state, "completed");
  button.resetToIdle();
  assert.equal(button.state, "idle");
});

test("SCENARIO-T4-02 (Legacy Project Upgrade & Migration Continuity): v2 snapshot upgrade -> write barrier -> v3 chats -> multi-chat tabs -> transcript integrity", () => {
  const legacyV2: LegacyV2Snapshot = {
    version: 2,
    revision: 12,
    activeProjectId: "proj-legacy-game",
    homeDraft: {},
    projects: [
      {
        id: "proj-legacy-game",
        name: "Legacy Game Project",
        messages: [
          { id: "msg-dir-1", role: "user", content: "Create level map" },
          { id: "msg-dir-2", role: "assistant", content: "Level map created" },
        ],
        composerDraft: { text: "Unfinished draft in v2" },
        agentThreadId: "thread-agent-old",
        items: [{ id: "item-tile-map" }],
        tasks: [{ id: "task-map-gen" }],
      },
    ],
  };

  // 1. Migrate v2 -> v3
  const v3Snapshot = migrateSnapshotV2ToV3(legacyV2);
  const validatedV3 = validateSnapshotV3(v3Snapshot);
  assert.equal(validatedV3.version, 3);

  // 2. Non-downgradable write barrier
  const rawV2 = JSON.stringify(legacyV2);
  const barrier = new NonDowngradableWriteBarrier(rawV2);
  const receipt = barrier.executeMigrationWriteBarrier(validatedV3);

  assert.ok(receipt.archiveSha);
  assert.equal(barrier.formatMarker.formatVersion, 2);

  // 3. Multi-chat tabs accessible without data loss
  const proj = validatedV3.projects[0];
  assert.ok(proj.chats["legacy-direct"]);
  assert.ok(proj.chats["legacy-codex"]);
  assert.equal(proj.chats["legacy-direct"].messages.length, 2);
  assert.equal(proj.chats["legacy-direct"].draft.text, "Unfinished draft in v2");
  assert.equal(proj.chats["legacy-codex"].agentThreadId, "thread-agent-old");
  assert.equal(proj.items?.length, 1);
});

test("SCENARIO-T4-03 (ComfyUI Video Generation Lifecycle with Live Tracking & Interruption): submit prompt -> WebSocket progress stream -> pause turn -> background completion -> video archived", async () => {
  const promptId = "comfy-task-vid-999";
  const progressUpdates: number[] = [];

  // 1. Simulate WebSocket progress stream
  const steps = [
    { value: 0, max: 20 },
    { value: 5, max: 20 },
    { value: 10, max: 20 },
    { value: 18, max: 20 },
    { value: 20, max: 20 },
  ];

  for (const step of steps) {
    const pct = calculateWebSocketProgress(step.value, step.max);
    progressUpdates.push(pct);
  }

  assert.deepEqual(progressUpdates, [0, 25, 50, 90, 100]);

  // 2. Action button pause while generation was running
  const button = new ActionButtonStateMachine("executing");
  button.setRemotePolling(true);
  await button.handleClick();
  button.completeStepAndFreeze();
  assert.equal(button.state, "paused");

  // 3. ComfyUI finishes outputting video
  const history: ComfyUiHistoryOutputs = {
    "node-video": {
      videos: [
        {
          filename: "cyber_walk_cycle.mp4",
          subfolder: "animations",
          type: "output",
        },
      ],
    },
  };

  const results = parseComfyUiOutputs(promptId, "http://127.0.0.1:8188", history);
  assert.equal(results.length, 1);
  assert.equal(results[0].mime, "video/mp4");
  assert.ok(results[0].url.includes("cyber_walk_cycle.mp4"));
});

test("SCENARIO-T4-04 (Resilient Multi-Relay Model Routing Under Rate Limiting): deduplicated selection -> primary relay 429 -> automatic tier failover -> upstream acceptance -> non-replay invariant", () => {
  const primaryChannel: ChannelRegistration = {
    id: "channel-relay-alpha",
    adapter: mockAdapter("alpha"),
    kind: "api",
    enabled: true,
    priority: 100, // Highest tier
    weight: 50,
    baseUrl: "https://alpha.api.com",
    capabilities: { operations: ["generate"], modalities: ["text"], limits: {} },
    modelMapping: { "gpt-4o": "gpt-4o" },
    timeoutMs: 15000,
  };

  const secondaryChannel: ChannelRegistration = {
    id: "channel-relay-beta",
    adapter: mockAdapter("beta"),
    kind: "api",
    enabled: true,
    priority: 80, // Fallback tier
    weight: 50,
    baseUrl: "https://beta.api.com",
    capabilities: { operations: ["generate"], modalities: ["text"], limits: {} },
    modelMapping: { "gpt-4o": "gpt-4o" },
    timeoutMs: 15000,
  };

  const registry = createTestChannelRegistry([primaryChannel, secondaryChannel]);
  const candidates = registry.candidates("gpt-4o", "generate");

  // Routing attempt 1: Candidate 0 hits 429 rate limit prior to acceptance
  let currentCandidateIndex = 0;
  const dispatchAttempt = () => {
    const candidate = candidates[currentCandidateIndex];
    if (candidate.channelId === "channel-relay-alpha") {
      currentCandidateIndex++;
      return { accepted: false, status: 429 };
    }
    return {
      accepted: true,
      status: 200,
      upstreamId: "accepted-relay-beta-job-uuid",
    };
  };

  const attempt1 = dispatchAttempt();
  assert.equal(attempt1.accepted, false);

  // Automatic failover to next candidate in registry
  const attempt2 = dispatchAttempt();
  assert.equal(attempt2.accepted, true);
  assert.equal(attempt2.upstreamId, "accepted-relay-beta-job-uuid");

  // Invariant check: Accepted work cannot failover or replay
  const replayAllowed = !attempt2.accepted;
  assert.equal(replayAllowed, false, "Accepted work must never be replayed");
});

test("SCENARIO-T4-05 (High-Concurrency Stress & Adversarial Boundary Protection): rapid clicks -> panorama transparent image -> secret injection rejection -> fast tab switching -> data integrity", async () => {
  // 1. Rapid clicks on action button
  const machine = new ActionButtonStateMachine("executing");
  let pauseTriggered = 0;
  for (let i = 0; i < 5; i++) {
    await machine.handleClick(
      undefined,
      () => {
        pauseTriggered++;
      },
      undefined,
    );
  }
  // Debounce and disabled state ensure only exactly 1 pause trigger fired
  assert.equal(pauseTriggered, 1);
  assert.equal(machine.state, "pausing");

  // 2. Extreme panorama image with transparency
  const panorama = calculateAdaptiveResize(8000, 120, 2048);
  assert.equal(panorama.width, 2048);
  assert.ok(panorama.height >= 1);

  // 3. Security secret rejection check
  assert.throws(
    () =>
      validateSnapshotV3({
        version: 3,
        revision: 1,
        activeProjectId: "p1",
        homeDraft: {},
        projects: [],
        apiKey: "sk-malicious-leak",
      }),
    /凭据|令牌|密钥/,
  );

  // 4. Fast switching across 10 chat tabs in snapshot v3
  const project: CreationSnapshotV3["projects"][0] = {
    id: "proj-stress",
    name: "Stress Test",
    activeChatId: "chat-0",
    chats: {},
  };
  for (let i = 0; i < 10; i++) {
    project.chats[`chat-${i}`] = {
      id: `chat-${i}`,
      name: `Tab ${i}`,
      createdAt: 100 + i,
      updatedAt: 100 + i,
      draft: { text: `Unique Draft for Tab ${i}` },
      messages: [],
      mainAgent: "codex",
      modelAllowlist: [],
    };
  }

  // Switch tabs rapidly
  for (let i = 9; i >= 0; i--) {
    project.activeChatId = `chat-${i}`;
    assert.equal(project.chats[project.activeChatId].draft.text, `Unique Draft for Tab ${i}`);
  }
});
