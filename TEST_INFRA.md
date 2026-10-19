# Test Infrastructure: CC Switch & Codex++ Gateway and Usage Status Bar Integration

## 1. Overview & Test Runner Taxonomy

KK-Studio 2.0 uses a tiered, zero-extra-dependency test runner taxonomy aligned with the project's architecture:

| Tier | Category | Runner | Command | Target / Scope |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage (Happy Path) | `node:test` (Node 24 native TypeScript stripping) | `node --test tests/e2e-gateway/t1_features.test.ts` | 50 tests covering core functional contracts across all 10 features |
| **Tier 2** | Boundary & Corner Cases | `node:test` (Node 24 native TypeScript stripping) | `node --test tests/e2e-gateway/t2_boundaries.test.ts` | 50 tests covering edge cases, extreme limits, and error paths across all 10 features |
| **Tier 3** | Cross-Feature Interactions | `node:test` (Node 24 native TypeScript stripping) | `node --test tests/e2e-gateway/t3_pairwise.test.ts` | 10 tests covering pairwise cross-feature permutations and integrations |
| **Tier 4** | Real-World Workload Scenarios | `node:test` (Node 24 native TypeScript stripping) | `node --test tests/e2e-gateway/t4_scenarios.test.ts` | 5 tests covering end-to-end user and agent workflow scenarios |
| **All Tiers** | Combined Acceptance Suite | Node 24 Runner Script | `node tests/e2e-gateway/runner.mjs` | Complete 115-test suite execution with consolidated reporting |

*Note: In accordance with repository architecture decisions, Vitest and Jest are strictly prohibited. All TypeScript unit and E2E test files execute directly with Node 24 native runner using `node:test` and `node:assert/strict`.*

---

## 2. Test Suite Inventory

### 2.1 E2E Gateway & Usage Status Bar Test Suites (`tests/e2e-gateway/`)

1. **Tier 1: Feature Coverage (`tests/e2e-gateway/t1_features.test.ts`)**
   - **Command**: `node --test tests/e2e-gateway/t1_features.test.ts`
   - **Coverage (50 tests, 5 per feature)**:
     - **Feature 1 (UsageStatusBar Component)**: Token estimation across ASCII/CJK/mixed text, multimodal image attachment weights (1,024 tokens each), max context window parsing from suffixes (`[200K]`, `[1M]`), prompt cache badge formatting, output TPS calculation, and 24px height constraint.
     - **Feature 2 (Reasoning Effort Selector)**: Validation and application of `low` | `medium` | `high` efforts, reasoning model classification (`o1`, `o3`, `deepseek-reasoner`, `claude-3-7`), immutable draft updates, non-reasoning model selector gating, and default effort persistence.
     - **Feature 3 (Latency Probing Store & Badges)**: 3-tier latency classification (`fast` <100ms, `moderate` <500ms, `slow` >=500ms), Ping vs TTFT metric recording, 60s TTL cache dedup, concurrent probe coalescing, and failure error handling.
     - **Feature 4 (50+ Provider Presets Catalog)**: 52 domestic, international, relay, and local offline presets, grouping into "官方" | "网关" | "本地", wire protocol validation, auth mode specification, and documentation links.
     - **Feature 5 (Deeplink Import & CredentialRef)**: CC Switch deeplink format parsing (`ccswitch://v1/import`), endpoint path normalization, secret detection (`looksLikeSecret`), opaque vault references (`ref-xxxx`), and export leak prevention (`assertNoSecrets`).
     - **Feature 6 (Per-Model Space Profiles)**: ModelSpaceProfile binding, model-specific MCP tool whitelist/blacklist filtering, isolation of sensitive tools, passthrough defaults, and per-model temperature/reasoning defaults.
     - **Feature 7 (Dynamic Compression Watermarks)**: 75% watermark for <=32k and <=128k models, 80% watermark for 200k and 1M models, and compaction threshold detection (`shouldTriggerCompaction`).
     - **Feature 8 (OpenAI <-> Anthropic Transpiler)**: Request translation (system extraction, roles, thinking blocks ↔ `reasoning_content`, `tool_use` ↔ `tool_calls`), non-streaming response bridging, and bidirectional SSE streaming chunk state machine.
     - **Feature 9 (Account Pool & 429 Hot Failover)**: Load balancing candidate selection, dynamic health scoring (0-100 EWMA), seamless <15ms hot failover on pre-stream 429 errors, recovery on success, and 5xx 3-state circuit breaker.
     - **Feature 10 (Sub-Agent Delegation Pipeline)**: TaskBrief specification, clean sandbox isolation (no parent history inheritance), allowed tool scoping, structured foldback result generation (<=300 words), and token savings tracking.

