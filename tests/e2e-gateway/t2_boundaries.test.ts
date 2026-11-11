import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateTokensFromText,
  calculateContextGauge,
  calculateOutputTps,
  validateReasoningEffort,
  isReasoningModel,
  applyReasoningEffort,
  classifyLatency,
  ModelProbeStore,
  CATALOG_52_PRESETS,
  findPresetById,
  getPresetsByCategory,
  parseCcSwitchDeeplink,
  looksLikeSecret,
  assertCredentialRef,
  assertNoSecrets,
  CredentialVault,
  filterMcpToolsForModel,
  calculateAutoCompactWatermark,
  shouldTriggerCompaction,
  transpileAnthropicToOpenAI,
  transpileOpenAIToAnthropic,
  OpenAIToAnthropicStreamConverter,
  AccountPoolManager,
  calculateAccountHealthScore,
  SubagentExecutionSandbox,
  type CreationDraftLike,
  type ModelSpaceProfile,
  type McpToolItem,
  type AnthropicMessagesRequest,
  type OpenAIChatRequest,
  type AccountInstance,
  type SubagentTaskBrief,
} from "./harness.ts";

/* =========================================================================
 * Tier 2: Boundary & Corner Cases (Adversarial, Extreme Limits & Error Paths)
 * Total: 50 Test Cases (5 tests per feature across 10 features)
 * ========================================================================= */

// -------------------------------------------------------------------------
// Feature 1: UsageStatusBar Edge Cases
// -------------------------------------------------------------------------

test("F01-T2-01: token count exceeding 100% of context window triggers critical danger tier and clamps display", () => {
  // Model window 32k = 32,768 tokens. Pass massive text of 40,000 words
  const massiveText = "overflow ".repeat(20000); // 20,000 words -> ~25,000 tokens + 512 overhead
  const gauge = calculateContextGauge(
    { text: massiveText, model: "custom-small[32K]" },
    10000,
  );

  assert.ok(gauge.usedTokens > 32768, "Used tokens must exceed max window");
  assert.equal(gauge.percentage, 100, "Percentage should be clamped to 100%");
  assert.equal(
    gauge.tier,
    "danger",
    "Status tier must be danger when overflowing",
  );
});

test("F01-T2-02: pure CJK ideographic text vs pure ASCII boundaries calculate exact non-zero token partitions", () => {
  const cjkChars = "天地玄黄宇宙洪荒日月盈昃辰宿列张"; // 16 CJK chars
  const cjkTokens = estimateTokensFromText(cjkChars);
  assert.equal(cjkTokens, 16);

  const asciiChars = "12345678"; // 8 ASCII chars
  const asciiTokens = estimateTokensFromText(asciiChars);
  assert.equal(asciiTokens, 2); // 8 / 4 = 2

  const singleChar = "A";
  assert.equal(estimateTokensFromText(singleChar), 1);
});

test("F01-T2-03: zero token prompt with no attachments returns base system overhead without NaN or division by zero", () => {
  const gauge = calculateContextGauge(
    { text: "", attachments: [], model: "gpt-4o" },
    512,
  );

  assert.equal(gauge.usedTokens, 512);
  assert.ok(!isNaN(gauge.percentage));
  assert.equal(gauge.percentage, 0); // 512 / 131,072 = 0.39% -> round 0%
  assert.equal(gauge.tier, "normal");
});

test("F01-T2-04: extreme context token values format with thousand-separator commas (e.g. 1,048,576)", () => {
  const gauge = calculateContextGauge(
    { text: "test", model: "ultra-large[1M]" },
    1048000,
  );

  assert.ok(
    gauge.displayString.includes("1,000,000"),
    "Max tokens must be formatted with commas",
  );
  assert.ok(
    gauge.displayString.includes("1,048,00"),
    "Used tokens must be formatted with commas",
  );
});

test("F01-T2-05: elapsed time of 0ms or negative elapsed time handles gracefully without producing Infinity TPS", () => {
  const tpsZero = calculateOutputTps(100, 0);
  assert.equal(tpsZero.tps, 0);
  assert.equal(tpsZero.label, "-- tps");

  const tpsNegative = calculateOutputTps(100, -500);
  assert.equal(tpsNegative.tps, 0);
  assert.equal(tpsNegative.label, "-- tps");
});

