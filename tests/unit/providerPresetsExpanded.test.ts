import assert from "node:assert/strict";
import test from "node:test";
import {
  PROVIDER_PRESETS,
  findProviderPreset,
} from "../../src/domain/providerPresets.ts";

test("PROVIDER_PRESETS 包含全部 54 个国内外服务商预设，且 ID 严格唯一", () => {
  assert.equal(PROVIDER_PRESETS.length, 54);
  const ids = new Set<string>();
  for (const preset of PROVIDER_PRESETS) {
    assert.ok(preset.id && preset.id.trim(), "预设必须有非空 id");
    assert.equal(ids.has(preset.id), false, `重复的预设 id: ${preset.id}`);
    ids.add(preset.id);
  }
});

test("分类字段 category 仅限于 官方/网关/本地 三种，且数量分布合理", () => {
  const categories = {
    官方: 0,
    网关: 0,
    本地: 0,
  };
  for (const preset of PROVIDER_PRESETS) {
    assert.ok(
      preset.category in categories,
      `非法 category: ${preset.category}`,
    );
    categories[preset.category]++;
  }
  assert.equal(categories["官方"], 36); // 13 国内 + 23 国际
  assert.equal(categories["网关"], 11);
  assert.equal(categories["本地"], 7);
});

test("国内官方服务商包含 DeepSeek, Kimi, 智谱, 阿里百炼, 腾讯混元等主流渠道", () => {
  const domesticOfficialIds = [
    "deepseek",
    "moonshot",
    "zhipu",
    "dashscope",
    "doubao-ark",
    "hunyuan",
    "qianfan",
    "minimax",
    "stepfun",
    "lingyiwanwu",
    "baichuan",
    "xfyun-spark",
    "sensenova",
  ];
  for (const id of domesticOfficialIds) {
    const preset = findProviderPreset(id);
    assert.ok(preset, `必须包含国内官方预设: ${id}`);
    assert.equal(preset.category, "官方");
    assert.equal(preset.region, "domestic");
    assert.ok(preset.baseUrl.startsWith("https://"));
    assert.ok(preset.website.startsWith("https://"));
  }
});

test("国际官方服务商包含 OpenAI, Anthropic, Gemini, Bedrock, Mistral, Groq 等主流渠道", () => {
  const globalOfficialIds = [
    "openai",
    "openai-responses",
    "anthropic",
    "gemini",
    "azure-openai",
    "bedrock",
    "mistral",
    "cohere",
    "groq",
    "perplexity",
    "together",
    "fireworks",
    "deepinfra",
    "cerebras",
    "sambanova",
    "xai",
    "lepton",
    "novita",
    "upstage",
    "ai21",
    "replicate",
    "cloudflare-workers-ai",
    "github-models",
  ];
  for (const id of globalOfficialIds) {
    const preset = findProviderPreset(id);
    assert.ok(preset, `必须包含国际官方预设: ${id}`);
    assert.equal(preset.category, "官方");
    assert.equal(preset.region, "international");
  }
});

test("网关渠道包含 OpenRouter, New API, One API, Sub2API 等", () => {
  const gatewayIds = [
    "12ai",
    "siliconflow",
    "openrouter",
    "new-api",
    "one-api",
    "sub2api",
    "opencode-zen",
    "opencode-go",
    "aihubmix",
    "packy-api",
    "360-ai",
  ];
  for (const id of gatewayIds) {
    const preset = findProviderPreset(id);
    assert.ok(preset, `必须包含网关预设: ${id}`);
    assert.equal(preset.category, "网关");
  }
});

test("本地离线渠道包含 LM Studio, Ollama, LocalAI, vLLM, Jan, ComfyUI 且为免密访问", () => {
  const localIds = [
    "lm-studio",
    "ollama",
    "llama-cpp",
    "localai",
    "vllm",
    "jan",
    "comfyui",
  ];
  const localPresets = PROVIDER_PRESETS.filter((p) => p.category === "本地");
  assert.equal(localPresets.length, 7);
  assert.deepEqual(
    localPresets.map((p) => p.id),
    localIds,
  );
  for (const preset of localPresets) {
    assert.equal(preset.authMode, "none");
    assert.ok(
      preset.baseUrl.startsWith("http://127.0.0.1:") ||
        preset.baseUrl.startsWith("http://localhost:"),
    );
  }
});

test("findProviderPreset 准确检索目标服务商或在未命中时返回 undefined", () => {
  assert.equal(findProviderPreset("deepseek")?.name, "DeepSeek (深度求索)");
  assert.equal(findProviderPreset("anthropic")?.name, "Anthropic");
  assert.equal(findProviderPreset("non-existent-provider"), undefined);
  assert.equal(findProviderPreset(undefined), undefined);
});

test("预设库中所有字段绝不泄露 API Key 明文或凭据片段", () => {
  const secretPattern =
    /(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+\S+|ey[A-Za-z0-9_-]{10,})/i;
  for (const preset of PROVIDER_PRESETS) {
    const serialized = JSON.stringify(preset);
    assert.equal(secretPattern.test(serialized), false);
  }
});

test("DashScope 预设 keyUrl 不含 ?apiKey= 查询参数且全量预设通过凭据扫描", () => {
  const dashscope = findProviderPreset("dashscope");
  assert.ok(dashscope, "必须存在 dashscope 预设");
  assert.equal(dashscope.keyUrl, "https://bailian.console.aliyun.com/");
  assert.equal(dashscope.keyUrl.includes("apiKey="), false);

  const credentialPatterns = [
    /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[:=]/i,
    /sk-[A-Za-z0-9_-]{12,}/,
    /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
    /(?:Bearer|Basic)\s+[A-Za-z0-9+/._-]{16,}/i,
  ];

  for (const preset of PROVIDER_PRESETS) {
    const text = JSON.stringify(preset);
    for (const pattern of credentialPatterns) {
      assert.equal(
        pattern.test(text),
        false,
        `预设 ${preset.id} 命中了凭据检测特征: ${pattern}`,
      );
    }
  }
});
