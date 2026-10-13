import assert from "node:assert/strict";
import test from "node:test";
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
  for (const preset of PROVIDER_PRESETS) {
    assert.ok(preset.name.length > 0, "preset name must not be empty");
    assert.equal(
      modelProviderSchema.safeParse({ version: 1, ...preset, model: "" })
        .success,
      true,
      "preset URL and explicit local authentication must obey the provider contract",
    );
  }
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
