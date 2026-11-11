import assert from "node:assert/strict";
import test from "node:test";
import { StandardDualStickinessManager } from "../../src/domain/gatewayStickiness.ts";
import {
  TurnRewindRecoveryController,
  type TurnRewindHostBridge,
  type ConversationTurn,
  type RewindRecord,
  type TurnTokenUsage,
} from "../../src/domain/conversationRecovery.ts";

test("DualStickiness: initial recall on non-existent session returns undefined", () => {
  const mgr = new StandardDualStickinessManager();
  assert.equal(mgr.recall("session-none"), undefined);
  assert.equal(mgr.resolveAccount("session-none").accountId, null);
  assert.equal(mgr.resolveAccount("session-none").stickinessType, null);
});

test("DualStickiness: cache stickiness sliding renewal on consecutive requests", () => {
  let currentTime = 1000;
  const mgr = new StandardDualStickinessManager({
    now: () => currentTime,
    cacheStickyTtlMs: 600_000, // 10 minutes
  });

  // Turn 1
  mgr.record(
    "sess-1",
    { channelId: "primary-ch", upstreamModel: "m1" },
    { isFallback: false },
  );
  assert.equal(mgr.recall("sess-1")?.channelId, "primary-ch");

  // Turn 2 at 8 minutes (within 10m TTL): sliding window renews
  currentTime += 8 * 60 * 1000;
  mgr.record(
    "sess-1",
    { channelId: "primary-ch", upstreamModel: "m1" },
    { isFallback: false },
  );

  // Turn 3 at 16 minutes from start (8 minutes after turn 2): still active due to sliding renewal
  currentTime += 8 * 60 * 1000;
  assert.equal(mgr.recall("sess-1")?.channelId, "primary-ch");

  // Inactive for 11 minutes -> expired
  currentTime += 11 * 60 * 1000;
  assert.equal(mgr.recall("sess-1"), undefined);
});

test("DualStickiness: fallback stickiness does not renew and expires after fixed ceiling", () => {
  let currentTime = 1000;
  const mgr = new StandardDualStickinessManager({
    now: () => currentTime,
    fallbackStickyTtlMs: 600_000, // 10 minutes ceiling
  });

  // Turn 1: Primary fails, fallback answers
  mgr.record(
    "sess-fb",
    { channelId: "fallback-ch", upstreamModel: "m1" },
    { isFallback: true },
  );
  assert.equal(mgr.recall("sess-fb")?.channelId, "fallback-ch");

  // Turn 2 at 5 minutes: Fallback answers again
  currentTime += 5 * 60 * 1000;
  mgr.record(
    "sess-fb",
    { channelId: "fallback-ch", upstreamModel: "m1" },
    { isFallback: true },
  );

  // Turn 3 at 11 minutes total (6 mins after Turn 2): Fallback ceiling has EXPIRED
  currentTime += 6 * 60 * 1000; // Total 11 minutes from initialFallbackAt
  assert.equal(
    mgr.recall("sess-fb"),
    undefined,
    "Fallback affinity must expire 10 minutes after initial failover",
  );
});

test("DualStickiness: fallback affinity takes precedence over cache and reverts upon expiry", () => {
  let currentTime = 1000;
  const mgr = new StandardDualStickinessManager({
    now: () => currentTime,
  });

  // Set cache affinity for 10 minutes
  mgr.setCacheAffinity("sess-both", "primary-acc", 600_000);
  // Set fallback affinity for 30 seconds
  mgr.setFallbackAffinity("sess-both", "fallback-acc", 30_000);

  // Fallback takes precedence while active
  const res1 = mgr.resolveAccount("sess-both");
  assert.equal(res1.accountId, "fallback-acc");
  assert.equal(res1.stickinessType, "fallback");

  // Advance time past fallback (40s) but within cache (10m)
  currentTime += 40_000;
  const res2 = mgr.resolveAccount("sess-both");
  assert.equal(res2.accountId, "primary-acc");
  assert.equal(res2.stickinessType, "cache");
});

test("DualStickiness: watermark trimming at 2048 capacity down to 1536", () => {
  const currentTime = 1000;
  const mgr = new StandardDualStickinessManager({
    now: () => currentTime,
    maxCapacity: 2048,
    trimTarget: 1536,
  });

  // Fill up to 2048
  for (let i = 0; i < 2048; i++) {
    mgr.record(
      `sess-${i}`,
      { channelId: `ch-${i}`, upstreamModel: "m" },
      { isFallback: false },
    );
  }
  assert.equal(mgr.stats().size, 2048);

  // Inserting 2049th item triggers trimming down to 1536
  mgr.record(
    "sess-trigger",
    { channelId: "ch-trigger", upstreamModel: "m" },
    { isFallback: false },
  );
  assert.ok(mgr.stats().size <= 1537);
});

test("DualStickiness: forget and clear remove bindings", () => {
  const mgr = new StandardDualStickinessManager();
  mgr.record("s1", { channelId: "c1", upstreamModel: "m" });
  mgr.record("s2", { channelId: "c2", upstreamModel: "m" });

  mgr.forget("s1");
  assert.equal(mgr.recall("s1"), undefined);
  assert.ok(mgr.recall("s2"));

  mgr.clear();
  assert.equal(mgr.recall("s2"), undefined);
  assert.equal(mgr.stats().size, 0);
});