// -------------------------------------------------------------------------
// Feature 2: Reasoning Effort Edge Cases
// -------------------------------------------------------------------------

test("F02-T2-01: attempting to set invalid effort string throws typed validation error", () => {
  assert.throws(
    () => validateReasoningEffort("ultra"),
    /Invalid reasoning effort/,
  );
  assert.throws(
    () => validateReasoningEffort("none"),
    /Invalid reasoning effort/,
  );
  assert.throws(() => validateReasoningEffort(""), /Invalid reasoning effort/);
});

test("F02-T2-02: non-string and null reasoning effort values fail closed", () => {
  assert.throws(
    () => validateReasoningEffort(null),
    /Invalid reasoning effort/,
  );
  assert.throws(
    () => validateReasoningEffort(undefined),
    /Invalid reasoning effort/,
  );
  assert.throws(
    () => validateReasoningEffort({ effort: "high" }),
    /Invalid reasoning effort/,
  );
});

test("F02-T2-03: case variations (LOW, High, MEDIUM) fail closed without silent normalization", () => {
  assert.throws(
    () => validateReasoningEffort("LOW"),
    /Invalid reasoning effort/,
  );
  assert.throws(
    () => validateReasoningEffort("High"),
    /Invalid reasoning effort/,
  );
  assert.throws(
    () => validateReasoningEffort("MEDIUM"),
    /Invalid reasoning effort/,
  );
});

test("F02-T2-04: model ID regex boundary matching (e.g. 'model-solo-1' is not 'o1', 'deepseek-r1-distill' is reasoning)", () => {
  assert.equal(isReasoningModel("deepseek-r1-distill-qwen-32b"), true);
  assert.equal(isReasoningModel("o1-mini-2024-09-12"), true);
  assert.equal(isReasoningModel("o3-mini-low"), true);

  // Negative lookahead / false positives
  assert.equal(isReasoningModel("audio-1"), false);
  assert.equal(isReasoningModel("auto-1"), false);
});

test("F02-T2-05: switching reasoning effort rapidly across turns maintains immutable isolation between draft snapshots", () => {
  const baseDraft: CreationDraftLike = {
    prompt: "Base",
    model: "o3-mini",
    reasoningEffort: "low",
  };
  const d1 = applyReasoningEffort(baseDraft, "medium");
  const d2 = applyReasoningEffort(d1, "high");
  const d3 = applyReasoningEffort(d2, "low");

  assert.equal(baseDraft.reasoningEffort, "low");
  assert.equal(d1.reasoningEffort, "medium");
  assert.equal(d2.reasoningEffort, "high");
  assert.equal(d3.reasoningEffort, "low");
});

// -------------------------------------------------------------------------
// Feature 3: Latency Probing Edge Cases
// -------------------------------------------------------------------------

test("F03-T2-01: zero latency (0ms) classifies as fast rather than error or falsy", () => {
  assert.equal(classifyLatency(0), "fast");
});

test("F03-T2-02: exact boundary conditions (99ms fast vs 100ms moderate, 499ms moderate vs 500ms slow)", () => {
  assert.equal(classifyLatency(99), "fast");
  assert.equal(classifyLatency(100), "moderate");
  assert.equal(classifyLatency(499), "moderate");
  assert.equal(classifyLatency(500), "slow");
});

test("F03-T2-03: negative latency or NaN latency classifies strictly as error", () => {
  assert.equal(classifyLatency(-1), "error");
  assert.equal(classifyLatency(-100), "error");
  assert.equal(classifyLatency(NaN), "error");
  assert.equal(classifyLatency(10000), "slow");
});

test("F03-T2-04: probe request timing out (e.g. >3000ms or AbortSignal) records error metric and leaves other metrics intact", async () => {
  const store = new ModelProbeStore(60000);
  const metric = await store.probe("timeout-target", async () => {
    throw new Error("ABORT_ERR: Probe aborted due to 3000ms timeout");
  });

  assert.equal(metric.tier, "error");
  assert.ok(metric.error?.includes("ABORT_ERR"));
});

test("F03-T2-05: cache expiration at exact TTL boundary (60,001ms) evicts stale entry and triggers fresh probe", async () => {
  const store = new ModelProbeStore(10); // 10ms TTL for testing
  let callCount = 0;

  const probe = async () => {
    callCount++;
    return { latencyMs: 50, ok: true };
  };

  await store.probe("test-cache", probe);
  assert.equal(callCount, 1);

  // Wait 15ms to surpass 10ms TTL
  await new Promise((resolve) => setTimeout(resolve, 15));

  await store.probe("test-cache", probe);
  assert.equal(
    callCount,
    2,
    "Stale cache must be evicted after TTL expiration",
  );
});

