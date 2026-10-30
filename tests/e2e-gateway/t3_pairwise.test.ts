import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateContextGauge,
  computeCacheBadge,
  calculateOutputTps,
  applyReasoningEffort,
  ModelProbeStore,
  findPresetById,
  parseCcSwitchDeeplink,
  CredentialVault,
  filterMcpToolsForModel,
  calculateAutoCompactWatermark,
  shouldTriggerCompaction,
  transpileAnthropicToOpenAI,
  transpileOpenAIToAnthropic,
  transpileOpenAIResponseToAnthropic,
  OpenAIToAnthropicStreamConverter,
  AccountPoolManager,
  SubagentExecutionSandbox,
  type ModelSpaceProfile,
  type McpToolItem,
  type AnthropicMessagesRequest,
  type OpenAIChatResponse,
  type CreationDraftLike,
} from "./harness.ts";

/* =========================================================================
 * Tier 3: Cross-Feature Interactions (Pairwise Permutations)
 * Total: 10 Test Cases
 * ========================================================================= */

test("SCENARIO-T3-01: Transpiler with Account Pool 429 failover", async () => {
  // Client makes Anthropic request -> Transpiled to OpenAI -> Account 1 hits 429 -> Hot failover to Account 2 -> Transpiled back to Anthropic
  const anthropicReq: AnthropicMessagesRequest = {
    model: "deepseek-chat",
    messages: [{ role: "user", content: "Summarize distributed consensus" }],
    max_tokens: 1024,
  };

  const openAiReq = transpileAnthropicToOpenAI(anthropicReq);
  assert.equal(openAiReq.model, "deepseek-chat");

  const pool = new AccountPoolManager([
    {
      id: "acc-deepseek-1",
      provider: "deepseek",
      credentialRef: "ref-ds-1",
      weight: 10,
      priority: 2,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 40,
    },
    {
      id: "acc-deepseek-2",
      provider: "deepseek",
      credentialRef: "ref-ds-2",
      weight: 5,
      priority: 2,
      enabled: true,
      healthScore: 98,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 45,
    },
  ]);

  const dispatchResult = await pool.dispatchWithHotDrift<OpenAIChatResponse>(
    async (account) => {
      if (account.id === "acc-deepseek-1") {
        throw new Error("HTTP 429: Rate limit exceeded");
      }
      return {
        id: "chatcmpl-failover-success",
        model: "deepseek-chat",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Consensus ensures replicas agree on state.",
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      };
    },
  );

  assert.equal(dispatchResult.drifted, true);
  assert.equal(dispatchResult.finalAccountId, "acc-deepseek-2");

  // Transpile response back to Anthropic
  const anthropicResp = transpileOpenAIResponseToAnthropic(
    dispatchResult.result,
  );
  assert.equal(anthropicResp.role, "assistant");
  assert.equal(anthropicResp.content[0].type, "text");
  assert.equal(
    anthropicResp.content[0].text,
    "Consensus ensures replicas agree on state.",
  );
  assert.equal(anthropicResp.stop_reason, "end_turn");
});

test("SCENARIO-T3-02: UsageStatusBar with ModelSpaceProfile watermark", () => {
  // ModelSpaceProfile for deepseek-v3 (64k context window -> 48k watermark)
  const profile: ModelSpaceProfile = {
    modelId: "deepseek-v3[64K]",
    contextWindow: 64 * 1024,
    autoCompactTokenLimit: calculateAutoCompactWatermark(64 * 1024),
  };

  assert.equal(profile.autoCompactTokenLimit, 49152); // 75% of 64k

  // Draft with 40,000 words -> ~50,000 tokens
  const draftText = "word ".repeat(39000);
  const gauge = calculateContextGauge(
    { text: draftText, model: profile.modelId },
    512,
  );

  assert.ok(gauge.usedTokens > profile.autoCompactTokenLimit);
  assert.equal(
    shouldTriggerCompaction(gauge.usedTokens, profile.autoCompactTokenLimit),
    true,
  );
  assert.equal(gauge.tier, "warning"); // ~76% usage triggers warning tier
});

test("SCENARIO-T3-03: ModelPicker probing with Provider Preset discovery", async () => {
  const store = new ModelProbeStore(60000);
  const presets = [
    findPresetById("deepseek"),
    findPresetById("siliconflow"),
    findPresetById("ollama"),
  ].filter(Boolean);

  assert.equal(presets.length, 3);

  // Probe each discovered preset
  const metrics = await Promise.all(
    presets.map((p) =>
      store.probe(p!.id, async () => {
        const fakeLatency =
          p!.id === "ollama" ? 15 : p!.id === "deepseek" ? 85 : 120;
        return { latencyMs: fakeLatency, ok: true };
      }),
    ),
  );

  assert.equal(metrics[0].targetId, "deepseek");
  assert.equal(metrics[0].tier, "fast");
  assert.equal(metrics[1].targetId, "siliconflow");
  assert.equal(metrics[1].tier, "moderate");
  assert.equal(metrics[2].targetId, "ollama");
  assert.equal(metrics[2].tier, "fast");
});

