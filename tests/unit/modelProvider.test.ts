import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedProviderUrl } from "../../src/domain/providerUrl.ts";
import {
  DEFAULT_MODEL_PROVIDER,
  PROVIDER_PRESETS,
  findProviderPreset,
  parseModelProvider,
  serializeModelProvider,
} from "../../src/domain/modelProvider.ts";

test("provider presets expose the Doubao Ark preset with a valid HTTPS base url", () => {
  const preset = findProviderPreset("doubao-ark");
  assert.ok(preset, "doubao-ark preset should exist");
  assert.equal(preset!.label, "豆包（火山方舟）");
  assert.equal(preset!.baseUrl, "https://ark.cn-beijing.volces.com/api/v3");
  assert.match(preset!.baseUrl, /^https:\/\//i);
});

test("unknown preset id resolves to undefined and every preset id is unique", () => {
  assert.equal(findProviderPreset("does-not-exist"), undefined);
  const ids = PROVIDER_PRESETS.map((preset) => preset.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const preset of PROVIDER_PRESETS) {
    assert.ok(preset.name.length > 0, "preset name must not be empty");
    if (preset.baseUrl) assert.ok(isAllowedProviderUrl(preset.baseUrl));
    else
      assert.ok(
        ["new-api", "azure-openai"].includes(preset.id),
        "Only instance-specific presets may omit an endpoint",
      );
    for (const link of [preset.website, preset.keyUrl, preset.docsUrl]) {
      const url = new URL(link);
      assert.equal(url.protocol, "https:");
      assert.equal(url.username + url.password, "");
    }
  }
});

test("unsupported protocols cannot be applied as Chat presets and gateway requires a user endpoint", () => {
  for (const id of [
    "openai-responses",
    "anthropic",
    "gemini",
    "azure-openai",
    "ollama",
  ])
    assert.ok(findProviderPreset(id)?.unavailableReason);
  assert.equal(findProviderPreset("new-api")?.baseUrl, "");
  assert.equal(
    findProviderPreset("lm-studio")?.baseUrl,
    "http://127.0.0.1:1234/v1",
  );
  assert.equal(isAllowedProviderUrl("http://api.example.com/v1"), false);
});

test("default provider profile remains OpenAI-compatible for existing users", () => {
  assert.equal(DEFAULT_MODEL_PROVIDER.name, "OpenAI 兼容 API");
  assert.equal(DEFAULT_MODEL_PROVIDER.baseUrl, "https://api.openai.com/v1");
  assert.equal(DEFAULT_MODEL_PROVIDER.model, "");
});

test("provider profile round-trip preserves a selected opaque account identity", () => {
  const profile = { ...DEFAULT_MODEL_PROVIDER, connectionId: "account-b" };
  assert.deepEqual(parseModelProvider(serializeModelProvider(profile)), {
    profile,
    recovered: false,
  });
  assert.deepEqual(
    parseModelProvider(serializeModelProvider(DEFAULT_MODEL_PROVIDER)).profile,
    DEFAULT_MODEL_PROVIDER,
  );
});
