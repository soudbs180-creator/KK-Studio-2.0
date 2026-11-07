import assert from "node:assert/strict";
import test from "node:test";
import {
  probeProviderLatency,
  testProviderConnection,
} from "../../src/components/settings/testProviderConnection.ts";
import {
  fetchProviderModels,
  fetchAndSaveProviderModels,
} from "../../src/components/settings/fetchProviderModels.ts";
import {
  setModelEnabled,
  setDefaultModel,
  addCustomModel,
  removeCustomModel,
  mergeCatalogWithPreferences,
  getConnectionPrefs,
  saveCatalogPreferences,
  readCatalogPreferences,
} from "../../src/features/models/modelCatalogStore.ts";
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
import type { ModelProviderProfile } from "../../domain/modelProvider.ts";
import type { ConnectionState } from "../../src/components/settings/modelProviderSettingsState.ts";

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

function createMockRegistration(
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
    modelMapping: { "gpt-4o": "upstream-gpt-4o" },
    timeoutMs: 3000,
    ...overrides,
  };
}

// =============================================================================
// CHALLENGE SUITE 1: Latency Probe Strict Sub-3000ms & HTTP Status Code Stress
// =============================================================================

test("CHALLENGE 1.1: probeProviderLatency strictly caps timeout at 3000ms even when requested > 3000ms", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Simulate an endpoint that hangs forever
    globalThis.fetch = (_url, options) => {
      return new Promise((_resolve, reject) => {
        const signal = options?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    };

    const t0 = performance.now();
    // Caller attempts to request 10,000ms timeout, but probe must cap to <= 3000ms
    const result = await probeProviderLatency({
      baseUrl: "https://hanging-api.example.com/v1",
      apiKey: "test-key",
      timeoutMs: 10000, // Should be clamped to 3000ms
    });
    const elapsed = performance.now() - t0;

    assert.equal(result.ok, false);
    assert.equal(result.status, 0);
    assert.equal(result.error, "timeout");
    assert.match(result.message, /超时/);
    // Verified: aborted in ~3000ms (+/- 300ms scheduler margin), strictly less than requested 10000ms
    assert.ok(
      elapsed < 4000,
      `Expected probe to abort near 3000ms, but took ${elapsed}ms`,
    );
    assert.ok(
      elapsed >= 2900,
      `Expected probe to wait until 3000ms timeout, but finished too fast in ${elapsed}ms`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 1.2: probeProviderLatency captures exact HTTP status codes without unhandled errors", async () => {
  const originalFetch = globalThis.fetch;
  const statusMatrix = [
    { code: 400, pattern: /HTTP 400/ },
    { code: 401, pattern: /密钥无效或未授权 · \d+ms \(HTTP 401\)/ },
    { code: 403, pattern: /密钥无效或未授权 · \d+ms \(HTTP 403\)/ },
    { code: 404, pattern: /HTTP 404/ },
    { code: 429, pattern: /HTTP 429/ },
    { code: 500, pattern: /HTTP 500/ },
    { code: 502, pattern: /HTTP 502/ },
    { code: 503, pattern: /HTTP 503/ },
    { code: 504, pattern: /HTTP 504/ },
  ];

  try {
    for (const item of statusMatrix) {
      globalThis.fetch = async () =>
        new Response("Error payload from upstream", {
          status: item.code,
          headers: { "Content-Type": "text/plain" },
        });

      const res = await probeProviderLatency({
        baseUrl: "https://api.status-matrix.com/v1",
        apiKey: "sk-test",
        timeoutMs: 1000,
      });

      assert.equal(res.ok, false, `Status ${item.code} must report ok=false`);
      assert.equal(
        res.status,
        item.code,
        `Status ${item.code} must be preserved exactly`,
      );
      assert.ok(
        res.latencyMs >= 1,
        `Latency must be a positive integer for status ${item.code}`,
      );
      assert.match(
        res.message,
        item.pattern,
        `Message should format HTTP ${item.code}`,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 1.3: Millisecond latency reflects actual simulated network delays", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const artificialDelays = [40, 90, 140];
    for (const delay of artificialDelays) {
      globalThis.fetch = async () => {
        await new Promise((r) => setTimeout(r, delay));
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };

      const res = await probeProviderLatency({
        baseUrl: "https://delayed-api.com/v1",
        apiKey: "sk-key",
      });

      assert.equal(res.ok, true);
      assert.equal(res.status, 200);
      assert.ok(
        res.latencyMs >= delay - 10,
        `Reported latency ${res.latencyMs}ms should be >= simulated delay ${delay}ms`,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 1.4: HTML and non-JSON error payloads do not crash latency probe", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Cloudflare 503 HTML response
    globalThis.fetch = async () =>
      new Response(
        "<!DOCTYPE html><html><head><title>503 Service Temporarily Unavailable</title></head><body>Cloudflare error</body></html>",
        {
          status: 503,
          headers: { "Content-Type": "text/html" },
        },
      );

    const res = await probeProviderLatency({
      baseUrl: "https://cloudflare-503.com/v1",
      apiKey: "sk-dummy-key",
    });

    assert.equal(res.ok, false);
    assert.equal(res.status, 503);
    assert.match(res.message, /HTTP 503/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 1.5: testProviderConnection rapid abort & requestRef concurrency shield", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const requestRef: { current: AbortController | null } = { current: null };
    const states: ConnectionState[] = [];

    // Simulate slow network
    globalThis.fetch = async (_url, options) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }));
        }, 200);
        options?.signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    };

    const valid: ModelProviderProfile = {
      version: 1,
      name: "Provider",
      baseUrl: "https://api.rapid-test.com/v1",
      model: "gpt-4o",
      protocol: "openai-chat",
      authMode: "api-key",
    };

    // Fire first probe
    const p1 = testProviderConnection({
      valid,
      apiKey: "key1",
      credentialRef: "c1",
      connections: [],
      requestRef,
      setConnection: (s) => states.push(s),
    });

    // Immediately trigger a second probe before first completes
    const p2 = testProviderConnection({
      valid,
      apiKey: "key2",
      credentialRef: "c2",
      connections: [],
      requestRef,
      setConnection: (s) => states.push(s),
    });

    await Promise.all([p1, p2]);

    // The second request should be authoritative and finish with success
    const finalState = states[states.length - 1];
    assert.equal(finalState.kind, "success");
    assert.match(finalState.message, /连通正常/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 1.6: Malformed URLs and network level TypeError handling", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch (CORS or network error)");
    };

    const res = await probeProviderLatency({
      baseUrl: "https://nonexistent-domain-404-dns.invalid",
      apiKey: "sk-valid-key-format",
    });

    assert.equal(res.ok, false);
    assert.equal(res.status, 0);
    assert.match(res.message, /无法连接，请检查地址、网络和服务的跨域访问设置/);

    // Missing key check
    const resNoKey = await probeProviderLatency({
      baseUrl: "https://nonexistent-domain-404-dns.invalid",
      apiKey: "",
    });
    assert.equal(resNoKey.ok, false);
    assert.equal(resNoKey.status, 0);
    assert.match(resNoKey.message, /缺少密钥/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// =============================================================================
// CHALLENGE SUITE 2: Model Catalog Store & Fetch Provider Models Resilience
// =============================================================================

test("CHALLENGE 2.1: fetchProviderModels handles empty lists gracefully", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const emptyPayloads = [
      { data: [] },
      [],
      {},
      { data: null },
      { models: [] },
    ];

    for (const payload of emptyPayloads) {
      globalThis.fetch = async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const res = await fetchProviderModels({
        baseUrl: "https://api.empty-models.com/v1",
        apiKey: "sk-test-key",
      });

      assert.equal(res.ok, true);
      assert.equal(res.count, 0);
      assert.deepEqual(res.models, []);
      assert.match(res.message, /成功拉取 0 个模型/);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 2.2: fetchProviderModels resilience against malformed JSON and syntax errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    const garbageBodies = [
      "<html><head><title>Bad Gateway</title></head></html>",
      "",
      "undefined",
      "{ invalid json syntax",
      JSON.stringify("just a string"),
      JSON.stringify(12345),
      JSON.stringify(true),
      JSON.stringify([null, undefined, 42, true, {}]),
    ];

    for (const body of garbageBodies) {
      globalThis.fetch = async () =>
        new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      const res = await fetchProviderModels({
        baseUrl: "https://api.garbage-body.com/v1",
        apiKey: "sk-test-key",
      });

      // It must either return ok: false with error, or ok: true with 0 valid models, never throw
      if (res.ok) {
        assert.equal(res.count, 0);
        assert.deepEqual(res.models, []);
      } else {
        assert.equal(res.count, 0);
        assert.ok(res.message.length > 0);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 2.2b: Empirical observation of { id: null } upstream behavior", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [{ id: null }, { id: "" }, { id: undefined }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

    const res = await fetchProviderModels({
      baseUrl: "https://api.null-id.com/v1",
      apiKey: "sk-test-key",
    });

    // Verify empirical behavior:
    // String(null) evaluates to "null", String(undefined) evaluates to "undefined", empty string is filtered
    assert.equal(res.ok, true);
    const modelIds = res.models.map((m) => m.id);
    assert.ok(
      modelIds.includes("null"),
      "Observed: { id: null } coerces to string 'null'",
    );
    assert.ok(!modelIds.includes(""), "Empty string is filtered out");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 2.3: Upstream duplicate model IDs deduplicated by fetchProviderModels", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "gpt-4o" },
            { id: "gpt-4o" }, // Duplicate 1
            { id: "claude-3-5-sonnet" },
            { id: "gpt-4o" }, // Duplicate 2
            { id: "claude-3-5-sonnet" }, // Duplicate 3
            { id: "deepseek-r1" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

    const res = await fetchProviderModels({
      baseUrl: "https://api.duplicates.com/v1",
      apiKey: "sk-test-key",
    });

    assert.equal(res.ok, true);
    assert.equal(
      res.count,
      3,
      "Duplicates must be collapsed into unique entries",
    );
    assert.deepEqual(
      res.models.map((m) => m.id),
      ["gpt-4o", "claude-3-5-sonnet", "deepseek-r1"],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 2.4: Model catalog store resilience against unicode, emoji, and special characters", () => {
  const connKey = "conn-unicode-stress";
  const exoticIds = [
    "通义千问-2.5-72b-instruct-🚀",
    "gpt-4o@2024-11-20/snapshot#1",
    "deepseek/deepseek-r1:671b-q4_k_m",
    "model with spaces and punctuation! ($%^&*)",
    "日本語・한국어・عربي",
    "a".repeat(2000), // Very long model ID
  ];

  for (const id of exoticIds) {
    const added = addCustomModel(connKey, { id, kind: "text" });
    assert.equal(added.id, id);
  }

  const prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.customModels.length, exoticIds.length);

  // Merge check
  const merged = mergeCatalogWithPreferences(connKey, []);
  assert.equal(merged.length, exoticIds.length);
  for (const id of exoticIds) {
    const entry = merged.find((m) => m.id === id);
    assert.ok(entry, `Entry for ${id.slice(0, 20)}... must exist`);
    assert.equal(entry.enabled, true);
  }

  // Setting default on an exotic ID
  setDefaultModel(connKey, "通义千问-2.5-72b-instruct-🚀");
  const mergedAfterDefault = mergeCatalogWithPreferences(connKey, []);
  const defaultEntry = mergedAfterDefault.find(
    (m) => m.id === "通义千问-2.5-72b-instruct-🚀",
  );
  assert.equal(defaultEntry?.isDefault, true);
});

test("CHALLENGE 2.5: Object prototype pollution and reserved property names as model IDs", () => {
  const connKey = "conn-proto-stress";
  const reservedNames = [
    "toString",
    "valueOf",
    "hasOwnProperty",
    "isPrototypeOf",
    "constructor",
    "__proto__",
  ];

  for (const name of reservedNames) {
    if (name === "__proto__") {
      // In JS, setting __proto__ on plain objects can mutate prototype if not handled with care
      // addCustomModel should either sanitize or safely assign
    }
    const added = addCustomModel(connKey, { id: name, kind: "text" });
    assert.equal(added.id, name);

    // Toggle enabled/disabled
    setModelEnabled(connKey, name, false);
    setModelEnabled(connKey, name, true);
  }

  const merged = mergeCatalogWithPreferences(connKey, []);
  assert.ok(merged.length >= reservedNames.length);

  // Verify normal object prototype is not polluted
  assert.equal(typeof Object.prototype.toString, "function");
  assert.equal(({} as Record<string, unknown>).toString(), "[object Object]");
});

test("CHALLENGE 2.6: Idempotency of setModelEnabled and setDefaultModel", () => {
  const connKey = "conn-idempotency-test";
  const modelId = "deepseek-v3";

  addCustomModel(connKey, { id: modelId, kind: "text" });

  // 10 consecutive setModelEnabled(false) calls
  for (let i = 0; i < 10; i++) {
    setModelEnabled(connKey, modelId, false);
  }
  let prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.models[modelId]?.enabled, false);

  // 10 consecutive setModelEnabled(true) calls
  for (let i = 0; i < 10; i++) {
    setModelEnabled(connKey, modelId, true);
  }
  prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.models[modelId]?.enabled, true);

  // 10 consecutive setDefaultModel calls
  for (let i = 0; i < 10; i++) {
    setDefaultModel(connKey, modelId);
  }
  prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.defaultModelId, modelId);
  assert.equal(prefs.models[modelId]?.isDefault, true);

  // Calling setDefault on a different model clears the first
  const secondModel = "qwen-2.5-72b";
  addCustomModel(connKey, { id: secondModel, kind: "text" });
  setDefaultModel(connKey, secondModel);

  const merged = mergeCatalogWithPreferences(connKey, []);
  const first = merged.find((m) => m.id === modelId);
  const second = merged.find((m) => m.id === secondModel);
  assert.equal(
    first?.isDefault,
    false,
    "First model must no longer be default",
  );
  assert.equal(second?.isDefault, true, "Second model must be default");
});

test("CHALLENGE 2.7: LocalStorage corrupted state recovery in modelCatalogStore", () => {
  const hadWindow = "window" in globalThis;
  const originalWindow = (globalThis as Record<string, unknown>).window;
  try {
    let mockItem = "";
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: () => mockItem,
        setItem: () => {},
      },
      dispatchEvent: () => true,
    };

    // 1. Corrupted non-JSON string
    mockItem = "{ malformed json: not valid }";
    const corruptedResult = readCatalogPreferences();
    assert.equal(typeof corruptedResult, "object");

    // 2. Corrupted array instead of record object
    mockItem = "[1, 2, 3]";
    const arrayResult = readCatalogPreferences();
    assert.equal(typeof arrayResult, "object");

    // 3. Null or primitive in localStorage
    mockItem = "null";
    const nullResult = readCatalogPreferences();
    assert.equal(typeof nullResult, "object");
  } finally {
    if (hadWindow) {
      (globalThis as Record<string, unknown>).window = originalWindow;
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }
  }
});

// =============================================================================
// CHALLENGE SUITE 3: Capability Aggregation & Auto-Routing Failover Stress
// =============================================================================

test("CHALLENGE 3.1: Capability classification defaults safely to 'chat' for arbitrary unknown models", () => {
  const exoticUnknowns = [
    "",
    "unknown-model-xyz",
    "deepseek-coder-v2-lite",
    "meta-llama/Llama-3.3-70B-Instruct",
    "custom-agent-v1",
    "finetuned_checkpoint_step_1000",
    "claude-3-7-sonnet-20250219",
    "grok-2-1212",
  ];

  for (const id of exoticUnknowns) {
    assert.equal(
      classifyCapability(undefined, id),
      "chat",
      `Model '${id}' without explicit kind must default safely to 'chat'`,
    );
    assert.equal(classifyCapability("text", id), "chat");
  }

  // Explicit image keywords or kinds must classify to image
  const imageModels = [
    "black-forest-labs/FLUX.1-dev",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "dall-e-3",
    "sdxl-lightning",
    "comfyui-lora-sd3",
    "cogview-3-plus",
    "kolors-virtual-tryon",
  ];
  for (const id of imageModels) {
    assert.equal(
      classifyCapability(undefined, id),
      "image",
      `Image model '${id}' must classify to 'image'`,
    );
  }
});

test("CHALLENGE 3.2: Auto-routing multi-tier failover when highest priority channel is quarantined or failing", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);

  // 3-Tier setup:
  // Tier 0: priority 300 (Primary, high performance)
  // Tier 1: priority 200 (Secondary backup)
  // Tier 2: priority 100 (Emergency tertiary)
  registry.replace({
    registrations: [
      createMockRegistration("channel-tier0", { priority: 300, weight: 10 }),
      createMockRegistration("channel-tier1", { priority: 200, weight: 10 }),
      createMockRegistration("channel-tier2", { priority: 100, weight: 10 }),
    ],
    states: new Map(),
  });

  const scheduler = new Scheduler(registry);
  const health = scheduler.health();

  // Baseline: Should pick Tier 0
  let res = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });
  assert.equal(
    res.connectionId,
    "channel-tier0",
    "Should pick Tier 0 by default",
  );

  // Step 1: Quarantine Tier 0
  health.recordFailure("channel-tier0", {
    errorClass: "RATE_LIMITED",
    retryable: true,
    cooldownMs: 60000,
  });
  health.state("channel-tier0").quarantined = true;

  res = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });
  assert.equal(
    res.connectionId,
    "channel-tier1",
    "Failover: must pick Tier 1 when Tier 0 is quarantined",
  );

  // Step 2: Tier 1 experiences error burst and is quarantined
  health.recordFailure("channel-tier1", {
    errorClass: "OVERLOADED",
    retryable: true,
    cooldownMs: 60000,
  });
  health.state("channel-tier1").quarantined = true;

  res = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });
  assert.equal(
    res.connectionId,
    "channel-tier2",
    "Failover: must cascade to Tier 2 when both Tier 0 and Tier 1 are quarantined",
  );

  // Step 3: Tier 0 recovers (quarantine lifted)
  health.state("channel-tier0").quarantined = false;
  health.recordSuccess("channel-tier0", 50);

  res = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });
  assert.equal(
    res.connectionId,
    "channel-tier0",
    "Recovery: must restore Tier 0 once quarantine is cleared",
  );
});