test("SCENARIO-T3-04: Subagent delegation with Transpiler streaming", async () => {
  const sandbox = new SubagentExecutionSandbox(["scrape"]);
  const converter = new OpenAIToAnthropicStreamConverter();

  const foldback = await sandbox.executeTask(
    {
      taskId: "task-stream-transpile",
      taskType: "scrape",
      goal: "Stream data",
      constraints: [],
      inputs: {},
    },
    async (_tools, logFn) => {
      // Simulate OpenAI streaming chunks inside subagent
      const chunk1 = {
        choices: [{ delta: { reasoning_content: "Checking site..." } }],
      };
      const chunk2 = {
        choices: [{ delta: { content: "Site status 200 OK." } }],
      };
      const chunk3 = { choices: [{ delta: {}, finish_reason: "stop" }] };

      const events = [
        ...converter.convertChunk(chunk1),
        ...converter.convertChunk(chunk2),
        ...converter.convertChunk(chunk3),
      ];

      for (const ev of events) {
        logFn(`Event: ${ev.event}`);
      }

      return {
        summary:
          "Stream verified and converted to Anthropic format successfully.",
        tokensUsed: 150,
      };
    },
  );

  assert.equal(foldback.status, "success");
  assert.ok(sandbox.sandboxLogs.some((l) => l.includes("content_block_start")));
  assert.ok(sandbox.sandboxLogs.some((l) => l.includes("content_block_delta")));
  assert.ok(sandbox.sandboxLogs.some((l) => l.includes("message_stop")));
});

test("SCENARIO-T3-05: Deeplink import with Account Pool registration", () => {
  const deeplink =
    "ccswitch://v1/import?name=Kimi-Relay&endpoint=https%3A%2F%2Fapi.moonshot.cn%2Fv1&apiKey=sk-kimi-secret-1234567890abcdef&model=moonshot-v1-32k";
  const payload = parseCcSwitchDeeplink(deeplink);

  assert.equal(payload.name, "Kimi-Relay");
  assert.equal(payload.endpoint, "https://api.moonshot.cn/v1");

  const vault = new CredentialVault();
  const ref = vault.storeSecret(payload.apiKey!, "moonshot");

  const pool = new AccountPoolManager();
  pool.addAccount({
    id: "acc-kimi-imported",
    provider: "moonshot",
    credentialRef: ref,
    weight: 1,
    priority: 1,
    enabled: true,
    healthScore: 100,
    consecutiveFailures: 0,
    consecutive429: 0,
    consecutive5xx: 0,
    cooldownUntil: 0,
    quarantined: false,
    recentLatencyMs: 60,
  });

  assert.equal(pool.accounts.length, 1);
  assert.equal(pool.accounts[0].credentialRef, ref);
  assert.equal(pool.accounts[0].healthScore, 100);
});

test("SCENARIO-T3-06: Per-Model Space reasoning effort default with UsageStatusBar", () => {
  const profile: ModelSpaceProfile = {
    modelId: "deepseek-reasoner",
    contextWindow: 65536,
    autoCompactTokenLimit: 49152,
    defaultReasoningEffort: "high",
  };

  let draft: CreationDraftLike = {
    prompt: "Prove Riemann Hypothesis",
    model: profile.modelId,
  };

  // Attach space profile default reasoning effort if not explicitly defined
  if (!draft.reasoningEffort && profile.defaultReasoningEffort) {
    draft = applyReasoningEffort(draft, profile.defaultReasoningEffort);
  }

  assert.equal(draft.reasoningEffort, "high");

  const gauge = calculateContextGauge({
    text: draft.prompt,
    model: draft.model,
  });
  assert.equal(gauge.maxTokens, 64000);
  assert.equal(gauge.tier, "normal");
});

