import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedProviderUrl } from "../../src/domain/providerUrl.ts";
import {
  DEFAULT_MODEL_PROVIDER,
  PROVIDER_PRESETS,
  findProviderPreset,
  modelProviderSchema,
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
  for (const preset of PROVIDER_PRESETS.filter((item) => item.baseUrl)) {
    assert.ok(preset.name.length > 0, "preset name must not be empty");
    assert.equal(
      modelProviderSchema.safeParse({
        version: 1,
        name: preset.name,
        baseUrl: preset.baseUrl,
        protocol: preset.wireProtocol,
        authMode: preset.authMode,
        model: "",
      }).success,
      true,
      "preset URL and explicit local authentication must obey the provider contract",
    );
  }
});

test("presets select explicit supported protocols including Gemini", () => {
  for (const id of [
    "openai-responses",
    "anthropic",
    "azure-openai",
    "ollama",
  ]) {
    assert.equal(findProviderPreset(id)?.wireProtocol, id);
    assert.equal(findProviderPreset(id)?.unavailableReason, undefined);
  }
  assert.equal(findProviderPreset("gemini")?.wireProtocol, "gemini");
  assert.equal(findProviderPreset("gemini")?.unavailableReason, undefined);
  assert.equal(findProviderPreset("ollama")?.authMode, "none");
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