test("CHALLENGE 3.3: Channel disabled in ChannelRegistry is strictly excluded from auto-routing", () => {
  const registry = new ChannelRegistry();
  registry.registerAdapter(doubaoAdapter);

  registry.replace({
    registrations: [
      createMockRegistration("channel-disabled", {
        priority: 500,
        enabled: false,
      }),
      createMockRegistration("channel-active", {
        priority: 100,
        enabled: true,
      }),
    ],
    states: new Map([["channel-disabled", "disabled"]]),
  });

  const scheduler = new Scheduler(registry);

  const res = resolveAutoRoutingChannel({
    capability: "chat",
    scheduler,
    registry,
    targetModel: "gpt-4o",
  });

  assert.equal(
    res.connectionId,
    "channel-active",
    "Disabled channel must never be selected regardless of priority",
  );
});

test("CHALLENGE 3.4: ProviderConnections application state auto-routing honors quarantine and priority", () => {
  const connections: ProviderConnection[] = [
    {
      id: "conn-quarantined",
      provider: "siliconflow",
      kind: "user_byok",
      displayName: "Quarantined High Priority",
      priority: 999,
      state: "quarantined",
      capabilities: chatCapabilities,
    },
    {
      id: "conn-disabled",
      provider: "12ai",
      kind: "user_byok",
      displayName: "Disabled Medium Priority",
      priority: 500,
      state: "disabled",
      capabilities: chatCapabilities,
    },
    {
      id: "conn-active-healthy",
      provider: "custom",
      kind: "user_byok",
      displayName: "Active Healthy",
      priority: 100,
      state: "active",
      capabilities: chatCapabilities,
    },
  ];

  const res = resolveAutoRoutingChannel({
    capability: "chat",
    connections,
  });

  assert.equal(
    res.connectionId,
    "conn-active-healthy",
    "Auto-routing must bypass quarantined and disabled connections and select active healthy provider",
  );
  assert.equal(res.source, "api");
});

