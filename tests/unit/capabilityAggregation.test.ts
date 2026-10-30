import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyCapability,
  classifyChatSubCategory,
  createAutoRoutingSelection,
  isAutoRouting,
  resolveAutoRoutingChannel,
  aggregateCapabilityEntries,
  AUTO_ROUTING_MODEL,
  AUTO_ROUTING_LABEL,
} from "../../src/features/models/capabilityAggregation.ts";
import {
  ChannelRegistry,
  type ChannelRegistration,
} from "../../src/features/ai-gateway/channels/registry.ts";
import { Scheduler } from "../../src/features/ai-gateway/scheduler.ts";
import { doubaoAdapter } from "../../src/features/ai-gateway/channels/doubao.ts";
import type {
  CapabilityManifest,
  ProviderConnection,
} from "../../src/domain/providerConnections.ts";
import type { ModelSelection } from "../../src/domain/modelSelection.ts";

const chatCapabilities: CapabilityManifest = {
  operations: ["chat"],
  modalities: ["text"],
  async: false,
};

const imageCapabilities: CapabilityManifest = {
  operations: ["generate"],
  modalities: ["image"],
  async: true,
};

function createReg(
  id: string,
  overrides: Partial<ChannelRegistration> = {},
): ChannelRegistration {
  return {
    id,
    adapter: doubaoAdapter,
    kind: "official_api",
    enabled: true,
    priority: 100,
    weight: 10,
    baseUrl: "https://api.example.com",
    capabilities: chatCapabilities,
    modelMapping: { "gpt-4o": "gpt-4o-upstream" },
    timeoutMs: 30000,
    ...overrides,
  };
}

test("classifyCapability correctly partitions text/reasoning vs image generation models", () => {
  assert.equal(classifyCapability("text", "gpt-4o"), "chat");
  assert.equal(classifyCapability("text", "deepseek-r1"), "chat");
  assert.equal(classifyCapability("image", "flux-schnell"), "image");
  assert.equal(classifyCapability("image", "dall-e-3"), "image");

  // Fallback by ID inspection when kind is unknown
  assert.equal(classifyCapability("unknown", "FLUX.1-dev"), "image");
  assert.equal(classifyCapability("unknown", "stable-diffusion-xl"), "image");
  assert.equal(classifyCapability("unknown", "comfyui-workflow"), "image");
  assert.equal(classifyCapability("unknown", "claude-3-5-sonnet"), "chat");
});

test("classifyChatSubCategory detects reasoning models, main agent, and sub-agents", () => {
  // Reasoning models (o1, o3, R1, QwQ)
  assert.equal(classifyChatSubCategory("o1-preview"), "reasoning");
  assert.equal(classifyChatSubCategory("o3-mini"), "reasoning");
  assert.equal(classifyChatSubCategory("deepseek-r1"), "reasoning");
  assert.equal(classifyChatSubCategory("qwq-32b-preview"), "reasoning");

  // Main agent
  assert.equal(
    classifyChatSubCategory("default", "Codex 主 Agent"),
    "main_agent",
  );

  // Sub-agents / fast models
  assert.equal(classifyChatSubCategory("gpt-4o-mini"), "sub_agent");
  assert.equal(classifyChatSubCategory("claude-3-5-haiku"), "sub_agent");
  assert.equal(classifyChatSubCategory("gemini-1.5-flash"), "sub_agent");

  // General chat
  assert.equal(classifyChatSubCategory("gpt-4o"), "general_chat");
  assert.equal(classifyChatSubCategory("claude-3-5-sonnet"), "general_chat");
});

test("isAutoRouting and createAutoRoutingSelection manage auto-routing state", () => {
  const chatAuto = createAutoRoutingSelection("chat");
  assert.equal(chatAuto.model, AUTO_ROUTING_MODEL);
  assert.equal(chatAuto.displayName, AUTO_ROUTING_LABEL);
  assert.equal(chatAuto.kind, "text");
  assert.equal(isAutoRouting(chatAuto), true);

  const imgAuto = createAutoRoutingSelection("image");
  assert.equal(imgAuto.model, AUTO_ROUTING_MODEL);
  assert.equal(imgAuto.kind, "image");
  assert.equal(isAutoRouting(imgAuto), true);

  const regular: ModelSelection = {
    source: "api",
    model: "claude-3-5-sonnet",
    kind: "text",
  };
  assert.equal(isAutoRouting(regular), false);
  assert.equal(isAutoRouting(undefined), false);
});

test("resolveAutoRoutingChannel delegates to ai-gateway/scheduler and selects optimal priority channel", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: [
      createReg("conn-tier2", { priority: 50, weight: 10 }),
      createReg("conn-tier0", { priority: 200, weight: 10 }),
      createReg("conn-tier1", { priority: 100, weight: 10 }),
    ],
    states: new Map(),
  });

  const scheduler = new Scheduler(registry);

  const resolution = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });

  assert.equal(
    resolution.connectionId,
    "conn-tier0",
    "Auto-routing must select the highest priority available channel",
  );
  assert.equal(resolution.model, "gpt-4o-upstream");
});