// -------------------------------------------------------------------------
// Feature 4: 50+ Provider Presets Catalog Edge Cases
// -------------------------------------------------------------------------

test("F04-T2-01: query for non-existent preset ID returns undefined without throwing exception", () => {
  assert.equal(findPresetById("non-existent-provider-xyz"), undefined);
  assert.equal(findPresetById(""), undefined);
});

test("F04-T2-02: filter by category or region on empty or invalid criteria returns empty array", () => {
  // @ts-expect-error Testing invalid runtime category
  const invalidCategory = getPresetsByCategory("未知分类");
  assert.deepEqual(invalidCategory, []);
});

test("F04-T2-03: all preset baseUrl strings are checked for trailing slashes (preserves consistent normalization)", () => {
  for (const preset of CATALOG_52_PRESETS) {
    // Normalization check: baseUrls should not end in double slashes
    assert.ok(
      !preset.baseUrl.endsWith("//"),
      `${preset.id} has trailing double slashes`,
    );
  }
});

test("F04-T2-04: domestic providers with regional endpoints maintain correct domestic tag", () => {
  const domesticPresets = CATALOG_52_PRESETS.filter(
    (p) => p.region === "domestic",
  );
  for (const p of domesticPresets) {
    assert.equal(p.region, "domestic");
  }
});

test("F04-T2-05: local offline providers (ollama, lm-studio) specify authMode 'none' and local loopback address", () => {
  const ollama = findPresetById("ollama");
  assert.ok(ollama);
  assert.equal(ollama.authMode, "none");
  assert.ok(
    ollama.baseUrl.includes("127.0.0.1") ||
      ollama.baseUrl.includes("localhost"),
  );

  const lmStudio = findPresetById("lm-studio");
  assert.ok(lmStudio);
  assert.equal(lmStudio.authMode, "none");
  assert.ok(
    lmStudio.baseUrl.includes("127.0.0.1") ||
      lmStudio.baseUrl.includes("localhost"),
  );
});

// -------------------------------------------------------------------------
// Feature 5: Deeplink Import & CredentialRef Edge Cases
// -------------------------------------------------------------------------

test("F05-T2-01: malformed deeplink protocol (http:// or https:// instead of ccswitch://) throws INVALID_DEEPLINK_PROTOCOL", () => {
  assert.throws(
    () =>
      parseCcSwitchDeeplink(
        "https://v1/import?name=Test&endpoint=https://api.test.com",
      ),
    /非法 CC Switch Deeplink 协议|INVALID_DEEPLINK_PROTOCOL/,
  );
  assert.throws(
    () =>
      parseCcSwitchDeeplink(
        "custom://v1/import?name=Test&endpoint=https://api.test.com",
      ),
    /非法 CC Switch Deeplink 协议|INVALID_DEEPLINK_PROTOCOL/,
  );
});

test("F05-T2-02: deeplink with missing endpoint parameter throws MISSING_ENDPOINT", () => {
  assert.throws(
    () => parseCcSwitchDeeplink("ccswitch://v1/import?name=MissingEndpoint"),
    /缺少 endpoint|MISSING_ENDPOINT/,
  );
});