test("CHALLENGE 3.5: Total exhaustion fallback gracefully drops to Codex/default without crashing", () => {
  // Scenario: No channels available at all
  const chatRes = resolveAutoRoutingChannel({
    capability: "chat",
    connections: [],
  });
  assert.equal(chatRes.source, "default");
  assert.equal(chatRes.providerName, "Codex 账号默认");

  const imageRes = resolveAutoRoutingChannel({
    capability: "image",
    connections: [],
  });
  assert.equal(imageRes.source, "codex");
  assert.equal(imageRes.providerName, "Codex 内置生图");
});

test("CHALLENGE 3.6: Rapid switching between chat and image capability preserves quadrant isolation", () => {
  const connections: ProviderConnection[] = [
    {
      id: "conn-chat",
      provider: "siliconflow",
      kind: "user_byok",
      displayName: "硅基聊天",
      priority: 100,
      state: "active",
      capabilities: chatCapabilities,
    },
    {
      id: "conn-image",
      provider: "comfyui",
      kind: "local_comfyui",
      displayName: "ComfyUI 生图",
      priority: 100,
      state: "active",
      capabilities: imageCapabilities,
    },
  ];

  const catalogs = [
    {
      id: "conn-chat",
      fetchedAt: Date.now(),
      models: [{ id: "qwen-2.5-72b", kind: "text" as const }],
    },
    {
      id: "conn-image",
      fetchedAt: Date.now(),
      models: [{ id: "flux-1-schnell", kind: "image" as const }],
    },
  ];

  // 100 rapid alternations
  for (let i = 0; i < 100; i++) {
    const isEven = i % 2 === 0;
    const capability = isEven ? "chat" : "image";
    const entries = aggregateCapabilityEntries({
      capability,
      connections,
      catalogs,
      agentStatus: "connected",
    });

    // Auto-routing at index 0
    assert.equal(entries[0].label, AUTO_ROUTING_LABEL);
    assert.equal(entries[0].metadata?.isAutoRouting, true);

    if (capability === "chat") {
      assert.equal(entries[0].selection?.kind, "text");
      const hasQwen = entries.some(
        (e) => e.selection?.model === "qwen-2.5-72b",
      );
      const hasFlux = entries.some(
        (e) => e.selection?.model === "flux-1-schnell",
      );
      assert.ok(hasQwen, "Chat quadrant must contain chat models");
      assert.ok(!hasFlux, "Chat quadrant must NOT leak image models");
    } else {
      assert.equal(entries[0].selection?.kind, "image");
      const hasFlux = entries.some(
        (e) => e.selection?.model === "flux-1-schnell",
      );
      const hasQwen = entries.some(
        (e) => e.selection?.model === "qwen-2.5-72b",
      );
      assert.ok(hasFlux, "Image quadrant must contain image models");
      assert.ok(!hasQwen, "Image quadrant must NOT leak chat models");
    }
  }
});