2. **Tier 2: Boundary & Corner Cases (`tests/e2e-gateway/t2_boundaries.test.ts`)**
   - **Command**: `node --test tests/e2e-gateway/t2_boundaries.test.ts`
   - **Coverage (50 tests, 5 per feature)**:
     - **Feature 1**: Token overflow (100%+ window clamping and danger tier), exact CJK vs ASCII boundary partitions, zero-token drafts with base system overhead, million-token formatting with thousand separators, zero/negative elapsed time TPS handling.
     - **Feature 2**: Invalid effort strings rejection, null/undefined/non-string rejection, case variations rejection (fail-closed), model ID regex boundary matching, immutable draft isolation under rapid turn switching.
     - **Feature 3**: 0ms latency classification as fast, exact boundaries (99ms vs 100ms, 499ms vs 500ms), negative/NaN latency error classification, 3000ms probe timeout recovery, exact 60,001ms TTL cache eviction.
     - **Feature 4**: Non-existent preset queries returning undefined, empty filter criteria handling, trailing slash normalization, domestic region tag integrity, local offline provider loopback addresses and none auth mode.
     - **Feature 5**: Malformed deeplink protocol rejection, missing endpoint parameter rejection, raw secret supplied as reference rejection (`CREDENTIAL_REF_IS_SECRET`), 160-char length and symbol constraints, adversarial secret pattern detection (JWT, Bearer, private keys).
     - **Feature 6**: Empty whitelist filtering yielding empty tools, blacklist overriding whitelist, empty tool library handling, 0/negative context window watermark handling, special character tool names exact matching.
     - **Feature 7**: 1M context window (1,048,576 tokens) exact scaling without overflow, sub-32k context scaling (4k/8k/16k), zero/negative context window safety, exact 1-token boundary compaction triggers.
     - **Feature 8**: Empty message arrays and empty content strings handling, malformed JSON in tool call arguments graceful fallback, system block arrays merging with newlines, null/empty SSE delta chunks safety, multi-chunk split tool argument reassembly.
     - **Feature 9**: Stream locked invariant (429 after first token emitted throws `STREAM_LOCKED_FAILOVER_FORBIDDEN`), all accounts cooling exhaustion handling, quarantined account healthScore 0 and exclusion, circuit breaker OPEN state fast-fail, HALF_OPEN canary success recovery.
     - **Feature 10**: Anti-recursion guardrail blocking subagents from spawning subagents, worker crash capturing failure status without crashing caller, executive summary truncation at 300 words, zero-token consumed edge case, chronological sandbox audit logging.

3. **Tier 3: Cross-Feature Interactions (`tests/e2e-gateway/t3_pairwise.test.ts`)**
   - **Command**: `node --test tests/e2e-gateway/t3_pairwise.test.ts`
   - **Coverage (10 pairwise tests)**:
     - `SCENARIO-T3-01`: Transpiler with Account Pool 429 failover.
     - `SCENARIO-T3-02`: UsageStatusBar with ModelSpaceProfile watermark.
     - `SCENARIO-T3-03`: ModelPicker probing with Provider Preset discovery.
     - `SCENARIO-T3-04`: Subagent delegation with Transpiler streaming.
     - `SCENARIO-T3-05`: Deeplink import with Account Pool registration.
     - `SCENARIO-T3-06`: Per-Model Space reasoning effort default with UsageStatusBar.
     - `SCENARIO-T3-07`: Dynamic watermarks triggering Subagent task delegation.
     - `SCENARIO-T3-08`: Circuit breaker tripping leading to alternative Preset routing.
     - `SCENARIO-T3-09`: Tool Whitelist filtering with Transpiler tool calling.
     - `SCENARIO-T3-10`: Prompt cache detection with UsageStatusBar cache badge and TPS calculation.

4. **Tier 4: Real-World Workload Scenarios (`tests/e2e-gateway/t4_scenarios.test.ts`)**
   - **Command**: `node --test tests/e2e-gateway/t4_scenarios.test.ts`
   - **Coverage (5 full workflow scenarios)**:
     - `SCENARIO-T4-01`: Long research session with subagent web scraping (14,800 intermediate tokens saved into compact foldback card, keeping main session under watermark).
     - `SCENARIO-T4-02`: Multi-turn coding session hitting 429 and hot-drifting across account pool in <15ms without user disruption.
     - `SCENARIO-T4-03`: Switching from Claude to DeepSeek via preset and running with dynamic watermark recalculation (200k -> 64k window, 160k -> 48k watermark, triggering compaction).
     - `SCENARIO-T4-04`: Fast model probing and prompt caching with UsageStatusBar feedback (3-tier latency color badges, 80% prompt cache hit badge, 67 tps).
     - `SCENARIO-T4-05`: Complex tool calling across Anthropic-only client and OpenAI-compatible gateway (round-trip tool declarations, execution, and stream synthesis).

---

## 3. How to Run E2E Tests

### Run all 4 E2E suites via consolidated runner:
```bash
node tests/e2e-gateway/runner.mjs
```

### Run all 4 E2E suites via Node native runner:
```bash
node --test tests/e2e-gateway/t1_features.test.ts tests/e2e-gateway/t2_boundaries.test.ts tests/e2e-gateway/t3_pairwise.test.ts tests/e2e-gateway/t4_scenarios.test.ts
```

### Run individual tier suites:
```bash
node --test tests/e2e-gateway/t1_features.test.ts
node --test tests/e2e-gateway/t2_boundaries.test.ts
node --test tests/e2e-gateway/t3_pairwise.test.ts
node --test tests/e2e-gateway/t4_scenarios.test.ts
```

### Run ESLint validation:
```bash
npx eslint tests/e2e-gateway/*.ts tests/e2e-gateway/*.mjs
```

---

## 4. Verification Evidence & Benchmarks

Baseline test run output (executed on Node 24 Windows x64):
```
===============================================================================
  KK-Studio 2.0: CC Switch & Codex++ Gateway E2E Test Runner (Tiers 1-4)
===============================================================================
Executing 4 test suites with Node 24 native test runner...

✔ F01-T1-01: calculates dynamic token usage across ASCII, CJK, and mixed text (0.712ms)
✔ F01-T1-02: incorporates multimodal image attachment weights (1,024 tokens each) into token gauge (0.104ms)
...
✔ SCENARIO-T4-05: Complex tool calling across Anthropic-only client and OpenAI-compatible gateway (0.728ms)
ℹ tests 115
ℹ suites 0
ℹ pass 115
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 147.1917

===============================================================================
  [SUCCESS] All E2E Gateway acceptance tests passed cleanly (100% pass rate).
===============================================================================
```
