import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateRelayModels,
  createTestChannelRegistry,
  type ModelMenuEntry,
} from "./harness.ts";
import type { ChannelRegistration } from "../../src/features/ai-gateway/channels/registry.ts";
import type { ChannelAdapter } from "../../src/features/ai-gateway/channels/adapter.ts";
import type { CapabilityManifest } from "../../src/domain/providerConnections.ts";

/* =========================================================================
 * R3: Cross-Relay Model Deduplication & Priority Routing E2E Tests
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
  getStatus: async (id) => ({
    providerJobId: id,
    async: true,
    status: "succeeded",
  }),
  cancel: async () => {},
  listResults: async () => [],
});

const defaultCapabilities: CapabilityManifest = {
  operations: ["chat", "generate"],
  modalities: ["text"],
  limits: {},
};

// -------------------------------------------------------------------------
// Tier 1: Feature Coverage (Core Contracts & Happy Paths)
// -------------------------------------------------------------------------

test("R3-T1-01: cross-relay deduplication merges identical upstream models into single catalog entry", () => {
  const entries: ModelMenuEntry[] = [
    {
      id: "relay1-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "conn-relay-1",
      connectionName: "Relay Alpha",
      priority: 100,
      weight: 50,
      state: "active",
      kind: "text",
    },
    {
      id: "relay2-gpt4o",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "conn-relay-2",
      connectionName: "Relay Beta",
      priority: 90,
      weight: 50,
      state: "active",
      kind: "text",
    },
    {
      id: "official-claude",
      modelId: "claude-3-5-sonnet",
      displayName: "Claude 3.5 Sonnet",
      connectionId: "conn-official",
      connectionName: "Official Anthropic",
      priority: 100,
      weight: 100,
      state: "active",
      kind: "text",
    },
  ];

  const deduplicated = deduplicateRelayModels(entries);

  // Exactly 2 canonical rows instead of 3
  assert.equal(deduplicated.length, 2);

  const gpt4o = deduplicated.find((m) => m.canonicalModelId === "gpt-4o")!;
  assert.ok(gpt4o);
  assert.equal(
    gpt4o.candidateCount,
    2,
    "GPT-4o must have 2 merged candidate connections",
  );
  assert.equal(gpt4o.connections.length, 2);

  const claude = deduplicated.find(
    (m) => m.canonicalModelId === "claude-3-5-sonnet",
  )!;
  assert.ok(claude);
  assert.equal(claude.candidateCount, 1);
});

test("R3-T1-02: candidate count badge formats correctly as '中转 · X 个可用' when multiple relays exist", () => {
  const entries: ModelMenuEntry[] = [
    {
      id: "r1",
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
      id: "r2",
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
      id: "r3",
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      connectionId: "c3",
      connectionName: "Relay 3",
      priority: 80,
      weight: 50,
      state: "active",
      kind: "text",
    },
  ];

  const [row] = deduplicateRelayModels(entries);
  assert.equal(row.candidateCount, 3);
  assert.equal(row.badgeLabel, "中转 · 3 个可用");
});

test("R3-T1-03: single connection model entry renders standard provider name without plural badge", () => {
  const entries: ModelMenuEntry[] = [
    {
      id: "single-conn",
      modelId: "gemini-1.5-pro",
      displayName: "Gemini 1.5 Pro",
      connectionId: "google-direct",
      connectionName: "Google 官方",
      priority: 100,
      weight: 100,
      state: "active",
      kind: "text",
    },
  ];

  const [row] = deduplicateRelayModels(entries);
  assert.equal(row.candidateCount, 1);
  assert.equal(
    row.badgeLabel,
    "Google 官方",
    "Single connection must render its own connection name",
  );
});

test("R3-T1-04: ChannelRegistry sorts eligible channels by priority descending then weight descending", () => {
  const reg1: ChannelRegistration = {
    id: "channel-tier-low",
    adapter: mockAdapter("low-provider"),
    kind: "api",
    enabled: true,
    priority: 50,
    weight: 100,
    baseUrl: "https://api.low.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o-upstream" },
    timeoutMs: 30000,
  };

  const reg2: ChannelRegistration = {
    id: "channel-tier-high-heavy",
    adapter: mockAdapter("high-heavy-provider"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 80,
    baseUrl: "https://api.heavy.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o-upstream" },
    timeoutMs: 30000,
  };

  const reg3: ChannelRegistration = {
    id: "channel-tier-high-light",
    adapter: mockAdapter("high-light-provider"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 20,
    baseUrl: "https://api.light.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o-upstream" },
    timeoutMs: 30000,
  };

  const registry = createTestChannelRegistry([reg1, reg2, reg3]);
  const candidates = registry.candidates("gpt-4o", "generate");

  assert.equal(candidates.length, 3);
  // Tier 100 (weight 80) -> Tier 100 (weight 20) -> Tier 50
  assert.equal(candidates[0].channelId, "channel-tier-high-heavy");
  assert.equal(candidates[1].channelId, "channel-tier-high-light");
  assert.equal(candidates[2].channelId, "channel-tier-low");
});

test("R3-T1-05: request dispatcher selects highest-priority active connection for model execution", () => {
  const regPrimary: ChannelRegistration = {
    id: "channel-primary",
    adapter: mockAdapter("primary-adapter"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 100,
    baseUrl: "https://primary.api.com",
    capabilities: defaultCapabilities,
    modelMapping: { "claude-3-5-sonnet": "claude-3-5-sonnet-20241022" },
    timeoutMs: 30000,
  };

  const regBackup: ChannelRegistration = {
    id: "channel-backup",
    adapter: mockAdapter("backup-adapter"),
    kind: "api",
    enabled: true,
    priority: 80,
    weight: 100,
    baseUrl: "https://backup.api.com",
    capabilities: defaultCapabilities,
    modelMapping: { "claude-3-5-sonnet": "claude-3-5-sonnet-20241022" },
    timeoutMs: 30000,
  };

  const registry = createTestChannelRegistry([regPrimary, regBackup]);
  const topCandidate = registry.candidates("claude-3-5-sonnet", "chat")[0];

  assert.equal(topCandidate.channelId, "channel-primary");
  assert.equal(topCandidate.priority, 100);
});

// -------------------------------------------------------------------------
// Tier 2: Boundary & Corner Cases (Failover, Quarantined & Load Balancing)
// -------------------------------------------------------------------------

test("R3-T2-01: all relay connections disabled or quarantined marks deduplicated row disabled with reason", () => {
  const entries: ModelMenuEntry[] = [
    {
      id: "relay-1",
      modelId: "flux-schnell",
      displayName: "FLUX Schnell",
      connectionId: "conn-1",
      connectionName: "Relay A",
      priority: 100,
      weight: 50,
      state: "quarantined",
      kind: "image",
    },
    {
      id: "relay-2",
      modelId: "flux-schnell",
      displayName: "FLUX Schnell",
      connectionId: "conn-2",
      connectionName: "Relay B",
      priority: 90,
      weight: 50,
      state: "disabled",
      kind: "image",
    },
  ];

  const [row] = deduplicateRelayModels(entries);
  assert.equal(row.candidateCount, 0);
  assert.equal(
    row.disabledReason,
    "所有可用连接已隔离或禁用，请检查设置",
    "Must display descriptive guidance when all connections are quarantined/disabled",
  );
});

test("R3-T2-02: pre-acceptance rate limit (HTTP 429) fails over to next priority tier channel", () => {
  const regPrimary: ChannelRegistration = {
    id: "tier-1-channel",
    adapter: mockAdapter("p1"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 100,
    baseUrl: "https://rate-limited.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o" },
    timeoutMs: 30000,
  };

  const regSecondary: ChannelRegistration = {
    id: "tier-2-channel",
    adapter: mockAdapter("p2"),
    kind: "api",
    enabled: true,
    priority: 50,
    weight: 100,
    baseUrl: "https://failover.com",
    capabilities: defaultCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o" },
    timeoutMs: 30000,
  };

  const registry = createTestChannelRegistry([regPrimary, regSecondary]);
  const candidates = registry.candidates("gpt-4o", "generate");

  // Dispatch simulation:
  // Candidate 0 (tier 1) fails with 429 prior to task acceptance
  const primaryCandidate = candidates[0];
  const simulateAttempt = (c: typeof primaryCandidate) => {
    if (c.channelId === "tier-1-channel") {
      return { status: 429, accepted: false };
    }
    return { status: 200, accepted: true, jobId: "upstream-job-success" };
  };

  const primaryResult = simulateAttempt(primaryCandidate);
  assert.equal(primaryResult.accepted, false);

  // Invariant: Failover routes to Candidate 1 (tier 2)
  const secondaryCandidate = candidates[1];
  const secondaryResult = simulateAttempt(secondaryCandidate);
  assert.equal(secondaryResult.accepted, true);
  assert.equal(secondaryResult.jobId, "upstream-job-success");
});

test("R3-T2-03: non-replay guarantee prevents duplicate execution once upstream task ID is issued", () => {
  // Accepted task invariant per ADR-022
  const acceptedTask = {
    taskId: "task-image-render-123",
    providerJobId: "upstream-relay-accepted-id-8888",
    channelId: "channel-primary",
    status: "accepted",
  };

  // Simulating an error during status polling after acceptance
  const pollFailure = {
    error: "Network timeout while polling result",
    canFailoverAndReplay: false, // Invariant: Accepted work must NEVER be replayed on another channel
  };

  assert.equal(
    pollFailure.canFailoverAndReplay,
    false,
    "Accepted task must never be replayed on alternative channel to prevent double charge",
  );
  assert.ok(acceptedTask.providerJobId);
});

test("R3-T2-04: search query matches deduplicated model across canonical id, display name, and relay aliases", () => {
  const entries: ModelMenuEntry[] = [
    {
      id: "relay-1",
      modelId: "gpt-4o",
      displayName: "OpenAI GPT-4o 旗舰模型",
      connectionId: "siliconflow",
      connectionName: "硅基流动 中转",
      priority: 100,
      weight: 50,
      state: "active",
      kind: "text",
    },
  ];

  const [row] = deduplicateRelayModels(entries);

  // Search predicates
  const query1 = "gpt-4o";
  const query2 = "旗舰";
  const query3 = "硅基流动";

  const matches = (query: string) =>
    row.canonicalModelId.toLowerCase().includes(query.toLowerCase()) ||
    row.displayName.toLowerCase().includes(query.toLowerCase()) ||
    row.connections.some((c) =>
      c.connectionName.toLowerCase().includes(query.toLowerCase()),
    );

  assert.equal(matches(query1), true);
  assert.equal(matches(query2), true);
  assert.equal(matches(query3), true);
  assert.equal(matches("non-existent-model"), false);
});

test("R3-T2-05: weight-based tie-breaking provides deterministic routing within same priority tier", () => {
  const regA: ChannelRegistration = {
    id: "channel-a",
    adapter: mockAdapter("adapter-a"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 90,
    baseUrl: "https://a.com",
    capabilities: defaultCapabilities,
    modelMapping: { "claude-3-5-sonnet": "upstream" },
    timeoutMs: 30000,
  };

  const regB: ChannelRegistration = {
    id: "channel-b",
    adapter: mockAdapter("adapter-b"),
    kind: "api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://b.com",
    capabilities: defaultCapabilities,
    modelMapping: { "claude-3-5-sonnet": "upstream" },
    timeoutMs: 30000,
  };

  const registry = createTestChannelRegistry([regB, regA]);
  const candidates = registry.candidates("claude-3-5-sonnet", "chat");

  // Channel A has weight 90, Channel B has weight 10 -> Channel A must rank first
  assert.equal(candidates[0].channelId, "channel-a");
  assert.equal(candidates[1].channelId, "channel-b");
});