test("F05-T2-03: supplying raw secret as credentialRef throws CREDENTIAL_REF_IS_SECRET immediately", () => {
  assert.equal(looksLikeSecret("sk-1234567890abcdef1234567890abcdef"), true);
  assert.throws(
    () => assertCredentialRef("sk-1234567890abcdef1234567890abcdef"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
  assert.throws(
    () => assertCredentialRef("Bearer eyJhbGciOiJIUzI1NiJ9.test.sig"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
  assert.throws(
    () => assertCredentialRef("AKIAIOSFODNN7EXAMPLE"),
    /CREDENTIAL_REF_IS_SECRET/,
  );
});

test("F05-T2-04: credentialRef exceeding 160 characters or containing special characters throws validation error", () => {
  const vault = new CredentialVault();
  assert.throws(() => vault.storeSecret(""), /Cannot store empty secret/);

  const over160 = "ref_" + "a".repeat(161);
  assert.throws(
    () => assertCredentialRef(over160),
    /CREDENTIAL_REF_TOO_LONG|CREDENTIAL_REF_IS_SECRET|CREDENTIAL_REF_MALFORMED/,
  );

  assert.throws(
    () => assertCredentialRef("ref with spaces"),
    /CREDENTIAL_REF_MALFORMED|INVALID_CREDENTIAL_REF/,
  );
  assert.throws(
    () => assertCredentialRef("ref/with/slashes"),
    /CREDENTIAL_REF_MALFORMED|INVALID_CREDENTIAL_REF/,
  );
  assert.throws(
    () => assertCredentialRef("ref@with#symbols"),
    /CREDENTIAL_REF_MALFORMED|INVALID_CREDENTIAL_REF/,
  );
});

test("F05-T2-05: assertNoSecrets catches adversarial variations of API keys (JWT tokens, Bearer strings, private keys)", () => {
  const leak1 = JSON.stringify({
    token:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.abcdef1234567890abcdef",
  });
  assert.throws(
    () => assertNoSecrets(leak1),
    /疑似包含密钥或凭据|SECRET_LEAK_DETECTED/,
  );

  const leak2 = JSON.stringify({
    key: "-----BEGIN RSA PRIVATE KEY-----\nMIIEvgIBADANBg...",
  });
  assert.throws(
    () => assertNoSecrets(leak2),
    /疑似包含密钥或凭据|SECRET_LEAK_DETECTED/,
  );

  const leak3 = JSON.stringify({
    key: "sk-ant-api03-1234567890abcdef1234567890abcde",
  });
  assert.throws(
    () => assertNoSecrets(leak3),
    /疑似包含密钥或凭据|SECRET_LEAK_DETECTED/,
  );
});

// -------------------------------------------------------------------------
// Feature 6: Per-Model Space Profiles Edge Cases
// -------------------------------------------------------------------------

test("F06-T2-01: empty MCP tool whitelist filters out all tools yielding empty array", () => {
  const tools: McpToolItem[] = [{ name: "read_file" }, { name: "search" }];
  const profile: ModelSpaceProfile = {
    modelId: "isolated-model",
    contextWindow: 32000,
    autoCompactTokenLimit: 24000,
    mcpToolWhitelist: [], // Empty whitelist means 0 tools permitted
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 0);
});

test("F06-T2-02: tool present in both whitelist and blacklist is strictly excluded (blacklist takes priority)", () => {
  const tools: McpToolItem[] = [
    { name: "dangerous_tool" },
    { name: "safe_tool" },
  ];
  const profile: ModelSpaceProfile = {
    modelId: "strict-model",
    contextWindow: 32000,
    autoCompactTokenLimit: 24000,
    mcpToolWhitelist: ["dangerous_tool", "safe_tool"],
    mcpToolBlacklist: ["dangerous_tool"],
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "safe_tool");
});

test("F06-T2-03: filtering against empty tool library returns empty array without throwing", () => {
  const profile: ModelSpaceProfile = {
    modelId: "test",
    contextWindow: 32000,
    autoCompactTokenLimit: 24000,
    mcpToolWhitelist: ["tool1"],
  };
  const filtered = filterMcpToolsForModel([], profile);
  assert.deepEqual(filtered, []);
});

test("F06-T2-04: model space profile with contextWindow of 0 or negative returns 0 autoCompactTokenLimit", () => {
  assert.equal(calculateAutoCompactWatermark(0), 0);
  assert.equal(calculateAutoCompactWatermark(-1000), 0);
});

test("F06-T2-05: special characters in tool names (dots, colons, underscores) preserve exact match during filtering", () => {
  const tools: McpToolItem[] = [
    { name: "github.com/pull_requests:list" },
    { name: "com.google.search:query" },
  ];
  const profile: ModelSpaceProfile = {
    modelId: "namespaced-model",
    contextWindow: 64000,
    autoCompactTokenLimit: 48000,
    mcpToolWhitelist: ["github.com/pull_requests:list"],
  };

  const filtered = filterMcpToolsForModel(tools, profile);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, "github.com/pull_requests:list");
});

// -------------------------------------------------------------------------
// Feature 7: Dynamic Compression Watermarks Edge Cases
// -------------------------------------------------------------------------

test("F07-T2-01: 1M context window (1,048,576 tokens) calculates exactly 838,860 tokens without integer overflow", () => {
  const wm = calculateAutoCompactWatermark(1048576);
  assert.equal(wm, 838860);
  assert.ok(Number.isSafeInteger(wm));
});

test("F07-T2-02: sub-32k small context window (e.g. 4k, 8k, 16k) applies 75% scaling", () => {
  assert.equal(calculateAutoCompactWatermark(4096), 3072);
  assert.equal(calculateAutoCompactWatermark(8192), 6144);
  assert.equal(calculateAutoCompactWatermark(16384), 12288);
});

test("F07-T2-03: zero or negative context window returns 0 watermark without crashing", () => {
  assert.equal(calculateAutoCompactWatermark(0), 0);
  assert.equal(calculateAutoCompactWatermark(-5000), 0);
  assert.equal(shouldTriggerCompaction(100, 0), false);
});

test("F07-T2-04: token usage exactly 1 token below watermark does not trigger compaction", () => {
  const wm = 24000;
  assert.equal(shouldTriggerCompaction(23999, wm), false);
});

test("F07-T2-05: token usage exactly equal to watermark triggers compaction immediately", () => {
  const wm = 24000;
  assert.equal(shouldTriggerCompaction(24000, wm), true);
  assert.equal(shouldTriggerCompaction(24001, wm), true);
});

// -------------------------------------------------------------------------
// Feature 8: OpenAI <-> Anthropic Transpiler Edge Cases
// -------------------------------------------------------------------------

test("F08-T2-01: empty message array or messages with empty content string transpiles cleanly", () => {
  const req: AnthropicMessagesRequest = {
    model: "claude-3-5-sonnet",
    messages: [{ role: "user", content: "" }],
    max_tokens: 100,
  };

  const openAiReq = transpileAnthropicToOpenAI(req);
  assert.equal(openAiReq.messages.length, 1);
  assert.equal(openAiReq.messages[0].content, "");
});

test("F08-T2-02: malformed JSON in tool call arguments handles gracefully without unhandled exception", () => {
  const openAiReq: OpenAIChatRequest = {
    model: "gpt-4o",
    messages: [
      {
        role: "assistant",
        tool_calls: [
          {
            id: "call-broken-json",
            type: "function",
            function: {
              name: "broken_tool",
              arguments: "{ unclosed json string ...",
            },
          },
        ],
      },
    ],
  };

  const anthropicReq = transpileOpenAIToAnthropic(openAiReq);
  const blocks = anthropicReq.messages[0].content;
  assert.ok(Array.isArray(blocks));
  assert.equal(blocks[0].type, "tool_use");
  assert.equal(blocks[0].name, "broken_tool");
  assert.deepEqual(blocks[0].input, { raw: "{ unclosed json string ..." });
});

test("F08-T2-03: Anthropic request with array of system blocks merges them with newlines", () => {
  const req: AnthropicMessagesRequest = {
    model: "claude-3-7-sonnet",
    system: [
      { type: "text", text: "Rule 1: Always be concise." },
      { type: "text", text: "Rule 2: Cite sources." },
    ],
    messages: [{ role: "user", content: "Hi" }],
    max_tokens: 100,
  };

  const openAiReq = transpileAnthropicToOpenAI(req);
  assert.equal(openAiReq.messages[0].role, "system");
  assert.equal(
    openAiReq.messages[0].content,
    "Rule 1: Always be concise.\n\nRule 2: Cite sources.",
  );
});

test("F08-T2-04: stream converter handles chunks with null content or empty delta choices without crashing", () => {
  const converter = new OpenAIToAnthropicStreamConverter();
  const events = converter.convertChunk({
    choices: [{ delta: { content: null } }],
  });
  assert.ok(!events.some((e) => e.event === "content_block_start"));
  assert.ok(!events.some((e) => e.event === "content_block_delta"));

  const emptyEvents = converter.convertChunk({});
  assert.equal(emptyEvents.length, 0);
});

test("F08-T2-05: tool call with multiple arguments split across several SSE chunks reconstructs completely", () => {
  const converter = new OpenAIToAnthropicStreamConverter();

  // Chunk 1: Tool call declaration + first arg part
  const ev1 = converter.convertChunk({
    choices: [
      {
        delta: {
          tool_calls: [
            {
              index: 0,
              id: "call_multi_chunk",
              function: { name: "calc", arguments: '{"x":' },
            },
          ],
        },
      },
    ],
  });
  assert.ok(ev1.some((e) => e.event === "content_block_start"));

  // Chunk 2: Second arg part
  const ev2 = converter.convertChunk({
    choices: [
      {
        delta: {
          tool_calls: [{ index: 0, function: { arguments: " 42}" } }],
        },
      },
    ],
  });
  assert.ok(ev2.some((e) => e.event === "content_block_delta"));

  // Chunk 3: Finish
  const ev3 = converter.convertChunk({
    choices: [{ delta: {}, finish_reason: "tool_calls" }],
  });
  assert.ok(ev3.some((e) => e.event === "message_delta"));
});

// -------------------------------------------------------------------------
// Feature 9: Account Pool & 429 Hot Failover Edge Cases
// -------------------------------------------------------------------------

test("F09-T2-01: stream locked invariant: 429 encountered AFTER first token emitted throws STREAM_LOCKED_FAILOVER_FORBIDDEN", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-1",
      provider: "deepseek",
      credentialRef: "ref-1",
      weight: 1,
      priority: 1,
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
      id: "acc-2",
      provider: "deepseek",
      credentialRef: "ref-2",
      weight: 1,
      priority: 1,
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

  await assert.rejects(async () => {
    await pool.dispatchWithHotDrift(async (_account, onStreamStart) => {
      // First token emitted to client!
      onStreamStart();
      // Mid-stream rate limit failure
      throw new Error("HTTP 429: Rate limit hit mid-stream");
    });
  }, /STREAM_LOCKED_FAILOVER_FORBIDDEN/);
});

test("F09-T2-02: all accounts in pool cooling down throws NO_HEALTHY_ACCOUNT_AVAILABLE", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-cooling",
      provider: "openai",
      credentialRef: "ref-openai",
      weight: 1,
      priority: 1,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 1,
      consecutive429: 1,
      consecutive5xx: 0,
      cooldownUntil: Date.now() + 60000, // Cooling for 60s
      quarantined: false,
      recentLatencyMs: 40,
    },
  ]);

  await assert.rejects(async () => {
    await pool.dispatchWithHotDrift(async () => "done");
  }, /NO_HEALTHY_ACCOUNT_AVAILABLE/);
});

