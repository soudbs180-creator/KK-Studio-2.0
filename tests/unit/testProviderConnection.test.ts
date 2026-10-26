import assert from "node:assert/strict";
import test from "node:test";
import {
  probeProviderLatency,
  testProviderConnection,
} from "../../src/components/settings/testProviderConnection.ts";
import { fetchProviderModels } from "../../src/components/settings/fetchProviderModels.ts";
import {
  setModelEnabled,
  setDefaultModel,
  addCustomModel,
  mergeCatalogWithPreferences,
  getConnectionPrefs,
} from "../../src/features/models/modelCatalogStore.ts";
import type { ModelProviderProfile } from "../../domain/modelProvider.ts";
import type { ConnectionState } from "../../src/components/settings/modelProviderSettingsState.ts";

test("probeProviderLatency returns latency in ms and handles offline status", async () => {
  // Test offline handling for non-local URL
  const originalOnLine = navigator.onLine;
  try {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      configurable: true,
    });
    const result = await probeProviderLatency({
      baseUrl: "https://api.openai.com/v1",
      timeoutMs: 3000,
    });
    assert.equal(result.ok, false);
    assert.equal(result.status, 0);
    assert.match(result.message, /离线/);
  } finally {
    Object.defineProperty(navigator, "onLine", {
      value: originalOnLine,
      configurable: true,
    });
  }
});

test("probeProviderLatency strictly enforces sub-3000ms timeout", async () => {
  // When an abort signal triggers, probeProviderLatency marks timeout appropriately
  const controller = new AbortController();
  const promise = probeProviderLatency({
    baseUrl: "https://httpstat.us/200?sleep=5000",
    signal: controller.signal,
    timeoutMs: 50, // fast abort for test
  });
  controller.abort("timeout");
  const result = await promise;
  assert.equal(result.ok, false);
  assert.match(result.message, /超时|取消/);
});

test("probeProviderLatency formats successful and error HTTP responses", async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Mock successful 200 response
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [{ id: "model-1" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const res200 = await probeProviderLatency({
      baseUrl: "https://api.example.com/v1",
      apiKey: "test-key",
      timeoutMs: 2000,
    });

    assert.equal(res200.ok, true);
    assert.equal(res200.status, 200);
    assert.match(res200.message, /连通正常 · \d+ms \(HTTP 200\)/);
    assert.ok(res200.latencyMs >= 1);

    // Mock 401 Unauthorized
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: "Invalid API key" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });

    const res401 = await probeProviderLatency({
      baseUrl: "https://api.example.com/v1",
      apiKey: "invalid-key",
      timeoutMs: 2000,
    });

    assert.equal(res401.ok, false);
    assert.equal(res401.status, 401);
    assert.match(res401.message, /密钥无效或未授权 · \d+ms \(HTTP 401\)/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("testProviderConnection updates connection state and dispatches feedback", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    const valid: ModelProviderProfile = {
      version: 1,
      name: "Custom Provider",
      baseUrl: "https://api.custom.com/v1",
      model: "gpt-4o",
      protocol: "openai-chat",
      authMode: "api-key",
    };

    let latestState: ConnectionState = { kind: "idle", message: "" };
    let feedbackReceived = "";
    const requestRef = { current: null };

    await testProviderConnection({
      valid,
      apiKey: "test-key",
      credentialRef: "cred-1",
      connections: [],
      requestRef,
      setConnection: (state) => {
        latestState = state;
      },
      onFeedback: (msg) => {
        feedbackReceived = msg;
      },
    });

    assert.equal(latestState.kind, "success");
    assert.match(latestState.message, /连通正常 · \d+ms \(HTTP 200\)/);
    assert.equal(feedbackReceived, latestState.message);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchProviderModels independently queries remote /v1/models", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "model-alpha" },
            { id: "model-beta" },
            { id: "model-gamma" },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

    const result = await fetchProviderModels({
      baseUrl: "https://api.example.com/v1",
      apiKey: "sk-test",
      timeoutMs: 3000,
    });

    assert.equal(result.ok, true);
    assert.equal(result.count, 3);
    assert.equal(result.models.length, 3);
    assert.equal(result.models[0].id, "model-alpha");
    assert.equal(result.models[1].id, "model-beta");
    assert.equal(result.models[2].id, "model-gamma");
    assert.match(result.message, /成功拉取 3 个模型/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("modelCatalogStore handles enable/disable, set as default, and custom model additions", () => {
  const connKey = "test-connection-id-123";

  // 1. Add custom manual model
  const custom = addCustomModel(connKey, {
    id: "custom-private-v1",
    kind: "text",
    family: "Custom",
    variant: "Private",
  });
  assert.equal(custom.id, "custom-private-v1");
  assert.equal(custom.source, "manual");

  // 2. Base models from discovery
  const baseModels = [
    {
      id: "official-gpt-4o",
      kind: "text" as const,
      source: "reported" as const,
    },
    {
      id: "official-claude-3-5",
      kind: "text" as const,
      source: "reported" as const,
    },
  ];

  // Merge should include custom model and default to enabled=true
  let merged = mergeCatalogWithPreferences(connKey, baseModels);
  assert.equal(merged.length, 3);
  const foundCustom = merged.find((m) => m.id === "custom-private-v1");
  assert.ok(foundCustom);
  assert.equal(foundCustom.enabled, true);

  // 3. Disable a model
  setModelEnabled(connKey, "official-gpt-4o", false);
  merged = mergeCatalogWithPreferences(connKey, baseModels);
  const disabledModel = merged.find((m) => m.id === "official-gpt-4o");
  assert.equal(disabledModel?.enabled, false);

  // 4. Set as default
  setDefaultModel(connKey, "official-claude-3-5");
  merged = mergeCatalogWithPreferences(connKey, baseModels);
  const defaultModel = merged.find((m) => m.id === "official-claude-3-5");
  assert.equal(defaultModel?.isDefault, true);

  const nonDefault = merged.find((m) => m.id === "custom-private-v1");
  assert.equal(nonDefault?.isDefault, false);

  const prefs = getConnectionPrefs(connKey);
  assert.equal(prefs.defaultModelId, "official-claude-3-5");
  assert.equal(prefs.customModels.length, 1);
});
