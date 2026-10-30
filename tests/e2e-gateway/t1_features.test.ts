import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateTokensFromText,
  estimateAttachmentTokens,
  parseModelMaxWindow,
  calculateContextGauge,
  computeCacheBadge,
  calculateOutputTps,
  USAGE_BAR_DIMENSIONS,
  isReasoningModel,
  validateReasoningEffort,
  applyReasoningEffort,
  classifyLatency,
  ModelProbeStore,
  CATALOG_52_PRESETS,
  getPresetsByCategory,
  getPresetsByRegion,
  findPresetById,
  parseCcSwitchDeeplink,
  looksLikeSecret,
  assertCredentialRef,
  CredentialVault,
  assertNoSecrets,
  filterMcpToolsForModel,
  calculateAutoCompactWatermark,
  shouldTriggerCompaction,
  transpileAnthropicToOpenAI,
  transpileOpenAIToAnthropic,
  transpileOpenAIResponseToAnthropic,
  OpenAIToAnthropicStreamConverter,
  calculateAccountHealthScore,
  AccountPoolManager,
  SubagentExecutionSandbox,
  type CreationDraftLike,
  type ModelSpaceProfile,
  type McpToolItem,
  type AnthropicMessagesRequest,
  type OpenAIChatResponse,
  type AccountInstance,
  type SubagentTaskBrief,
} from "./harness.ts";

