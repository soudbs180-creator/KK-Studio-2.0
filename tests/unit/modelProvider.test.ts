import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MODEL_PROVIDER,
  PROVIDER_PRESETS,
  findProviderPreset,
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
    assert.match(preset.baseUrl, /^https:\/\//i, "preset url must be https");
  }
});

test("default provider profile remains OpenAI-compatible for existing users", () => {
  assert.equal(DEFAULT_MODEL_PROVIDER.name, "OpenAI 兼容 API");
  assert.equal(DEFAULT_MODEL_PROVIDER.baseUrl, "https://api.openai.com/v1");
  assert.equal(DEFAULT_MODEL_PROVIDER.model, "");
});