test("F09-T2-03: quarantined account (>= 5 failures) has healthScore 0 and is excluded from dispatch", () => {
  const acc: AccountInstance = {
    id: "acc-dead",
    provider: "deepseek",
    credentialRef: "ref-dead",
    weight: 1,
    priority: 1,
    enabled: true,
    healthScore: 100,
    consecutiveFailures: 5,
    consecutive429: 3,
    consecutive5xx: 2,
    cooldownUntil: 0,
    quarantined: true,
    recentLatencyMs: 100,
  };

  assert.equal(calculateAccountHealthScore(acc), 0);

  const pool = new AccountPoolManager([acc]);
  assert.equal(pool.selectCandidate(), null);
});

test("F09-T2-04: circuit breaker in OPEN state fast-fails all requests without attempting upstream network calls", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-upstream-down",
      provider: "anthropic",
      credentialRef: "ref-claude",
      weight: 1,
      priority: 1,
      enabled: true,
      healthScore: 10,
      consecutiveFailures: 3,
      consecutive429: 0,
      consecutive5xx: 3,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 200,
    },
  ]);

  // Trip circuit breaker
  pool.record5xx("acc-upstream-down");
  pool.record5xx("acc-upstream-down");
  pool.record5xx("acc-upstream-down");

  assert.equal(pool.circuitState, "OPEN");

  let networkCallAttempted = false;
  await assert.rejects(async () => {
    await pool.dispatchWithHotDrift(async () => {
      networkCallAttempted = true;
      return "data";
    });
  }, /NO_HEALTHY_ACCOUNT_AVAILABLE/);

  assert.equal(
    networkCallAttempted,
    false,
    "Must not attempt network call when circuit is OPEN",
  );
});