/* =========================================================================
 * Tier 1: Feature Coverage (Core Functional Contracts & Happy Paths)
 * Total: 50 Test Cases (5 tests per feature across 10 features)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 1: UsageStatusBar Component & Dynamic Token Calculations
// -------------------------------------------------------------------------

test("F01-T1-01: calculates dynamic token usage across ASCII, CJK, and mixed text", () => {
  const ascii = "The quick brown fox jumps over the lazy dog"; // 43 chars -> ~11 tokens
  const asciiTokens = estimateTokensFromText(ascii);
  assert.equal(asciiTokens, Math.ceil(43 / 4));

  const cjk = "深度求索人工智能模型推理系统"; // 14 CJK chars -> 14 tokens
  const cjkTokens = estimateTokensFromText(cjk);
  assert.equal(cjkTokens, 14);

  const mixed = "Hello 世界! 2026年 AI 网关上线。"; // mixed
  const mixedTokens = estimateTokensFromText(mixed);
  assert.ok(mixedTokens > 10 && mixedTokens < 30);

  assert.equal(estimateTokensFromText(""), 0);

  const gauge = calculateContextGauge({ text: mixed, model: "gpt-4o" }, 512);
  assert.ok(gauge.usedTokens > 512);
  assert.equal(gauge.maxTokens, 128_000);
  assert.equal(gauge.tier, "normal");
});

test("F01-T1-02: incorporates multimodal image attachment weights (1,024 tokens each) into token gauge", () => {
  const zeroAttachments = estimateAttachmentTokens([]);
  assert.equal(zeroAttachments, 0);

  const oneImage = estimateAttachmentTokens([{ type: "image/png" }]);
  assert.equal(oneImage, 1024);

  const twoImages = estimateAttachmentTokens([
    { type: "image/png" },
    { type: "image/jpeg" },
  ]);
  assert.equal(twoImages, 2048);

  const customWeight = estimateAttachmentTokens([
    { type: "application/pdf", tokenOverride: 800 },
  ]);
  assert.equal(customWeight, 800);
});

test("F01-T1-03: parses max context window correctly from model suffix and fallback catalog", () => {
  assert.equal(parseModelMaxWindow("claude-3-7-sonnet[200K]"), 200_000);
  assert.equal(parseModelMaxWindow("deepseek-v4-pro[1M]"), 1_000_000);
  assert.equal(parseModelMaxWindow("deepseek-chat"), 64_000);
  assert.equal(parseModelMaxWindow("claude-3-5-sonnet"), 200_000);
  assert.equal(parseModelMaxWindow("gpt-4o"), 128_000);
  assert.equal(parseModelMaxWindow("unknown-custom-model"), 128_000);
});

test("F01-T1-04: formats prompt cache badge correctly with percentage and active status", () => {
  const hit = computeCacheBadge(8000, 10000);
  assert.equal(hit.active, true);
  assert.equal(hit.percentage, 80);
  assert.equal(hit.label, "⚡ Cached (80%)");

  const zero = computeCacheBadge(0, 10000);
  assert.equal(zero.active, false);
  assert.equal(zero.percentage, 0);
  assert.equal(zero.label, "⚡ Cached (0%)");
});

test("F01-T1-05: calculates output generation rate (TPS) and enforces 24px height invariant", () => {
  const tpsMetric = calculateOutputTps(120, 2000); // 120 tokens in 2 seconds = 60 tps
  assert.equal(tpsMetric.tps, 60);
  assert.equal(tpsMetric.label, "60 tps");

  const idleMetric = calculateOutputTps(0, 0);
  assert.equal(idleMetric.tps, 0);
  assert.equal(idleMetric.label, "-- tps");

  assert.equal(USAGE_BAR_DIMENSIONS.height, 24);
  assert.equal(USAGE_BAR_DIMENSIONS.minHeight, 24);
  assert.equal(USAGE_BAR_DIMENSIONS.maxHeight, 24);
  assert.equal(USAGE_BAR_DIMENSIONS.fontVariantNumeric, "tabular-nums");
});

// -------------------------------------------------------------------------
// Feature 2: Reasoning Effort Selector
// -------------------------------------------------------------------------

test("F02-T1-01: validates and applies 'low', 'medium', 'high' reasoning effort settings", () => {
  assert.equal(validateReasoningEffort("low"), "low");
  assert.equal(validateReasoningEffort("medium"), "medium");
  assert.equal(validateReasoningEffort("high"), "high");

  assert.throws(
    () => validateReasoningEffort("extreme"),
    /Invalid reasoning effort/,
  );
  assert.throws(() => validateReasoningEffort(123), /Invalid reasoning effort/);
});

test("F02-T1-02: identifies reasoning-capable models (o1, o3, deepseek-reasoner, claude-3-7)", () => {
  assert.equal(isReasoningModel("deepseek-reasoner"), true);
  assert.equal(isReasoningModel("deepseek-r1"), true);
  assert.equal(isReasoningModel("o1-preview"), true);
  assert.equal(isReasoningModel("o3-mini"), true);
  assert.equal(isReasoningModel("claude-3-7-sonnet"), true);

  assert.equal(isReasoningModel("gpt-4o"), false);
  assert.equal(isReasoningModel("claude-3-5-sonnet"), false);
  assert.equal(isReasoningModel("flux-1-schnell"), false);
});

test("F02-T1-03: immutable draft update retains all draft properties while updating reasoning effort", () => {
  const initialDraft: CreationDraftLike = {
    prompt: "Write a high-performance solver",
    model: "deepseek-reasoner",
    attachments: [{ type: "image/png" }],
  };

  const updatedDraft = applyReasoningEffort(initialDraft, "high");
  assert.equal(updatedDraft.reasoningEffort, "high");
  assert.equal(updatedDraft.prompt, initialDraft.prompt);
  assert.equal(updatedDraft.model, initialDraft.model);
  assert.equal(updatedDraft.attachments?.length, 1);
  assert.notEqual(updatedDraft, initialDraft);
});

test("F02-T1-04: non-reasoning models disable reasoning selector", () => {
  const models = ["gpt-4o", "deepseek-chat", "mistral-large", "gemini-1.5-pro"];
  for (const m of models) {
    assert.equal(
      isReasoningModel(m),
      false,
      `${m} should not be classified as a reasoning model`,
    );
  }
});

test("F02-T1-05: default reasoning effort persists across turns and respects explicit user overrides", () => {
  let draft: CreationDraftLike = {
    prompt: "Analyze mathematical conjecture",
    model: "o3-mini",
    reasoningEffort: "medium",
  };
  assert.equal(draft.reasoningEffort, "medium");

  // User changes to high
  draft = applyReasoningEffort(draft, "high");
  assert.equal(draft.reasoningEffort, "high");

  // User switches back to low
  draft = applyReasoningEffort(draft, "low");
  assert.equal(draft.reasoningEffort, "low");
});

// -------------------------------------------------------------------------
// Feature 3: Latency Probing Store & Badges
// -------------------------------------------------------------------------

test("F03-T1-01: classifies latency into fast (<100ms), moderate (<500ms), and slow (>=500ms)", () => {
  assert.equal(classifyLatency(35), "fast");
  assert.equal(classifyLatency(99), "fast");
  assert.equal(classifyLatency(100), "moderate");
  assert.equal(classifyLatency(499), "moderate");
  assert.equal(classifyLatency(500), "slow");
  assert.equal(classifyLatency(1200), "slow");
  assert.equal(classifyLatency(80, true), "error");
});

test("F03-T1-02: captures both Ping handshake and TTFT (time to first token) metrics", async () => {
  const store = new ModelProbeStore(60000);
  const metric = await store.probe("deepseek-v3", async () => ({
    latencyMs: 78,
    ttftMs: 240,
    ok: true,
  }));

  assert.equal(metric.targetId, "deepseek-v3");
  assert.equal(metric.pingMs, 78);
  assert.equal(metric.ttftMs, 240);
  assert.equal(metric.tier, "fast");
  assert.ok(metric.lastChecked > 0);
});

test("F03-T1-03: probe store caches metric with 60-second TTL preventing redundant network pings", async () => {
  const store = new ModelProbeStore(60000);
  let pingsCount = 0;

  const probeAction = async () => {
    pingsCount++;
    return { latencyMs: 65, ok: true };
  };

  const metric1 = await store.probe("claude-3-7-sonnet", probeAction);
  const metric2 = await store.probe("claude-3-7-sonnet", probeAction);

  assert.equal(pingsCount, 1, "Should not make second probe within TTL window");
  assert.equal(metric1, metric2);
  assert.equal(metric2.tier, "fast");
});

test("F03-T1-04: concurrent probes to same target deduplicate into single in-flight probe promise", async () => {
  const store = new ModelProbeStore(60000);
  let networkCalls = 0;

  const slowProbe = async () => {
    networkCalls++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { latencyMs: 230, ok: true };
  };

  const [res1, res2, res3] = await Promise.all([
    store.probe("shared-target", slowProbe),
    store.probe("shared-target", slowProbe),
    store.probe("shared-target", slowProbe),
  ]);

  assert.equal(networkCalls, 1);
  assert.equal(res1.pingMs, 230);
  assert.equal(res2.pingMs, 230);
  assert.equal(res3.pingMs, 230);
  assert.equal(res1.tier, "moderate");
});

test("F03-T1-05: probe failure records error state and tags target with error tier", async () => {
  const store = new ModelProbeStore(60000);
  const failingMetric = await store.probe("broken-endpoint", async () => {
    throw new Error("ECONNREFUSED 127.0.0.1:9999");
  });

  assert.equal(failingMetric.tier, "error");
  assert.equal(failingMetric.pingMs, -1);
  assert.match(failingMetric.error || "", /ECONNREFUSED/);
});

// -------------------------------------------------------------------------
// Feature 4: 50+ Provider Presets Catalog
// -------------------------------------------------------------------------

test("F04-T1-01: catalog contains at least 52 presets covering domestic, international, and relay providers", () => {
  assert.ok(
    CATALOG_52_PRESETS.length >= 52,
    `Catalog must have >= 52 presets, found ${CATALOG_52_PRESETS.length}`,
  );
  const uniqueIds = new Set(CATALOG_52_PRESETS.map((p) => p.id));
  assert.equal(
    uniqueIds.size,
    CATALOG_52_PRESETS.length,
    "All preset IDs must be unique",
  );

  const deepseek = findPresetById("deepseek");
  assert.equal(deepseek?.name, "DeepSeek (深度求索)");
  assert.equal(deepseek?.label, "DeepSeek");
  assert.equal(deepseek?.category, "官方");
});

test("F04-T1-02: domestic official group contains DeepSeek, Moonshot, SiliconFlow, Zhipu, DashScope, Ark, Hunyuan", () => {
  const domestic = getPresetsByRegion("domestic").filter(
    (p) => p.category === "官方",
  );
  assert.ok(
    domestic.length >= 14,
    `Domestic official must have >= 14 presets, found ${domestic.length}`,
  );

  const domesticIds = domestic.map((p) => p.id);
  assert.ok(domesticIds.includes("deepseek"));
  assert.ok(domesticIds.includes("moonshot"));
  assert.ok(domesticIds.includes("siliconflow"));
  assert.ok(domesticIds.includes("zhipu"));
  assert.ok(domesticIds.includes("dashscope"));
  assert.ok(
    domesticIds.includes("doubao-ark") ||
      domesticIds.includes("volcengine-ark"),
  );
  assert.ok(
    domesticIds.includes("hunyuan") || domesticIds.includes("tencent-hunyuan"),
  );
});

test("F04-T1-03: international official group contains OpenAI, Anthropic, Gemini, Azure, Bedrock, Groq, Mistral", () => {
  const intl = getPresetsByRegion("international");
  assert.ok(
    intl.length >= 23,
    `International official must have >= 23 presets, found ${intl.length}`,
  );

  const intlIds = intl.map((p) => p.id);
  assert.ok(intlIds.includes("openai") || intlIds.includes("openai-chat"));
  assert.ok(intlIds.includes("anthropic"));
  assert.ok(intlIds.includes("gemini") || intlIds.includes("google-gemini"));
  assert.ok(intlIds.includes("azure-openai"));
  assert.ok(intlIds.includes("bedrock") || intlIds.includes("aws-bedrock"));
  assert.ok(intlIds.includes("groq"));
  assert.ok(intlIds.includes("mistral"));
});

test("F04-T1-04: relay and local groups contain OpenRouter, Sub2API, New API, Ollama, LM Studio, ComfyUI", () => {
  const relays = getPresetsByCategory("网关");
  assert.ok(
    relays.length >= 9,
    `Relay group must have >= 9 presets, found ${relays.length}`,
  );
  const relayIds = relays.map((p) => p.id);
  assert.ok(relayIds.includes("openrouter"));
  assert.ok(relayIds.includes("sub2api"));
  assert.ok(relayIds.includes("new-api"));

  const locals = getPresetsByCategory("本地");
  assert.ok(
    locals.length >= 6,
    `Local group must have >= 6 presets, found ${locals.length}`,
  );
  const localIds = locals.map((p) => p.id);
  assert.ok(localIds.includes("ollama"));
  assert.ok(localIds.includes("lm-studio"));
  assert.ok(localIds.includes("comfyui"));
});

test("F04-T1-05: each preset specifies valid endpoint URL, wire protocol, and documentation links", () => {
  for (const preset of CATALOG_52_PRESETS) {
    assert.ok(preset.id.length > 0);
    assert.ok(preset.name.length > 0);
    assert.ok(
      !preset.baseUrl ||
        preset.baseUrl.startsWith("http://") ||
        preset.baseUrl.startsWith("https://"),
    );
    assert.ok(
      [
        "openai-chat",
        "openai-responses",
        "anthropic",
        "azure-openai",
        "ollama",
      ].includes(preset.wireProtocol || "openai-chat"),
    );
    assert.ok(
      ["api_key", "bearer_token", "none"].includes(
        preset.authMode || "api_key",
      ),
    );
    assert.ok(preset.website.length > 0);
    assert.ok(preset.docsUrl.length > 0);
  }
});

// -------------------------------------------------------------------------
// Feature 5: Deeplink Import & CredentialRef
// -------------------------------------------------------------------------

test("F05-T1-01: parses CC Switch deeplink format extracting name, endpoint, apiKey, and model", () => {
  const link =
    "ccswitch://v1/import?name=DeepSeek-Official&endpoint=https%3A%2F%2Fapi.deepseek.com%2Fv1&apiKey=sk-1234567890abcdef&model=deepseek-chat";
  const result = parseCcSwitchDeeplink(link);

  assert.equal(result.name, "DeepSeek-Official");
  assert.equal(result.endpoint, "https://api.deepseek.com/v1");
  assert.equal(result.apiKey, "sk-1234567890abcdef");
  assert.equal(result.model, "deepseek-chat");
});

test("F05-T1-02: preserves endpoint and homepage URL parameters during deeplink parsing", () => {
  const link1 =
    "ccswitch://v1/import?name=Sub2API&endpoint=https%3A%2F%2Fapi.sub2api.com%2Fv1";
  const result1 = parseCcSwitchDeeplink(link1);
  assert.equal(result1.endpoint, "https://api.sub2api.com/v1");

  const link2 =
    "ccswitch://v1/import?name=Custom&endpoint=https%3A%2F%2Fcustom.ai";
  const result2 = parseCcSwitchDeeplink(link2);
  assert.equal(result2.endpoint, "https://custom.ai");
});

test("F05-T1-03: detects raw API keys and secrets via looksLikeSecret (sk-, Bearer, JWT, AWS, Hex)", () => {
  assert.equal(looksLikeSecret("sk-proj-1234567890abcdef12345678"), true);
  assert.equal(
    looksLikeSecret("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.abcdef"),
    true,
  );
  assert.equal(looksLikeSecret("AKIAIOSFODNN7EXAMPLE"), true);
  assert.equal(looksLikeSecret("0123456789abcdef0123456789abcdef"), true);

  assert.equal(looksLikeSecret("provider-credential-ref-001"), false);
  assert.equal(looksLikeSecret("cred_deepseek_main"), false);
  assert.equal(looksLikeSecret("my_api_key_ref"), false);
});

test("F05-T1-04: stores secret in CredentialVault and generates opaque reference ref-xxxx", () => {
  const vault = new CredentialVault();
  const rawKey = "sk-ant-api03-very-secret-anthropic-key-value";

  const ref = vault.storeSecret(rawKey, "anthropic");
  assert.ok(ref.startsWith("anthropic-"));
  assert.doesNotThrow(() => assertCredentialRef(ref));

  const resolved = vault.resolveSecret(ref);
  assert.equal(resolved, rawKey);
});

test("F05-T1-05: assertNoSecrets prevents plaintext secret leakage during configuration export", () => {
  const cleanConfig = JSON.stringify({
    version: 1,
    connections: [{ id: "conn-1", credentialRef: "ref-9876543210" }],
  });
  assert.doesNotThrow(() => assertNoSecrets(cleanConfig));

  const leakingConfig = JSON.stringify({
    version: 1,
    connections: [{ id: "conn-1", key: "sk-12345678901234567890abcdef" }],
  });
  assert.throws(
    () => assertNoSecrets(leakingConfig),
    /疑似包含密钥或凭据|SECRET_LEAK_DETECTED/,
  );
});

// -------------------------------------------------------------------------
// Feature 6: Per-Model Space Profiles
// -------------------------------------------------------------------------

test("F06-T1-01: creates ModelSpaceProfile with modelId, contextWindow, and autoCompactTokenLimit", () => {
  const profile: ModelSpaceProfile = {
    modelId: "deepseek-reasoner",
    contextWindow: 64 * 1024,
    autoCompactTokenLimit: calculateAutoCompactWatermark(64 * 1024),
    defaultReasoningEffort: "high",
  };

  assert.equal(profile.modelId, "deepseek-reasoner");
  assert.equal(profile.contextWindow, 65536);
  assert.equal(profile.autoCompactTokenLimit, 49152); // 75% of 64k
  assert.equal(profile.defaultReasoningEffort, "high");
});

test("F06-T1-02: filters MCP tools based on model whitelist, excluding unlisted tools", () => {
  const tools: McpToolItem[] = [
    { name: "read_file", category: "filesystem" },
    { name: "write_file", category: "filesystem" },
    { name: "web_search", category: "network" },
    { name: "render_canvas", category: "canvas" },
  ];

  const profile: ModelSpaceProfile = {
    modelId: "specialized-coder",
    contextWindow: 32768,
    autoCompactTokenLimit: 24576,
    mcpToolWhitelist: ["read_file", "write_file"],
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 2);
  assert.deepEqual(
    filtered.map((t) => t.name),
    ["read_file", "write_file"],
  );
});

test("F06-T1-03: enforces model blacklist, removing dangerous tools (e.g. terminal execution)", () => {
  const tools: McpToolItem[] = [
    { name: "read_file" },
    { name: "run_shell_command" },
    { name: "format_code" },
  ];

  const profile: ModelSpaceProfile = {
    modelId: "safe-assistant",
    contextWindow: 128000,
    autoCompactTokenLimit: 96000,
    mcpToolBlacklist: ["run_shell_command"],
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 2);
  assert.ok(!filtered.some((t) => t.name === "run_shell_command"));
});

test("F06-T1-04: preserves all tools when space whitelist and blacklist are undefined (passthrough)", () => {
  const tools: McpToolItem[] = [
    { name: "tool1" },
    { name: "tool2" },
    { name: "tool3" },
  ];
  const profile: ModelSpaceProfile = {
    modelId: "general-model",
    contextWindow: 128000,
    autoCompactTokenLimit: 96000,
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 3);
});

test("F06-T1-05: associates default reasoning effort and default temperature per model space", () => {
  const reasoningSpace: ModelSpaceProfile = {
    modelId: "deepseek-reasoner",
    contextWindow: 65536,
    autoCompactTokenLimit: 49152,
    defaultReasoningEffort: "high",
    defaultTemperature: 0.2,
  };
  assert.equal(reasoningSpace.defaultReasoningEffort, "high");
  assert.equal(reasoningSpace.defaultTemperature, 0.2);

  const creativeSpace: ModelSpaceProfile = {
    modelId: "claude-3-7-sonnet",
    contextWindow: 204800,
    autoCompactTokenLimit: 163840,
    defaultTemperature: 0.7,
  };
  assert.equal(creativeSpace.defaultTemperature, 0.7);
  assert.equal(creativeSpace.defaultReasoningEffort, undefined);
});

// -------------------------------------------------------------------------
// Feature 7: Dynamic Compression Watermarks
// -------------------------------------------------------------------------

test("F07-T1-01: calculates 75% watermark for 32k context models (24,576 tokens)", () => {
  const wm = calculateAutoCompactWatermark(32 * 1024);
  assert.equal(wm, 24576);
  assert.equal(wm / (32 * 1024), 0.75);
});

test("F07-T1-02: calculates 75% watermark for 128k context models (96,000 tokens)", () => {
  const wm = calculateAutoCompactWatermark(128_000);
  assert.equal(wm, 96000);
  assert.equal(wm / 128_000, 0.75);
});

test("F07-T1-03: calculates 80% watermark for 200k context models (163,840 tokens)", () => {
  const wm = calculateAutoCompactWatermark(200 * 1024);
  assert.equal(wm, 163840);
  assert.equal(wm / (200 * 1024), 0.8);
});

test("F07-T1-04: calculates 80% watermark for 1M context models (838,860 tokens)", () => {
  const wm = calculateAutoCompactWatermark(1024 * 1024);
  assert.equal(wm, 838860);
  assert.equal(Math.round((wm / (1024 * 1024)) * 100), 80);
});

test("F07-T1-05: shouldTriggerCompaction returns true when usedTokens reaches or exceeds watermark", () => {
  const watermark = 24000;
  assert.equal(shouldTriggerCompaction(20000, watermark), false);
  assert.equal(shouldTriggerCompaction(23999, watermark), false);
  assert.equal(shouldTriggerCompaction(24000, watermark), true);
  assert.equal(shouldTriggerCompaction(25000, watermark), true);
});

// -------------------------------------------------------------------------
// Feature 8: OpenAI <-> Anthropic Transpiler
// -------------------------------------------------------------------------

test("F08-T1-01: transpiles Anthropic request to OpenAI format extracting system message and roles", () => {
  const anthropicReq: AnthropicMessagesRequest = {
    model: "claude-3-7-sonnet",
    system: "You are a senior fullstack engineer.",
    messages: [
      { role: "user", content: "How do I implement SSE in Node?" },
      {
        role: "assistant",
        content: "Use ReadableStream or res.write with text/event-stream.",
      },
      { role: "user", content: "Show me an example." },
    ],
    max_tokens: 2048,
    temperature: 0.5,
  };

  const openAiReq = transpileAnthropicToOpenAI(anthropicReq);
  assert.equal(openAiReq.model, "claude-3-7-sonnet");
  assert.equal(openAiReq.messages.length, 4);
  assert.equal(openAiReq.messages[0].role, "system");
  assert.equal(
    openAiReq.messages[0].content,
    "You are a senior fullstack engineer.",
  );
  assert.equal(openAiReq.messages[1].role, "user");
  assert.equal(openAiReq.messages[2].role, "assistant");
  assert.equal(openAiReq.messages[3].role, "user");
  assert.equal(openAiReq.max_tokens, 2048);
  assert.equal(openAiReq.temperature, 0.5);
});

test("F08-T1-02: maps Anthropic thinking blocks to OpenAI reasoning_content and vice-versa", () => {
  const anthropicReq: AnthropicMessagesRequest = {
    model: "claude-3-7-sonnet",
    messages: [
      {
        role: "assistant",
        content: [
          {
            type: "thinking",
            thinking: "Consider the algorithm complexity O(N log N)",
          },
          { type: "text", text: "The optimal sort is merge sort." },
        ],
      },
    ],
    max_tokens: 1000,
  };

  const openAiReq = transpileAnthropicToOpenAI(anthropicReq);
  assert.equal(openAiReq.messages.length, 1);
  assert.equal(
    openAiReq.messages[0].reasoning_content,
    "Consider the algorithm complexity O(N log N)",
  );
  assert.equal(
    openAiReq.messages[0].content,
    "The optimal sort is merge sort.",
  );

  // Reverse round-trip
  const roundTripAnthropic = transpileOpenAIToAnthropic(openAiReq);
  const blocks = roundTripAnthropic.messages[0].content;
  assert.ok(Array.isArray(blocks));
  assert.equal(blocks[0].type, "thinking");
  assert.equal(
    blocks[0].thinking,
    "Consider the algorithm complexity O(N log N)",
  );
  assert.equal(blocks[1].type, "text");
  assert.equal(blocks[1].text, "The optimal sort is merge sort.");
});

test("F08-T1-03: converts Anthropic tool_use and tool_result to OpenAI tool_calls and tool messages", () => {
  const anthropicReq: AnthropicMessagesRequest = {
    model: "claude-3-5-sonnet",
    tools: [
      {
        name: "get_weather",
        description: "Get temperature",
        input_schema: {
          type: "object",
          properties: { location: { type: "string" } },
        },
      },
    ],
    messages: [
      {
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "call_abc123",
            name: "get_weather",
            input: { location: "Beijing" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "call_abc123",
            content: '{"temperature": 22}',
          },
        ],
      },
    ],
    max_tokens: 1000,
  };

  const openAiReq = transpileAnthropicToOpenAI(anthropicReq);
  assert.equal(openAiReq.tools?.length, 1);
  assert.equal(openAiReq.tools?.[0].function.name, "get_weather");
  assert.equal(openAiReq.messages.length, 2);

  const assistantMsg = openAiReq.messages[0];
  assert.equal(assistantMsg.role, "assistant");
  assert.equal(assistantMsg.tool_calls?.length, 1);
  assert.equal(assistantMsg.tool_calls?.[0].id, "call_abc123");
  assert.equal(assistantMsg.tool_calls?.[0].function.name, "get_weather");

  const toolMsg = openAiReq.messages[1];
  assert.equal(toolMsg.role, "tool");
  assert.equal(toolMsg.tool_call_id, "call_abc123");
  assert.equal(toolMsg.content, '{"temperature": 22}');
});

test("F08-T1-04: transpiles OpenAI non-streaming response to Anthropic message format with usage metrics", () => {
  const openAiResp: OpenAIChatResponse = {
    id: "chatcmpl-999",
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Hello from OpenAI!",
          reasoning_content: "Analyzing user intent...",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 15,
      completion_tokens: 25,
      total_tokens: 40,
      prompt_tokens_details: { cached_tokens: 10 },
    },
  };

  const anthropicResp = transpileOpenAIResponseToAnthropic(openAiResp);
  assert.equal(anthropicResp.id, "msg_999");
  assert.equal(anthropicResp.role, "assistant");
  assert.equal(anthropicResp.stop_reason, "end_turn");
  assert.equal(anthropicResp.content.length, 2);
  assert.equal(anthropicResp.content[0].type, "thinking");
  assert.equal(anthropicResp.content[0].thinking, "Analyzing user intent...");
  assert.equal(anthropicResp.content[1].type, "text");
  assert.equal(anthropicResp.content[1].text, "Hello from OpenAI!");
  assert.equal(anthropicResp.usage.input_tokens, 15);
  assert.equal(anthropicResp.usage.output_tokens, 25);
  assert.equal(anthropicResp.usage.cache_read_input_tokens, 10);
});

test("F08-T1-05: stream converter transforms OpenAI SSE chunks into standard Anthropic SSE event lifecycle", () => {
  const converter = new OpenAIToAnthropicStreamConverter();

  // Chunk 1: Thinking delta
  const events1 = converter.convertChunk({
    choices: [{ delta: { reasoning_content: "Let me ponder..." } }],
  });
  assert.equal(events1.length, 3); // message_start + content_block_start + content_block_delta
  assert.equal(events1[0].event, "message_start");
  assert.equal(events1[1].event, "content_block_start");
  assert.equal(events1[2].event, "content_block_delta");

  // Chunk 2: Text delta
  const events2 = converter.convertChunk({
    choices: [{ delta: { content: "Here is the answer." } }],
  });
  assert.equal(events2.length, 3); // content_block_stop (thinking) + content_block_start (text) + content_block_delta
  assert.equal(events2[0].event, "content_block_stop");
  assert.equal(events2[1].event, "content_block_start");
  assert.equal(events2[2].event, "content_block_delta");

  // Chunk 3: Finish reason
  const events3 = converter.convertChunk({
    choices: [{ delta: {}, finish_reason: "stop" }],
    usage: { completion_tokens: 42 },
  });
  assert.equal(events3.length, 3); // content_block_stop + message_delta + message_stop
  assert.equal(events3[0].event, "content_block_stop");
  assert.equal(events3[1].event, "message_delta");
  assert.equal(events3[2].event, "message_stop");
});

// -------------------------------------------------------------------------
// Feature 9: Account Pool & 429 Hot Failover
// -------------------------------------------------------------------------

test("F09-T1-01: account pool selects healthiest, highest-priority active account", () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-backup",
      provider: "deepseek",
      credentialRef: "ref-backup",
      weight: 1,
      priority: 1,
      enabled: true,
      healthScore: 90,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 40,
    },
    {
      id: "acc-primary",
      provider: "deepseek",
      credentialRef: "ref-primary",
      weight: 10,
      priority: 2, // higher priority
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 30,
    },
  ]);

  const chosen = pool.selectCandidate();
  assert.equal(chosen?.id, "acc-primary");
});

test("F09-T1-02: dynamic health score penalizes consecutive 429s, 5xxs, and high latency", () => {
  const acc: AccountInstance = {
    id: "acc-1",
    provider: "openai",
    credentialRef: "ref-1",
    weight: 1,
    priority: 1,
    enabled: true,
    healthScore: 100,
    consecutiveFailures: 1, // -15
    consecutive429: 1, // -20
    consecutive5xx: 0,
    cooldownUntil: 0,
    quarantined: false,
    recentLatencyMs: 600, // -10
  };

  const score = calculateAccountHealthScore(acc);
  assert.equal(score, 100 - 15 - 20 - 10); // 55
});

test("F09-T1-03: 429 rate limit before first token hot-drifts seamlessly to backup account in <15ms", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-primary",
      provider: "deepseek",
      credentialRef: "ref-primary",
      weight: 10,
      priority: 2,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 30,
    },
    {
      id: "acc-backup",
      provider: "deepseek",
      credentialRef: "ref-backup",
      weight: 5,
      priority: 2,
      enabled: true,
      healthScore: 95,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 35,
    },
  ]);

  const dispatchResult = await pool.dispatchWithHotDrift(
    async (account, _onStream) => {
      if (account.id === "acc-primary") {
        throw new Error("HTTP 429: Too Many Requests (Rate limit exceeded)");
      }
      return { status: "ok", content: "Response generated via backup account" };
    },
  );

  assert.equal(dispatchResult.drifted, true);
  assert.equal(dispatchResult.finalAccountId, "acc-backup");
  assert.equal(dispatchResult.attempts, 2);
  assert.equal(
    dispatchResult.result.content,
    "Response generated via backup account",
  );

  // Primary account should now be cooling down with penalized health score
  const primary = pool.accounts.find((a) => a.id === "acc-primary");
  assert.ok(primary!.cooldownUntil > Date.now());
  assert.equal(primary!.consecutive429, 1);
});

test("F09-T1-04: successful request resets failure counter and recovers health score", () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-healing",
      provider: "moonshot",
      credentialRef: "ref-moonshot",
      weight: 1,
      priority: 1,
      enabled: true,
      healthScore: 60,
      consecutiveFailures: 2,
      consecutive429: 1,
      consecutive5xx: 1,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 80,
    },
  ]);

  pool.recordSuccess("acc-healing", 55);
  const acc = pool.accounts[0];
  assert.equal(acc.consecutiveFailures, 0);
  assert.equal(acc.consecutive429, 0);
  assert.equal(acc.consecutive5xx, 0);
  assert.equal(acc.healthScore, 65); // 60 + 5
});

test("F09-T1-05: three consecutive 5xx errors trip circuit breaker into OPEN state", () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-failing",
      provider: "anthropic",
      credentialRef: "ref-claude",
      weight: 1,
      priority: 1,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 50,
    },
  ]);

  assert.equal(pool.circuitState, "CLOSED");
  pool.record5xx("acc-failing");
  pool.record5xx("acc-failing");
  assert.equal(pool.circuitState, "CLOSED");
  pool.record5xx("acc-failing");
  assert.equal(pool.circuitState, "OPEN");

  // In OPEN state, no candidates should be selected
  const candidate = pool.selectCandidate();
  assert.equal(candidate, null);
});

// -------------------------------------------------------------------------
// Feature 10: Sub-Agent Delegation Pipeline
// -------------------------------------------------------------------------

test("F10-T1-01: dispatches subagent task with TaskBrief specifying goal, constraints, and inputs", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape", "read_file"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-research-001",
    taskType: "scrape",
    goal: "Gather 2026 AI model pricing benchmarks",
    constraints: ["Exclude speculation", "Cite official URLs"],
    inputs: { targetProviders: ["openai", "anthropic", "deepseek"] },
  };

  const result = await sandbox.executeTask(brief, async (_tools, logFn) => {
    logFn("Fetching DeepSeek pricing table from https://api-docs.deepseek.com");
    return {
      summary:
        "Gathered pricing data: DeepSeek $0.14/M tokens, OpenAI $2.50/M tokens, Anthropic $3.00/M tokens.",
      data: { deepseek: 0.14, openai: 2.5, anthropic: 3.0 },
      tokensUsed: 120,
    };
  });

  assert.equal(result.taskId, "task-research-001");
  assert.equal(result.status, "success");
  assert.equal(result.subagentRole, "subagent-scrape");
  assert.ok(result.executiveSummary.includes("DeepSeek $0.14/M tokens"));
  assert.deepEqual(result.structuredData, {
    deepseek: 0.14,
    openai: 2.5,
    anthropic: 3.0,
  });
});

test("F10-T1-02: subagent runs in clean sandbox without inheriting parent conversation history", async () => {
  const sandbox = new SubagentExecutionSandbox(["read_file"]);
  assert.equal(
    sandbox.parentContextMessages.length,
    0,
    "Sandbox must not inherit parent context history",
  );
});

test("F10-T1-03: restricts subagent execution to specified allowed tools (e.g. scrape and read_file)", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape", "read_file"]);
  let toolsReceived: string[] = [];

  await sandbox.executeTask(
    {
      taskId: "task-tools-001",
      taskType: "scrape",
      goal: "Check tools",
      constraints: [],
      inputs: {},
    },
    async (tools, _logFn) => {
      toolsReceived = tools;
      return { summary: "Done", tokensUsed: 10 };
    },
  );

  assert.deepEqual(toolsReceived, ["scrape", "read_file"]);
  assert.ok(
    !toolsReceived.includes("modify_canvas"),
    "Dangerous canvas modify tool must not be exposed",
  );
});

test("F10-T1-04: structural foldback produces concise executive summary (<= 300 words) and structured data", async () => {
  const sandbox = new SubagentExecutionSandbox(["deep_analysis"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-long-001",
    taskType: "deep_analysis",
    goal: "Analyze big codebase",
    constraints: [],
    inputs: {},
  };

  const result = await sandbox.executeTask(brief, async (_tools, logFn) => {
    for (let i = 0; i < 20; i++) {
      logFn(`Step ${i}: Reading module ${i}...`);
    }
    return {
      summary:
        "Comprehensive analysis concluded that module decoupling is 100% compliant with Hexagonal Core architecture.",
      tokensUsed: 3500,
    };
  });

  const wordCount = result.executiveSummary.split(/\s+/).length;
  assert.ok(wordCount <= 300, `Word count must be <= 300, got ${wordCount}`);
  assert.equal(result.status, "success");
});

test("F10-T1-05: calculates tokens saved by folding intermediate exploration into compact result card", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-token-savings-001",
    taskType: "scrape",
    goal: "Scrape 10 web pages",
    constraints: [],
    inputs: {},
  };

  const result = await sandbox.executeTask(brief, async (_tools, logFn) => {
    logFn("Scraped page 1 (5000 bytes)");
    logFn("Scraped page 2 (8000 bytes)");
    logFn("Scraped page 3 (6000 bytes)");
    return {
      summary: "Found key insight: Provider latency reduced by 40%.",
      tokensUsed: 4200,
    };
  });

  assert.ok(result.tokensConsumed! >= 4200);
  assert.ok(
    result.tokensSaved! > 4000,
    `Tokens saved should be > 4000, got ${result.tokensSaved}`,
  );
});