// -------------------------------------------------------------------------
// TurnRewindRecoveryController Test Suite
// -------------------------------------------------------------------------
function createMockBridge(options: {
  busy?: boolean;
  turns?: ConversationTurn[];
  verificationReport?: string;
  concurrentAppend?: boolean;
}): {
  bridge: TurnRewindHostBridge;
  truncatedTo?: string;
  rolledBack?: TurnTokenUsage;
  affinityReset: boolean;
  persistedRecord?: RewindRecord;
} {
  const turns: ConversationTurn[] = options.turns ?? [
    {
      turnId: "t1",
      role: "user",
      content: "Hello",
      status: "completed",
      tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      timestamp: 1000,
    },
    {
      turnId: "t2",
      role: "assistant",
      content: "Hi there!",
      status: "completed",
      tokenUsage: { promptTokens: 15, completionTokens: 20, totalTokens: 35 },
      timestamp: 2000,
    },
    {
      turnId: "t3",
      role: "user",
      content: "Create a bad file",
      status: "completed",
      tokenUsage: { promptTokens: 25, completionTokens: 10, totalTokens: 35 },
      timestamp: 3000,
    },
    {
      turnId: "t4",
      role: "assistant",
      content: "Bad file created",
      status: "completed",
      tokenUsage: { promptTokens: 35, completionTokens: 50, totalTokens: 85 },
      timestamp: 4000,
    },
  ];

  let currentTurns = [...turns];
  let truncatedTo: string | undefined;
  let rolledBack: TurnTokenUsage | undefined;
  let affinityReset = false;
  let persistedRecord: RewindRecord | undefined;

  const bridge: TurnRewindHostBridge = {
    getThreadId: () => "thread-1",
    getTurns: async () => [...currentTurns],
    isThreadBusy: () => options.busy ?? false,
    persistBackupSnapshot: async (rec) => {
      persistedRecord = rec;
    },
    executeCompensationPrompt: async (_threadId, prompt) => {
      if (options.concurrentAppend) {
        // Simulate concurrent outside turns during prompt execution
        currentTurns.push({
          turnId: "t-concurrent-1",
          role: "user",
          content: "interleaved 1",
          status: "completed",
          timestamp: Date.now(),
        });
        currentTurns.push({
          turnId: "t-concurrent-2",
          role: "user",
          content: "interleaved 2",
          status: "completed",
          timestamp: Date.now(),
        });
      }

      const match =
        /\[KK Studio Turn Rewind Compensation: (rewind-[^\]]+)\]/.exec(prompt);
      const runId = match ? match[1] : "default-run";

      if (options.verificationReport) {
        return options.verificationReport.replace("{runId}", runId!);
      }
      return `Done.\nKK_REWIND_RESULT_${runId}={"status":"complete","undone":["file.txt"],"unresolved":[],"verification":[]}`;
    },
    truncateConversation: async (_threadId, beforeTurnId) => {
      truncatedTo = beforeTurnId;
      const idx = currentTurns.findIndex((t) => t.turnId === beforeTurnId);
      if (idx >= 0) currentTurns = currentTurns.slice(0, idx);
    },
    rollbackTokenUsage: (_threadId, usage) => {
      rolledBack = usage;
    },
    resetGatewayAffinity: (_threadId) => {
      affinityReset = true;
    },
  };

  return {
    bridge,
    get truncatedTo() {
      return truncatedTo;
    },
    get rolledBack() {
      return rolledBack;
    },
    get affinityReset() {
      return affinityReset;
    },
    get persistedRecord() {
      return persistedRecord;
    },
  };
}

test("TurnRewindRecoveryController: rewinds turn cascade and computes cumulative token rollback", async () => {
  const mock = createMockBridge({});
  const controller = new TurnRewindRecoveryController(mock.bridge);

  // Rewind before turn t3 (undoes t3 and t4)
  const result = await controller.executeRewind("thread-1", "t3");

  assert.equal(result.status, "complete");
  assert.equal(result.revertedTurnCount, 2);
  // t3: 25 prompt + 10 completion = 35 total
  // t4: 35 prompt + 50 completion = 85 total
  // sum: 60 prompt, 60 completion, 120 total
  assert.deepEqual(result.rolledBackTokens, {
    promptTokens: 60,
    completionTokens: 60,
    totalTokens: 120,
  });
  assert.equal(mock.truncatedTo, "t3");
  assert.deepEqual(mock.rolledBack, {
    promptTokens: 60,
    completionTokens: 60,
    totalTokens: 120,
  });
  assert.equal(mock.affinityReset, true);
  assert.ok(mock.persistedRecord);
});

test("TurnRewindRecoveryController: rejects when thread is busy", async () => {
  const mock = createMockBridge({ busy: true });
  const controller = new TurnRewindRecoveryController(mock.bridge);

  await assert.rejects(
    () => controller.executeRewind("thread-1", "t3"),
    /in-flight operations/,
  );
});

test("TurnRewindRecoveryController: rejects when target turn not found", async () => {
  const mock = createMockBridge({});
  const controller = new TurnRewindRecoveryController(mock.bridge);

  await assert.rejects(
    () => controller.executeRewind("thread-1", "non-existent-turn"),
    /not found/,
  );
});

test("TurnRewindRecoveryController: rejects when concurrent turn interleaving detected", async () => {
  const mock = createMockBridge({ concurrentAppend: true });
  const controller = new TurnRewindRecoveryController(mock.bridge);

  await assert.rejects(
    () => controller.executeRewind("thread-1", "t3"),
    /Concurrent activity detected/,
  );
});

test("TurnRewindRecoveryController: rejects when compensation verification reports unresolved items", async () => {
  const mock = createMockBridge({
    verificationReport:
      'Failed.\nKK_REWIND_RESULT_{runId}={"status":"partial","undone":[],"unresolved":["file locked"],"verification":[]}',
  });
  const controller = new TurnRewindRecoveryController(mock.bridge);

  await assert.rejects(
    () => controller.executeRewind("thread-1", "t3"),
    /Rollback incomplete: file locked/,
  );
});