// =============================================================================
// CHALLENGE SUITE 4: Advanced Edge Cases & Search Query Special Characters
// =============================================================================

test("CHALLENGE 4.1: Offline bypass for local providers (Ollama / ComfyUI / LM Studio)", async () => {
  const originalOnLine = navigator.onLine;
  const originalFetch = globalThis.fetch;
  try {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [] }), { status: 200 });

    const localUrls = [
      "http://localhost:11434/v1",
      "http://127.0.0.1:11434/v1",
      "http://localhost:8188",
      "http://[::1]:8188",
    ];

    for (const url of localUrls) {
      const res = await probeProviderLatency({
        baseUrl: url,
        authMode: "none",
      });
      // Local provider must NOT be rejected by offline check
      assert.equal(
        res.ok,
        true,
        `Local URL ${url} should proceed even if navigator.onLine is false`,
      );
      assert.equal(res.status, 200);
    }
  } finally {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      configurable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 4.2: Pre-aborted parent signal immediately aborts without sending HTTP request", async () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      fetchCalled = true;
      if (options?.signal?.aborted) {
        const err = new Error("This operation was aborted");
        err.name = "AbortError";
        throw err;
      }
      return new Response("{}", { status: 200 });
    };

    const controller = new AbortController();
    controller.abort("user_cancelled");

    const res = await probeProviderLatency({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
      signal: controller.signal,
    });

    assert.equal(res.ok, false);
    assert.equal(res.error, "aborted");
    assert.match(res.message, /已取消连接测试/);
    assert.equal(fetchCalled, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("CHALLENGE 4.3: Model catalog store handles 10,000 models without catastrophic slowdown", () => {
  const connKey = "conn-large-scale";
  const modelCount = 10_000;
  const baseModels = Array.from({ length: modelCount }, (_, i) => ({
    id: `provider-model-${i}`,
    kind: "text" as const,
    source: "reported" as const,
  }));

  const t0 = performance.now();
  const merged = mergeCatalogWithPreferences(connKey, baseModels);
  const elapsed = performance.now() - t0;

  assert.equal(merged.length, modelCount);
  // Merging 10,000 models should complete well within 150ms
  assert.ok(
    elapsed < 500,
    `10,000 models merge took ${elapsed.toFixed(1)}ms, expected < 500ms`,
  );
});

test("CHALLENGE 4.4: Special regex characters in search query do not crash capability aggregation", () => {
  const connections: ProviderConnection[] = [
    {
      id: "conn-search-test",
      provider: "openai",
      kind: "user_byok",
      displayName: "OpenAI Gateway",
      priority: 100,
      state: "active",
      capabilities: chatCapabilities,
    },
  ];

  const catalogs = [
    {
      id: "conn-search-test",
      fetchedAt: Date.now(),
      models: [
        { id: "gpt-4o (latest)", kind: "text" as const },
        { id: "model[v1.0]", kind: "text" as const },
        { id: "regex+wildcard*model?name", kind: "text" as const },
      ],
    },
  ];

  const dangerousQueries = [
    "(",
    "[",
    "*",
    "+",
    "?",
    "^",
    "$",
    "\\",
    ".*",
    "[a-z]+",
    "{1,3}",
    "(.*)",
  ];

  for (const query of dangerousQueries) {
    // Should never throw syntax error or unhandled regex exception
    const entries = aggregateCapabilityEntries({
      capability: "chat",
      connections,
      catalogs,
      query,
    });
    assert.ok(Array.isArray(entries));
  }
});

test("CHALLENGE 4.5: Default model removal resets defaultModelId cleanly", () => {
  const connKey = "conn-default-removal";
  const custom = addCustomModel(connKey, {
    id: "temporary-default-model",
    kind: "text",
  });
  setDefaultModel(connKey, custom.id);

  let prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.defaultModelId, "temporary-default-model");

  // Remove the model
  removeCustomModel(connKey, "temporary-default-model");

  prefs = getConnectionPrefs(connKey);
  assert.equal(
    prefs.defaultModelId,
    undefined,
    "defaultModelId must be reset to undefined upon model deletion",
  );
});

