import assert from "node:assert/strict";
import test from "node:test";
import { parseSettings, serializeSettings } from "../../src/domain/settings.ts";
import {
  getModelsEndpoint,
  parseModelProvider,
  serializeModelProvider,
} from "../../src/domain/modelProvider.ts";
import { providerConnectionSchema } from "../../src/domain/providerConnections.ts";

test("broken browser data recovers to usable defaults", () => {
  const result = parseSettings("{not valid json");
  assert.equal(result.recovered, true);
  assert.equal(result.preferences.theme, "dark");
  assert.equal(result.preferences.floatingLayout, true);
});

test("invalid preference values cannot reach the interface", () => {
  const result = parseSettings(
    JSON.stringify({
      version: 1,
      language: "zh-CN",
      theme: "sepia",
      floatingLayout: "false",
      removeWatermark: true,
    }),
  );
  assert.equal(result.recovered, true);
  assert.equal(result.preferences.theme, "dark");
  assert.equal(typeof result.preferences.floatingLayout, "boolean");
});

test("saved preferences restore user choices after reload", () => {
  const saved = serializeSettings({
    version: 1,
    language: "zh-CN",
    theme: "system",
    floatingLayout: false,
    removeWatermark: false,
  });
  assert.deepEqual(parseSettings(saved), {
    recovered: false,
    preferences: {
      version: 1,
      language: "zh-CN",
      theme: "system",
      floatingLayout: false,
      removeWatermark: false,
    },
  });
});

test("unknown fields including secrets are excluded from exported preferences", () => {
  const parsed = parseSettings(
    JSON.stringify({
      version: 1,
      language: "zh-CN",
      theme: "light",
      floatingLayout: true,
      removeWatermark: false,
      apiKey: "not-a-real-secret",
    }),
  );
  const exported = serializeSettings(parsed.preferences);
  assert.equal(exported.includes("apiKey"), false);
  assert.equal(exported.includes("not-a-real-secret"), false);
  assert.equal(parsed.preferences.theme, "light");
});

test("newer unsupported storage versions recover without accepting an incompatible schema", () => {
  const result = parseSettings(
    JSON.stringify({
      version: 100,
      language: "zh-CN",
      theme: "light",
      floatingLayout: false,
      removeWatermark: false,
    }),
  );
  assert.equal(result.recovered, true);
  assert.equal(result.preferences.version, 1);
});

test("first visit starts with defaults without reporting data damage", () => {
  assert.equal(parseSettings(null).recovered, false);
  assert.equal(parseSettings(null).preferences.language, "zh-CN");
});

test("model provider accepts loopback HTTP links and normalizes the models endpoint", () => {
  const raw = serializeModelProvider({
    version: 1,
    name: "本地模型",
    baseUrl: "http://127.0.0.1:11434/v1/",
    model: "qwen3",
  });
  const parsed = parseModelProvider(raw);
  assert.equal(parsed.recovered, false);
  assert.equal(
    getModelsEndpoint(parsed.profile.baseUrl),
    "http://127.0.0.1:11434/v1/models",
  );
  assert.equal(raw.includes("apiKey"), false);
});

test("model provider rejects remote HTTP links before an API key can be sent", () => {
  const parsed = parseModelProvider(
    JSON.stringify({
      version: 1,
      name: "远程明文服务",
      baseUrl: "http://models.example.test/v1",
      model: "image-test",
    }),
  );
  assert.equal(parsed.recovered, true);
  assert.equal(parsed.profile.baseUrl, "https://api.openai.com/v1");
});

test("provider connection records reject remote HTTP links", () => {
  const parsed = providerConnectionSchema.safeParse({
    id: "byok-remote",
    provider: "Remote",
    kind: "user_byok",
    displayName: "Remote",
    baseUrl: "http://models.example.test/v1",
    credentialRef: "provider-key",
    capabilities: {
      modalities: ["image"],
      operations: ["generate"],
      async: false,
    },
    state: "active",
    concurrencyLimit: 1,
  });
  assert.equal(parsed.success, false);
});

test("model provider rejects non-network protocols", () => {
  const parsed = parseModelProvider(
    JSON.stringify({
      version: 1,
      name: "危险地址",
      baseUrl: "file:///tmp/models",
      model: "",
    }),
  );
  assert.equal(parsed.recovered, true);
  assert.equal(parsed.profile.baseUrl, "https://api.openai.com/v1");
});