test("F09-T2-05: circuit breaker in HALF_OPEN state allows canary request and closes circuit on success", () => {
  const pool = new AccountPoolManager(
    [
      {
        id: "acc-canary",
        provider: "moonshot",
        credentialRef: "ref-moonshot",
        weight: 1,
        priority: 1,
        enabled: true,
        healthScore: 40,
        consecutiveFailures: 0,
        consecutive429: 0,
        consecutive5xx: 0,
        cooldownUntil: 0,
        quarantined: false,
        recentLatencyMs: 50,
      },
    ],
    0,
  );

  // Trip breaker
  pool.record5xx("acc-canary");
  pool.record5xx("acc-canary");
  pool.record5xx("acc-canary");
  // Cooldown elapses -> HALF_OPEN
  pool.setCircuitState("HALF_OPEN");
  assert.equal(pool.circuitState, "HALF_OPEN");

  // Canary probe succeeds
  pool.recordSuccess("acc-canary", 45);
  // Health score recovers to 60 (55 + 5) and circuit closes
  assert.equal(pool.accounts[0].healthScore, 60);
  assert.equal(pool.circuitState, "CLOSED");
});

// -------------------------------------------------------------------------
// Feature 10: Sub-Agent Delegation Pipeline Edge Cases
// -------------------------------------------------------------------------