test("resolveAutoRoutingChannel fails over to healthy tier when top channel is quarantined", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);
  registry.replace({
    registrations: [
      createReg("conn-failing", { priority: 200, weight: 10 }),
      createReg("conn-backup", { priority: 100, weight: 10 }),
    ],
    states: new Map(),
  });

  const scheduler = new Scheduler(registry);
  // Quarantine the top tier channel
  const health = scheduler.health();
  health.recordFailure("conn-failing", {
    errorClass: "RATE_LIMITED",
    retryable: true,
    cooldownMs: 60000,
  });
  // Simulate quarantine
  health.state("conn-failing").quarantined = true;

  const resolution = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });

  assert.equal(
    resolution.connectionId,
    "conn-backup",
    "Auto-routing must automatically fail over to healthy backup channel",
  );
});

test("aggregateCapabilityEntries builds capability list with auto-routing at index 0 and deduped models", () => {
  const connections: ProviderConnection[] = [
    {
      id: "conn-siliconflow",
      provider: "siliconflow",
      kind: "user_byok",
      displayName: "硅基流动",
      priority: 80,
      state: "active",
      concurrencyLimit: 5,
      capabilities: chatCapabilities,
    },
    {
      id: "conn-12ai",
      provider: "12ai",
      kind: "user_byok",
      displayName: "12ai 中转",
      priority: 60,
      state: "active",
      concurrencyLimit: 5,
      capabilities: chatCapabilities,
    },
  ];

  // Set up mock catalogs
  const catalogs = [
    {
      id: "conn-siliconflow",
      fetchedAt: Date.now(),
      models: [
        { id: "deepseek-ai/DeepSeek-R1", kind: "text" as const },
        { id: "gpt-4o", kind: "text" as const },
      ],
    },
    {
      id: "conn-12ai",
      fetchedAt: Date.now(),
      models: [
        { id: "gpt-4o", kind: "text" as const },
        { id: "claude-3-5-sonnet", kind: "text" as const },
      ],
    },
  ];

  const entries = aggregateCapabilityEntries({
    capability: "chat",
    connections,
    catalogs,
    agentStatus: "connected",
    agentModels: [{ id: "o1", model: "o1", displayName: "OpenAI o1" }],
  });

  // Index 0 must be Auto-Routing
  assert.equal(entries[0].label, AUTO_ROUTING_LABEL);
  assert.equal(entries[0].selection?.model, AUTO_ROUTING_MODEL);
  assert.equal(entries[0].metadata?.isAutoRouting, true);

  // Grouped and deduped: gpt-4o should be merged across SiliconFlow and 12ai
  const gpt4oEntry = entries.find((e) => e.selection?.model === "gpt-4o");
  assert.ok(gpt4oEntry, "gpt-4o entry must exist");
  assert.equal(
    gpt4oEntry.metadata?.redundancyCount,
    2,
    "gpt-4o must reflect 2 redundant available providers",
  );
  assert.equal(
    gpt4oEntry.selection?.connectionId,
    "conn-siliconflow",
    "Higher priority connection (SiliconFlow: 80) must be top candidate",
  );

  // Reasoning models (o1, DeepSeek-R1) should have reasoning metadata
  const o1Entry = entries.find((e) => e.selection?.model === "o1");
  assert.ok(o1Entry);
  assert.equal(o1Entry.metadata?.subCategory, "reasoning");
});

test("aggregateCapabilityEntries partitions image generation capability cleanly", () => {
  const connections: ProviderConnection[] = [
    {
      id: "conn-flux",
      provider: "siliconflow",
      kind: "user_byok",
      displayName: "硅基流动生图",
      priority: 90,
      state: "active",
      concurrencyLimit: 2,
      capabilities: imageCapabilities,
    },
  ];

  const catalogs = [
    {
      id: "conn-flux",
      fetchedAt: Date.now(),
      models: [
        { id: "black-forest-labs/FLUX.1-schnell", kind: "image" as const },
        { id: "stabilityai/stable-diffusion-3-medium", kind: "image" as const },
      ],
    },
  ];

  const entries = aggregateCapabilityEntries({
    capability: "image",
    connections,
    catalogs,
    agentStatus: "connected",
  });

  assert.equal(entries[0].label, AUTO_ROUTING_LABEL);
  assert.equal(entries[0].selection?.kind, "image");

  // All entries must be image-related
  const nonAuto = entries.slice(1);
  assert.ok(nonAuto.length >= 2);
  for (const item of nonAuto) {
    assert.equal(item.selection?.kind, "image");
  }
});
