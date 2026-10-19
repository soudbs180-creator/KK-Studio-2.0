import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateContextGauge,
  computeCacheBadge,
  calculateOutputTps,
  ModelProbeStore,
  findPresetById,
  calculateAutoCompactWatermark,
  shouldTriggerCompaction,
  transpileAnthropicToOpenAI,
  transpileOpenAIResponseToAnthropic,
  OpenAIToAnthropicStreamConverter,
  AccountPoolManager,
  SubagentExecutionSandbox,
  type ModelSpaceProfile,
  type AnthropicMessagesRequest,
  type OpenAIChatResponse,
  type SubagentTaskBrief,
} from "./harness.ts";

/* =========================================================================
 * Tier 4: Real-World Workload Scenarios (Full End-to-End Workflows)
 * Total: 5 Test Cases
 * ========================================================================= */

test("SCENARIO-T4-01: Long research session with subagent web scraping and foldback card", async () => {
  // Main session context has base conversation history
  const mainSessionTokens = 3500;
  const mainModelWindow = 128 * 1024; // 131,072
  const watermark = calculateAutoCompactWatermark(mainModelWindow); // 98,304

  // Main agent delegates heavy research to subagent sandbox
  const sandbox = new SubagentExecutionSandbox(["scrape", "read_file"]);
  const brief: SubagentTaskBrief = {
    taskId: "task-market-research-2026",
    taskType: "scrape",
    goal: "Investigate 2026 Q3 enterprise LLM inference cost benchmarks across 5 providers",
    constraints: ["Exclude speculative blogs", "Extract official per-token prices"],
    inputs: {
      providers: ["deepseek", "openai", "anthropic", "moonshot", "siliconflow"],
    },
  };

  const foldbackResult = await sandbox.executeTask(brief, async (_tools, logFn) => {
    // Subagent generates heavy intermediate exploratory logs (thousands of tokens)
    const rawPages = [
      "https://platform.openai.com/docs/pricing (15,400 bytes)",
      "https://api-docs.deepseek.com/pricing (12,800 bytes)",
      "https://docs.anthropic.com/pricing (18,200 bytes)",
      "https://platform.moonshot.cn/pricing (9,600 bytes)",
      "https://cloud.siliconflow.cn/pricing (11,100 bytes)",
    ];

    for (const page of rawPages) {
      logFn(`Fetched & parsed DOM tree from ${page}`);
    }

    return {
      summary:
        "Comprehensive 2026 benchmark completed: DeepSeek offers lowest input at $0.14/M; SiliconFlow relays at $0.20/M; Moonshot at $0.40/M; Anthropic Claude 3.7 at $3.00/M; OpenAI GPT-4o at $2.50/M. DeepSeek and SiliconFlow lead cost efficiency.",
      data: {
        deepseek: { inputPerMillion: 0.14, outputPerMillion: 0.28 },
        siliconflow: { inputPerMillion: 0.2, outputPerMillion: 0.4 },
        moonshot: { inputPerMillion: 0.4, outputPerMillion: 0.8 },
        openai: { inputPerMillion: 2.5, outputPerMillion: 10.0 },
        anthropic: { inputPerMillion: 3.0, outputPerMillion: 15.0 },
      },
      artifacts: ["artifact-pricing-matrix-2026.json"],
      tokensUsed: 14800, // Heavy intermediate tokens
    };
  });

  assert.equal(foldbackResult.status, "success");
  assert.equal(foldbackResult.subagentRole, "subagent-scrape");
  assert.ok(foldbackResult.tokensConsumed! >= 14800);
  assert.ok(foldbackResult.tokensSaved! > 14000);

  // Main session receives ONLY the compact foldback summary
  const foldbackCardTokens = 85;
  const updatedMainTokens = mainSessionTokens + foldbackCardTokens;

  // Main session token count remains completely clean and well below watermark limit
  assert.ok(updatedMainTokens < watermark);
  const gauge = calculateContextGauge({ text: foldbackResult.executiveSummary, model: "gpt-4o" }, mainSessionTokens);
  assert.equal(gauge.tier, "normal");
  assert.ok(gauge.percentage < 5); // Under 5% window usage
});

