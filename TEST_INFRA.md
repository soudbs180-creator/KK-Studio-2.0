# Test Infrastructure: KK-Studio 2.0 CommandBus, EventBus & Concurrency Control

## 1. Overview & Test Runner Taxonomy

KK-Studio 2.0 uses a tiered, zero-extra-dependency test runner taxonomy aligned with the project's architecture:

| Tier | Category | Runner | Command | Target / Scope |
|---|---|---|---|---|
| **Tier 1** | Node Native Unit Tests | `node:test` (Node 24 native TypeScript stripping) | `node --test tests/unit/*.test.ts` | Unit logic, receipt gate, event replay, preemption, shadow latency |
| **Tier 2** | Native Rust Core Tests | `cargo test` | `cargo test --manifest-path src-tauri/Cargo.toml` | Rust CommandBus, SQLite WAL storage, NodeLockTable |
| **Tier 3** | E2E Browser / CDP Tests | `@playwright/test` / CDP | `npm run test:ui` / `node tests/desktop/verify-all-features.mjs` | Canvas UI, visual indicators, user interactions |
| **Tier 4** | Static Governance & Gate | `node` CLI | `node scripts/check-receipt.mjs [receipt.json]` | PR receipt validation gate |

*Note: In accordance with repository architecture decisions, Vitest and Jest are strictly prohibited. All TypeScript unit test files execute directly with Node 24 native runner using `node:test` and `node:assert/strict`.*

---

## 2. Test Suite Inventory

### 2.1 Acceptance & Governance Test Suites

1. **Static Receipt Gate (`scripts/check-receipt.mjs` & `tests/unit/check-receipt.test.ts`)**
   - **File**: `tests/unit/check-receipt.test.ts`
   - **Command**: `node --test tests/unit/check-receipt.test.ts`
   - **Coverage**:
     - Schema validation (schemaVersion 1, valid taskId format, ISO-8601 UTC timestamps, 40-hex Git commit SHA, semver desktop version).
     - Shadow mode latency verification (<5ms p95, <5ms average, sampleCount >= 100).
     - Replay consistency verification (100% snapshot equivalence, discrepancyCount === 0, identical 64-char SHA-256 state hashes).
     - Conflict preemption verification (designerPreempted === true, taskCancelledSignal === true, log entries containing `cancelled` and `override`).
     - Checks array validation (all checks green) and empty errors array.
     - CLI behavior (valid file exits 0, invalid/missing/corrupted file exits 1).

2. **Event Bus Replay Consistency (`tests/unit/event-bus-replay.test.ts`)**
   - **File**: `tests/unit/event-bus-replay.test.ts`
   - **Command**: `node --test tests/unit/event-bus-replay.test.ts`
   - **Coverage**:
     - Deterministic 100-operation sequence generator across 6 mutation categories:
       - 20 node creations across distinct media kinds (`image`, `video`, `text`, `audio`).
       - 30 node translations (x, y movements).
       - 20 connection creations (reference and result connections).
       - 10 node property updates (prompts, model selections, titles).
       - 10 generation lock/unlock operations (locks, completed unlocks with demo results, cancelled unlocks).
       - 10 deletions (5 connections + 5 nodes with incident edge cleanup).
     - Live mutation execution vs. pure event-sourced replay from ordered event log (`ORDER BY seq ASC`).
     - State canonicalization and hashing via `canvasHistoryFingerprint` and SHA-256 digest.
     - Out-of-order event sorting by monotonic sequence number.
     - Blank canvas initialization.
     - Assertions: `discrepancyCount === 0`, `liveStateHash === replayedStateHash`, `snapshotEquivalence === 1.0`.