test("SCENARIO-T3-07: Dynamic watermarks triggering Subagent task delegation", async () => {
  const profile: ModelSpaceProfile = {
    modelId: "claude-3-7-sonnet[200K]",
    contextWindow: 200 * 1024,
    autoCompactTokenLimit: calculateAutoCompactWatermark(200 * 1024), // 160k
  };

  const currentTokens = 165000;
  const isOverWatermark = shouldTriggerCompaction(
    currentTokens,
    profile.autoCompactTokenLimit,
  );
  assert.equal(isOverWatermark, true);

  // Trigger compaction subagent
  const sandbox = new SubagentExecutionSandbox(["read_file"]);
  const result = await sandbox.executeTask(
    {
      taskId: "task-compact-context-001",
      taskType: "deep_analysis",
      goal: "Compress previous 20 conversation turns into executive summary",
      constraints: ["Keep architecture decisions", "Keep API contracts"],
      inputs: { turnsToCompact: 20 },
    },
    async (_tools, logFn) => {
      logFn("Compacting 50,000 tokens of chat turns...");
      return {
        summary:
          "Context compacted: Established Hexagonal Core and Account Pool multi-key routing.",
        tokensUsed: 50000,
      };
    },
  );

  assert.equal(result.status, "success");
  assert.ok(result.tokensSaved! > 49000);
});

test("SCENARIO-T3-08: Circuit breaker tripping leading to alternative Preset routing", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-claude-primary",
      provider: "anthropic",
      credentialRef: "ref-claude-official",
      weight: 10,
      priority: 2,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 40,
    },
  ]);

  // Trip circuit breaker with 3 5xx errors
  pool.record5xx("acc-claude-primary");
  pool.record5xx("acc-claude-primary");
  pool.record5xx("acc-claude-primary");
  assert.equal(pool.circuitState, "OPEN");

  // Primary gateway is down; router looks up alternative relay from 52 presets
  const openRouterPreset = findPresetById("openrouter");
  assert.ok(openRouterPreset);
  assert.equal(openRouterPreset.category, "网关");

  // Dispatch via alternative preset
  const altReq = transpileAnthropicToOpenAI({
    model: "anthropic/claude-3-7-sonnet",
    messages: [{ role: "user", content: "Alternative path" }],
    max_tokens: 100,
  });

  assert.equal(altReq.model, "anthropic/claude-3-7-sonnet");
  assert.equal(altReq.messages[0].content, "Alternative path");
});

test("SCENARIO-T3-09: Tool Whitelist filtering with Transpiler tool calling", () => {
  const allMcpTools: McpToolItem[] = [
    { name: "read_file", category: "filesystem" },
    { name: "write_file", category: "filesystem" },
    { name: "execute_shell", category: "system" },
  ];

  const profile: ModelSpaceProfile = {
    modelId: "read-only-agent",
    contextWindow: 128000,
    autoCompactTokenLimit: 96000,
    mcpToolWhitelist: ["read_file"], // Only read_file allowed
  };

  const allowedTools = filterMcpToolsForModel(allMcpTools, profile);
  assert.equal(allowedTools.length, 1);
  assert.equal(allowedTools[0].name, "read_file");

  // Transpile to Anthropic request with only allowed tool
  const anthropicReq: AnthropicMessagesRequest = {
    model: profile.modelId,
    tools: allowedTools.map((t) => ({
      name: t.name,
      description: `Tool for ${t.name}`,
      input_schema: {
        type: "object",
        properties: { path: { type: "string" } },
      },
    })),
    messages: [{ role: "user", content: "Read index.ts" }],
    max_tokens: 500,
  };

  const openAiReq = transpileAnthropicToOpenAI(anthropicReq);
  assert.equal(openAiReq.tools?.length, 1);
  assert.equal(openAiReq.tools?.[0].function.name, "read_file");

  // Transpile back to Anthropic
  const roundTrip = transpileOpenAIToAnthropic(openAiReq);
  assert.equal(roundTrip.tools?.length, 1);
  assert.equal(roundTrip.tools?.[0].name, "read_file");
});

test("SCENARIO-T3-10: Prompt cache detection with UsageStatusBar cache badge and TPS calculation", () => {
  const promptTokens = 10000;
  const cachedTokens = 8500;
  const completionTokens = 150;
  const elapsedMs = 2500;

  const cacheBadge = computeCacheBadge(cachedTokens, promptTokens);
  assert.equal(cacheBadge.active, true);
  assert.equal(cacheBadge.percentage, 85);
  assert.equal(cacheBadge.label, "⚡ Cached (85%)");

  const tpsMetric = calculateOutputTps(completionTokens, elapsedMs);
  assert.equal(tpsMetric.tps, 60);
  assert.equal(tpsMetric.label, "60 tps");

  const gauge = calculateContextGauge(
    { text: "Continue coding session", model: "claude-3-7-sonnet[200K]" },
    promptTokens + completionTokens,
  );
  assert.ok(gauge.usedTokens > 10000);
  assert.equal(gauge.tier, "normal");
});