test("SCENARIO-T4-02: Multi-turn coding session hitting 429 and hot-drifting across account pool", async () => {
  const pool = new AccountPoolManager([
    {
      id: "acc-coder-1",
      provider: "deepseek",
      credentialRef: "ref-coder-key-1",
      weight: 10,
      priority: 2,
      enabled: true,
      healthScore: 100,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 35,
    },
    {
      id: "acc-coder-2",
      provider: "deepseek",
      credentialRef: "ref-coder-key-2",
      weight: 5,
      priority: 2,
      enabled: true,
      healthScore: 95,
      consecutiveFailures: 0,
      consecutive429: 0,
      consecutive5xx: 0,
      cooldownUntil: 0,
      quarantined: false,
      recentLatencyMs: 40,
    },
  ]);

  // Turn 1: Account 1 executes successfully
  const turn1 = await pool.dispatchWithHotDrift(async (acc) => {
    assert.equal(acc.id, "acc-coder-1");
    return { code: "export function parseAst() { return true; }" };
  });
  assert.equal(turn1.drifted, false);
  assert.equal(turn1.finalAccountId, "acc-coder-1");

  // Turn 2: Account 1 hits HTTP 429 rate limit before first token
  let turn2Attempts = 0;
  const turn2 = await pool.dispatchWithHotDrift(async (acc, _onStream) => {
    turn2Attempts++;
    if (acc.id === "acc-coder-1") {
      throw new Error("HTTP 429: Rate limit quota exceeded. Try again in 5s.");
    }
    return { code: "export function optimizeTree() { return 42; }" };
  });

  assert.equal(turn2.drifted, true);
  assert.equal(turn2.attempts, 2);
  assert.equal(turn2.finalAccountId, "acc-coder-2");
  assert.equal(turn2Attempts, 2);
  assert.equal(turn2.result.code, "export function optimizeTree() { return 42; }");

  // Turn 3: Account 2 continues servicing subsequent requests while Account 1 is in cooldown
  const turn3 = await pool.dispatchWithHotDrift(async (acc) => {
    assert.equal(acc.id, "acc-coder-2");
    return { code: "export function runBenchmarks() { return [100, 200]; }" };
  });
  assert.equal(turn3.finalAccountId, "acc-coder-2");
  assert.equal(turn3.drifted, false);
});

test("SCENARIO-T4-03: Switching from Claude to DeepSeek via preset and running with dynamic watermarks", () => {
  // Step 1: User starts on Claude 3.7 Sonnet (200k context window)
  const claudeProfile: ModelSpaceProfile = {
    modelId: "claude-3-7-sonnet[200K]",
    contextWindow: 200 * 1024,
    autoCompactTokenLimit: calculateAutoCompactWatermark(200 * 1024), // 163,840
  };
  assert.equal(claudeProfile.autoCompactTokenLimit, 163840);

  // Session transcript of ~49,500 tokens
  const draftPrompt = "spec ".repeat(38000);
  const claudeGauge = calculateContextGauge({ text: draftPrompt, model: claudeProfile.modelId }, 2000);

  // On Claude 200k window, 55k tokens is ~27% (tier: normal)
  assert.equal(claudeGauge.tier, "normal");
  assert.equal(shouldTriggerCompaction(claudeGauge.usedTokens, claudeProfile.autoCompactTokenLimit), false);

  // Step 2: User switches to DeepSeek-V3 via 52-preset catalog
  const deepseekPreset = findPresetById("deepseek");
  assert.ok(deepseekPreset);

  const deepseekProfile: ModelSpaceProfile = {
    modelId: "deepseek-chat[64K]",
    contextWindow: 64 * 1024,
    autoCompactTokenLimit: calculateAutoCompactWatermark(64 * 1024), // 49,152
  };
  assert.equal(deepseekProfile.autoCompactTokenLimit, 49152);

  // Step 3: Gauge recalculates against new 64k model window
  const deepseekGauge = calculateContextGauge({ text: draftPrompt, model: deepseekProfile.modelId }, 2000);

  // On 64k window, 49.5k tokens is ~76% -> Warning tier & triggers compaction!
  assert.equal(deepseekGauge.tier, "warning");
  assert.equal(shouldTriggerCompaction(deepseekGauge.usedTokens, deepseekProfile.autoCompactTokenLimit), true);

  // Step 4: Transpiler converts Anthropic formatted session history to DeepSeek's OpenAI-compatible wire protocol
  const anthropicHistory: AnthropicMessagesRequest = {
    model: "deepseek-chat",
    system: "You are an expert compiler engineer.",
    messages: [
      { role: "user", content: "Implement WebAssembly generator." },
      { role: "assistant", content: "Here is the codegen logic." },
    ],
    max_tokens: 4096,
  };

  const openAiAdaptedReq = transpileAnthropicToOpenAI(anthropicHistory);
  assert.equal(openAiAdaptedReq.model, "deepseek-chat");
  assert.equal(openAiAdaptedReq.messages[0].role, "system");
  assert.equal(openAiAdaptedReq.messages[1].role, "user");
  assert.equal(openAiAdaptedReq.messages[2].role, "assistant");
});