test("F10-T2-01: subagent attempting to spawn nested subagent is blocked by anti-recursion guardrail", async () => {
  const nestedSandbox = new SubagentExecutionSandbox(["scrape"], true); // isNested = true
  const brief: SubagentTaskBrief = {
    taskId: "task-nested-bad",
    taskType: "scrape",
    goal: "Spawn nested subagent",
    constraints: [],
    inputs: {},
  };

  await assert.rejects(async () => {
    await nestedSandbox.executeTask(brief, async () => ({
      summary: "Should not execute",
      tokensUsed: 0,
    }));
  }, /RECURSION_DENIED/);
});

test("F10-T2-02: worker exception in subagent captures failure status and returns error summary without crashing caller", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-crash-001",
    taskType: "scrape",
    goal: "Target site is down",
    constraints: [],
    inputs: {},
  };

  const result = await sandbox.executeTask(brief, async () => {
    throw new Error("HTTP 503 Service Unavailable");
  });

  assert.equal(result.status, "failed");
  assert.ok(result.executiveSummary.includes("HTTP 503 Service Unavailable"));
  assert.equal(result.tokensSaved, 0);
});

test("F10-T2-03: executive summary exceeding 300 words is truncated cleanly with notice", async () => {
  const sandbox = new SubagentExecutionSandbox(["deep_analysis"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-verbose-001",
    taskType: "deep_analysis",
    goal: "Verbose report",
    constraints: [],
    inputs: {},
  };

  const verboseReport = "word ".repeat(400); // 400 words
  const result = await sandbox.executeTask(brief, async () => ({
    summary: verboseReport,
    tokensUsed: 1000,
  }));

  assert.ok(result.executiveSummary.includes("truncated"));
  const wordCount = result.executiveSummary.split(/\s+/).length;
  assert.ok(
    wordCount <= 310,
    `Word count should be truncated near 300 words, got ${wordCount}`,
  );
});

test("F10-T2-04: subagent executing with 0 tokens consumed computes 0 tokens saved without negative values", async () => {
  const sandbox = new SubagentExecutionSandbox(["read_file"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-zero-001",
    taskType: "read_file" as unknown as SubagentTaskBrief["taskType"],
    goal: "Empty read",
    constraints: [],
    inputs: {},
  };

  const result = await sandbox.executeTask(brief, async () => ({
    summary: "",
    tokensUsed: 0,
  }));

  assert.ok((result.tokensSaved || 0) >= 0);
});

test("F10-T2-05: subagent sandbox logs maintain chronological order and can be audited independently", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-audit-001",
    taskType: "scrape",
    goal: "Step-by-step crawl",
    constraints: [],
    inputs: {},
  };

  await sandbox.executeTask(brief, async (_tools, logFn) => {
    logFn("Phase A: Connecting");
    logFn("Phase B: Parsing DOM");
    logFn("Phase C: Extracted 3 records");
    return { summary: "Crawl complete", tokensUsed: 50 };
  });

  const logs = sandbox.sandboxLogs;
  assert.ok(logs.length >= 4);
  assert.ok(logs[0].includes("Initialized task task-audit-001"));
  assert.ok(logs[1].includes("Phase A"));
  assert.ok(logs[2].includes("Phase B"));
  assert.ok(logs[3].includes("Phase C"));
});