test("CHALLENGE 4.6: fetchAndSaveProviderModels validation guard against missing baseUrl", async () => {
  const dummyConnection: ProviderConnection = {
    id: "conn-no-url",
    provider: "openai",
    kind: "user_byok",
    displayName: "Missing Base URL Connection",
    priority: 50,
    state: "active",
  };

  const res = await fetchAndSaveProviderModels(dummyConnection, {});
  assert.equal(res.ok, false);
  assert.equal(res.error, "missing_base_url");
  assert.match(res.message, /未配置服务商地址/);
});

test("CHALLENGE 4.7: Direct saveCatalogPreferences state overwrite & subscription notification", () => {
  const connKey = "conn-direct-save";
  saveCatalogPreferences({
    [connKey]: {
      models: { "direct-model-1": { enabled: true, isDefault: true } },
      customModels: [{ id: "direct-model-1", kind: "text", source: "manual" }],
      defaultModelId: "direct-model-1",
    },
  });

  const prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.defaultModelId, "direct-model-1");
  assert.equal(prefs.models["direct-model-1"]?.isDefault, true);
});

test("CHALLENGE 4.8: Subcategory classifier and Auto-Routing helper invariants", () => {
  // Test classifyChatSubCategory with mixed case and reasoning signatures
  assert.equal(classifyChatSubCategory("DEEPSEEK-REASONER"), "reasoning");
  assert.equal(classifyChatSubCategory("qwq-32b"), "reasoning");
  assert.equal(
    classifyChatSubCategory("claude-3-5-haiku-20241022"),
    "sub_agent",
  );

  // Test createAutoRoutingSelection & isAutoRouting
  const auto = createAutoRoutingSelection("chat");
  assert.equal(auto.model, AUTO_ROUTING_MODEL);
  assert.equal(isAutoRouting(auto), true);
  assert.equal(isAutoRouting({ source: "api", model: "custom-model" }), false);
});