3. **Concurrency Preemption & Node Locking (`tests/unit/concurrency-preemption.test.ts`)**
   - **File**: `tests/unit/concurrency-preemption.test.ts`
   - **Command**: `node --test tests/unit/concurrency-preemption.test.ts`
   - **Coverage**:
     - Agent task locks node into `generating` state (`node_rev` advances).
     - Designer performs interactive modification (move, property edit, or deletion).
     - Preemption protocol execution:
       - `task.cancelled` signal dispatched to TaskHost with target task ID and node ID.
       - Append-only event log records `cancelled` event with actor `system`.
       - Append-only event log records `override` event with actor `designer`.
       - Node lock released to `idle` and designer mutation applied.
     - Late agent completion rejection:
       - Agent sends completion command using stale `base_rev`.
       - Rejected with `ERR_REV_CONFLICT`.
       - Designer canvas state preserved intact (stale agent output rejected).
     - Edge cases:
       - Designer node deletion while agent is generating.
       - Designer prompt modification while agent is generating.
       - Double agent lock prevention (`ERR_NODE_LOCKED`).
       - Normal designer operations on unlocked nodes without spurious cancellations.

4. **Shadow Mode Latency Benchmark (`tests/unit/shadow-mode-latency.test.ts`)**
   - **File**: `tests/unit/shadow-mode-latency.test.ts`
   - **Command**: `node --test tests/unit/shadow-mode-latency.test.ts`
   - **Coverage**:
     - High-resolution monotonic timer (`performance.now()`) measuring append durations.
     - 100 consecutive canvas mutations (40 moves, 30 property updates, 15 connection creations, 15 node additions).
     - Statistical metrics: `averageLatencyMs`, `p95LatencyMs`, `maxLatencyMs`.
     - Hard gates: `p95LatencyMs < 5.0ms`, `averageLatencyMs < 5.0ms`.
     - High-throughput burst stress testing (250 consecutive operations under load).
     - Output validation conforming to `receipt.json.acceptanceEvidence.shadowModeLatency` schema.

---

## 3. How to Run Acceptance Tests

### Run all 4 new acceptance suites together:
```bash
node --test tests/unit/check-receipt.test.ts tests/unit/event-bus-replay.test.ts tests/unit/concurrency-preemption.test.ts tests/unit/shadow-mode-latency.test.ts
```

### Run static receipt validator:
```bash
node scripts/check-receipt.mjs receipt.json
```

### Run TypeScript type checking:
```bash
npm run typecheck
```

### Run full project test suite:
```bash
npm test
```

---

## 4. Verification Evidence & Benchmarks

Baseline test run output (executed on Node 24.20.0 Windows x64):
```
✔ check-receipt accepts a fully compliant valid receipt (1.1366ms)
✔ check-receipt accepts snapshotEquivalence formatted as '100%' (0.1699ms)
✔ check-receipt rejects non-object or null receipts (0.1119ms)
✔ check-receipt rejects invalid top-level metadata (0.2116ms)
✔ check-receipt rejects shadow mode latency violations (0.1513ms)
✔ check-receipt rejects replay consistency violations (0.5934ms)
✔ check-receipt rejects conflict preemption violations (0.1363ms)
✔ check-receipt rejects checks and errors violations (0.0877ms)
✔ runCli executes correctly against valid and invalid receipt files (5.0908ms)
✔ designer move interaction preempts active agent task and records cancelled and override events (0.7809ms)
✔ designer delete interaction on locked node triggers preemption and cleans up node (0.1234ms)
✔ designer property update preempts generation and preserves designer prompt (0.0906ms)
✔ second agent attempting to lock already locked node is rejected with ERR_NODE_LOCKED (0.0792ms)
✔ designer normal operations on unlocked node do not emit cancellation signals (0.0829ms)
✔ deterministic 100-operation sequence contains exactly 100 operations (0.8091ms)
✔ event bus replay achieves 100% snapshot equivalence after 100 continuous canvas operations (6.3414ms)
✔ event bus replay handles out-of-order event streams when sorted by monotonic seq (0.4334ms)
✔ replaying empty event log maintains pristine blank canvas state (0.0757ms)
✔ shadow mode write latency is strictly < 5.0ms across 100 consecutive canvas operations (0.8399ms)
✔ shadow mode latency remains < 5.0ms under high-throughput burst load of 250 operations (0.8099ms)
✔ benchmark output conforms strictly to receipt.json acceptanceEvidence schema (0.1706ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 89.9809
```
