import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
} from "../../src/domain/providerPresets.ts";

test("PROVIDER_PRESETS contains SiliconFlow categorized as relay/gateway", () => {
  const sf = findProviderPreset("siliconflow");
  assert.ok(sf, "SiliconFlow preset must exist");
  assert.equal(sf.category, "网关");
  assert.equal(sf.baseUrl, "https://api.siliconflow.cn/v1");
  assert.equal(sf.wireProtocol, "openai-chat");
});

test("PROVIDER_PRESETS contains 12ai relay preset with valid properties", () => {
  const p12 = findProviderPreset("12ai");
  assert.ok(p12, "12ai preset must exist");
  assert.equal(p12.category, "网关");
  assert.equal(p12.baseUrl, "https://api.12ai.com/v1");
  assert.equal(p12.wireProtocol, "openai-chat");
  assert.equal(p12.docsUrl, "https://docs.12ai.com");
  assert.ok(p12.recommendedModels && p12.recommendedModels.length > 0);
});

test("PROVIDER_PRESETS contains llama.cpp local runtime preset", () => {
  const llama = findProviderPreset("llama-cpp");
  assert.ok(llama, "llama-cpp preset must exist");
  assert.equal(llama.category, "本地");
  assert.equal(llama.baseUrl, "http://127.0.0.1:8080/v1");
  assert.equal(llama.wireProtocol, "openai-chat");
  assert.equal(llama.authMode, "none");
  assert.ok(llama.docsUrl.length > 0);
});

test("all presets have valid structure, category and URLs", () => {
  assert.ok(PROVIDER_PRESETS.length >= 30);
  const categories = new Set(["官方", "网关", "本地"]);
  for (const preset of PROVIDER_PRESETS) {
    assert.ok(preset.id, `Preset should have id: ${JSON.stringify(preset)}`);
    assert.ok(preset.label, `Preset ${preset.id} should have label`);
    assert.ok(preset.name, `Preset ${preset.id} should have name`);
    assert.ok(
      categories.has(preset.category),
      `Preset ${preset.id} invalid category ${preset.category}`,
    );
    if (preset.baseUrl) {
      assert.ok(
        preset.baseUrl.startsWith("http://") ||
          preset.baseUrl.startsWith("https://"),
        `Preset ${preset.id} baseUrl should start with http: ${preset.baseUrl}`,
      );
    }
  }
});

test("findProviderPreset retrieves expected presets or returns undefined", () => {
  assert.equal(findProviderPreset("non-existent-id"), undefined);
  assert.equal(findProviderPreset(undefined), undefined);
  const deepseek = findProviderPreset("deepseek");
  assert.ok(deepseek);
  assert.equal(deepseek.category, "官方");
});