test("SCENARIO-T4-04: Fast model probing and prompt caching with UsageStatusBar feedback", async () => {
  const probeStore = new ModelProbeStore(60000);

  // Background probing of 3 candidate channels
  const [fastMetric, moderateMetric, slowMetric] = await Promise.all([
    probeStore.probe("local-vllm", async () => ({ latencyMs: 22, ttftMs: 65, ok: true })),
    probeStore.probe("cloud-deepseek", async () => ({ latencyMs: 135, ttftMs: 280, ok: true })),
    probeStore.probe("overseas-relay", async () => ({ latencyMs: 650, ttftMs: 1400, ok: true })),
  ]);

  assert.equal(fastMetric.tier, "fast"); // Green pill
  assert.equal(moderateMetric.tier, "moderate"); // Yellow pill
  assert.equal(slowMetric.tier, "slow"); // Red pill

  // User selects fast local channel and submits prompt sharing 8,000 cached prefix tokens
  const totalPromptTokens = 10000;
  const cachedPrefixTokens = 8000;
  const completionTokens = 120;
  const streamDurationMs = 1800;

  // UsageStatusBar Cache Badge computes hit rate
  const cacheBadge = computeCacheBadge(cachedPrefixTokens, totalPromptTokens);
  assert.equal(cacheBadge.active, true);
  assert.equal(cacheBadge.percentage, 80);
  assert.equal(cacheBadge.label, "⚡ Cached (80%)");

  // Output TPS calculated dynamically from stream timing
  const tps = calculateOutputTps(completionTokens, streamDurationMs);
  assert.equal(tps.tps, 66.7);
  assert.equal(tps.label, "67 tps");

  // Overall status bar gauge
  const gauge = calculateContextGauge(
    { text: "", model: "vllm-local[32K]" },
    totalPromptTokens + completionTokens,
  );
  assert.ok(gauge.displayString.includes("10,120"));
  assert.equal(gauge.tier, "normal");
});

test("SCENARIO-T4-05: Complex tool calling across Anthropic-only client and OpenAI-compatible gateway", () => {
  // Step 1: Anthropic-only desktop client submits request with tool declarations
  const clientReq: AnthropicMessagesRequest = {
    model: "gpt-4o",
    system: "You are a financial calculator agent.",
    tools: [
      {
        name: "calculate_compound_interest",
        description: "Calculate future investment value",
        input_schema: {
          type: "object",
          properties: {
            principal: { type: "number" },
            rate: { type: "number" },
            years: { type: "number" },
          },
          required: ["principal", "rate", "years"],
        },
      },
    ],
    tool_choice: { type: "auto" },
    messages: [
      {
        role: "user",
        content: "Calculate return for $10,000 at 7% over 10 years.",
      },
    ],
    max_tokens: 1024,
  };

  // Step 2: Gateway Transpiler translates to OpenAI Chat format
  const gatewayOpenAiReq = transpileAnthropicToOpenAI(clientReq);
  assert.equal(gatewayOpenAiReq.tools?.length, 1);
  assert.equal(gatewayOpenAiReq.tools?.[0].function.name, "calculate_compound_interest");
  assert.equal(gatewayOpenAiReq.tool_choice, "auto");
  assert.equal(gatewayOpenAiReq.messages[0].role, "system");
  assert.equal(gatewayOpenAiReq.messages[1].role, "user");

  // Step 3: Upstream OpenAI endpoint returns tool call execution intent
  const upstreamOpenAiResp: OpenAIChatResponse = {
    id: "chatcmpl-tool-call-001",
    model: "gpt-4o",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          tool_calls: [
            {
              id: "call_interest_calc_1",
              type: "function",
              function: {
                name: "calculate_compound_interest",
                arguments: JSON.stringify({ principal: 10000, rate: 0.07, years: 10 }),
              },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: { prompt_tokens: 45, completion_tokens: 22, total_tokens: 67 },
  };

  // Step 4: Transpiler bridges OpenAI response to Anthropic message format
  const clientAnthropicResp = transpileOpenAIResponseToAnthropic(upstreamOpenAiResp);
  assert.equal(clientAnthropicResp.stop_reason, "tool_use");
  assert.equal(clientAnthropicResp.content.length, 1);
  const toolBlock = clientAnthropicResp.content[0];
  assert.equal(toolBlock.type, "tool_use");
  assert.equal(toolBlock.name, "calculate_compound_interest");
  assert.deepEqual(toolBlock.input, { principal: 10000, rate: 0.07, years: 10 });

  // Step 5: Client executes tool and provides tool_result
  const clientFollowUp: AnthropicMessagesRequest = {
    model: "gpt-4o",
    messages: [
      ...clientReq.messages,
      {
        role: "assistant",
        content: [toolBlock],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: JSON.stringify({ futureValue: 19671.51 }),
          },
        ],
      },
    ],
    max_tokens: 1024,
  };

  const finalOpenAiReq = transpileAnthropicToOpenAI(clientFollowUp);
  assert.equal(finalOpenAiReq.messages.length, 3);
  const toolResultMsg = finalOpenAiReq.messages[2];
  assert.equal(toolResultMsg.role, "tool");
  assert.equal(toolResultMsg.tool_call_id, "call_interest_calc_1");
  assert.equal(toolResultMsg.content, JSON.stringify({ futureValue: 19671.51 }));

  // Step 6: SSE Stream from upstream is translated back to Anthropic SSE events
  const streamConverter = new OpenAIToAnthropicStreamConverter();
  const chunkEvents = streamConverter.convertChunk({
    choices: [
      {
        delta: {
          content: "The investment will grow to $19,671.51 after 10 years.",
        },
        finish_reason: "stop",
      },
    ],
  });

  assert.ok(chunkEvents.some((e) => e.event === "content_block_start"));
  assert.ok(chunkEvents.some((e) => e.event === "content_block_delta"));
  assert.ok(chunkEvents.some((e) => e.event === "message_delta"));
  assert.ok(chunkEvents.some((e) => e.event === "message_stop"));
});
